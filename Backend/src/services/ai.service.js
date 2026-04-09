const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const questionSchema = z.object({
    question: z.string(),
    intention: z.string().default(""),
    answer: z.string().default("")
})

const skillGapSchema = z.object({
    skill: z.string(),
    severity: z.enum([ "low", "medium", "high" ]).default("medium")
})

const prepDaySchema = z.object({
    day: z.number(),
    focus: z.string(),
    tasks: z.array(z.string()).default([])
})

const interviewReportSchema = z.object({
    matchScore: z.number().min(0).max(100).default(0),
    technicalQuestions: z.array(questionSchema).min(3),
    behavioralQuestions: z.array(questionSchema).min(3),
    skillGaps: z.array(skillGapSchema).min(3),
    preparationPlan: z.array(prepDaySchema).min(3),
    title: z.string().default("Untitled Position"),
})

const mockQuestionSchema = z.object({
    question: z.string()
})

const evaluationSchema = z.object({
    clarity: z.number().min(0).max(10),
    confidence: z.number().min(0).max(10),
    technicalAccuracy: z.number().min(0).max(10),
    missedPoints: z.array(z.string()).default([]),
    suggestions: z.array(z.string()).default([])
})

const FALLBACK_TECH_QUESTIONS = [
    "Explain event loop and how JavaScript handles async operations.",
    "What is REST and how does it differ from GraphQL?",
    "How would you optimize a slow database query?",
    "Explain the difference between authentication and authorization.",
    "What are the pros and cons of microservices vs monoliths?"
]

const FALLBACK_BEHAVIORAL_QUESTIONS = [
    "Tell me about a time you resolved a conflict in a team.",
    "Describe a challenging project and how you handled it.",
    "How do you prioritize tasks under a tight deadline?",
    "Tell me about a mistake you made and what you learned.",
    "How do you handle feedback from peers or managers?"
]

const FALLBACK_SKILLS = [
    { skill: "System design fundamentals", severity: "medium" },
    { skill: "Testing and QA practices", severity: "medium" },
    { skill: "Performance optimization", severity: "low" },
    { skill: "Security best practices", severity: "medium" },
    { skill: "Communication & collaboration", severity: "low" }
]

const FALLBACK_PREP = [
    { day: 1, focus: "Role overview", tasks: [ "Review job description", "List required skills" ] },
    { day: 2, focus: "Core concepts", tasks: [ "Revise fundamentals", "Practice 3 technical questions" ] },
    { day: 3, focus: "Projects", tasks: [ "Prepare 2 project stories", "Highlight impact metrics" ] },
    { day: 4, focus: "Behavioral", tasks: [ "STAR method practice", "Mock answers to 3 behavioral questions" ] },
    { day: 5, focus: "System design", tasks: [ "Review common patterns", "Sketch one design" ] },
    { day: 6, focus: "Weak areas", tasks: [ "Focus on skill gaps", "Create quick notes" ] },
    { day: 7, focus: "Mock interview", tasks: [ "Full mock session", "Refine answers" ] }
]

const isQuotaError = (err) => {
    const msg = err?.message || ""
    return err?.status === 429 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")
}

const safeTitleFromJD = (jobDescription) => {
    if (!jobDescription) return "Untitled Position"
    const firstLine = jobDescription.split("\n").find((line) => line.trim()) || ""
    return firstLine.trim().slice(0, 80) || "Untitled Position"
}

const buildFallbackReport = (jobDescription) => ({
    title: safeTitleFromJD(jobDescription),
    matchScore: 60,
    technicalQuestions: FALLBACK_TECH_QUESTIONS.map((q) => ({ question: q, intention: "TBD", answer: "TBD" })),
    behavioralQuestions: FALLBACK_BEHAVIORAL_QUESTIONS.map((q) => ({ question: q, intention: "TBD", answer: "TBD" })),
    skillGaps: FALLBACK_SKILLS,
    preparationPlan: FALLBACK_PREP
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate a complete interview report for a candidate.
Return ONLY a JSON object with this exact shape:
{
  "title": string,
  "matchScore": number (0-100),
  "technicalQuestions": [{ "question": string, "intention": string, "answer": string }],
  "behavioralQuestions": [{ "question": string, "intention": string, "answer": string }],
  "skillGaps": [{ "skill": string, "severity": "low"|"medium"|"high" }],
  "preparationPlan": [{ "day": number, "focus": string, "tasks": string[] }]
}
Rules:
- Provide at least 5 technical questions, 5 behavioral questions, 5 skill gaps, and a 7-day preparation plan.
- Do not return empty arrays.

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`

    let response
    const normalizeReport = (raw) => {
        const safeArray = (val) => (Array.isArray(val) ? val : [])

        const toQuestion = (item) => {
            if (typeof item === "string") {
                return { question: item, intention: "TBD", answer: "TBD" }
            }
            if (item) {
                return {
                    question: item.question || "",
                    intention: item.intention || "TBD",
                    answer: item.answer || "TBD"
                }
            }
            return { question: "", intention: "TBD", answer: "TBD" }
        }

        const toSkill = (item) => {
            if (typeof item === "string") {
                return { skill: item, severity: "medium" }
            }
            if (item && !item.severity) {
                return { ...item, severity: "medium" }
            }
            return item || { skill: "", severity: "medium" }
        }

        const toDay = (item, index) => {
            if (typeof item === "string") {
                return { day: index + 1, focus: item, tasks: [] }
            }
            if (item && typeof item.day !== "number") {
                return { ...item, day: index + 1 }
            }
            return item || { day: index + 1, focus: "", tasks: [] }
        }

        return {
            title: raw?.title || "",
            matchScore: typeof raw?.matchScore === "number" ? raw.matchScore : 0,
            technicalQuestions: safeArray(raw?.technicalQuestions).map(toQuestion),
            behavioralQuestions: safeArray(raw?.behavioralQuestions).map(toQuestion),
            skillGaps: safeArray(raw?.skillGaps).map(toSkill),
            preparationPlan: safeArray(raw?.preparationPlan).map(toDay),
        }
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"

    const attemptGenerate = async (strictMode) => {
        const effectivePrompt = strictMode
            ? `${prompt}\nIMPORTANT: All arrays must have at least 5 items and each item must be an object with the specified fields.`
            : prompt

        response = await ai.models.generateContent({
            model: modelName,
            contents: effectivePrompt,
            config: {
                responseMimeType: "application/json",
            }
        })

        const text = response?.text || ""
        let parsed
        try {
            parsed = JSON.parse(text)
        } catch (err) {
            console.error("generateInterviewReport invalid JSON:", text)
            throw new Error("AI returned invalid JSON.")
        }

        const normalized = normalizeReport(parsed)
        const validated = interviewReportSchema.safeParse(normalized)
        if (!validated.success) {
            console.error("generateInterviewReport schema validation failed:", validated.error?.message)
            throw new Error("AI returned incomplete report.")
        }

        return validated.data
    }

    try {
        return await attemptGenerate(false)
    } catch (err) {
        console.error("generateInterviewReport first attempt failed:", err)
        try {
            return await attemptGenerate(true)
        } catch (err2) {
            console.error("generateInterviewReport second attempt failed:", err2)
            if (isQuotaError(err2) || isQuotaError(err)) {
                return buildFallbackReport(jobDescription)
            }
            throw new Error("AI request failed. Please try again.")
        }
    }

}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    let response
    try {
        response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema),
            }
        })
        const jsonContent = JSON.parse(response.text)
        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
        return pdfBuffer
    } catch (err) {
        console.error("generateResumePdf AI call failed:", err)
        if (isQuotaError(err)) {
            const safeResume = resume || selfDescription || "Candidate summary not provided."
            const safeJD = jobDescription || "Job description not provided."
            const fallbackHtml = `
                <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
                            h1 { font-size: 24px; margin-bottom: 8px; }
                            h2 { font-size: 16px; margin-top: 20px; }
                            p { line-height: 1.5; }
                            .section { margin-top: 16px; }
                            .muted { color: #555; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <h1>Resume (Fallback)</h1>
                        <p class="muted">Generated without AI due to quota limits.</p>
                        <div class="section">
                            <h2>Summary</h2>
                            <p>${safeResume.replace(/\n/g, "<br/>")}</p>
                        </div>
                        <div class="section">
                            <h2>Target Role</h2>
                            <p>${safeJD.replace(/\n/g, "<br/>")}</p>
                        </div>
                    </body>
                </html>
            `
            const pdfBuffer = await generatePdfFromHtml(fallbackHtml)
            return pdfBuffer
        }
        throw new Error("AI request failed. Check API key/model access.")
    }

}

async function generateMockQuestion({ jobDescription, focus }) {
    const prompt = `Ask one concise interview question.${focus ? ` Focus: ${focus}.` : ""}
Job description: ${jobDescription || "General software engineering"}
Return JSON: {"question": "..."}`

    try {
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        })

        const parsed = JSON.parse(response.text)
        const validated = mockQuestionSchema.safeParse(parsed)
        if (!validated.success) {
            throw new Error("AI returned invalid question.")
        }

        return validated.data.question
    } catch (err) {
        if (isQuotaError(err)) {
            const fallback = FALLBACK_TECH_QUESTIONS[Math.floor(Math.random() * FALLBACK_TECH_QUESTIONS.length)]
            return fallback
        }
        throw err
    }
}

async function evaluateMockAnswer({ question, answer, jobDescription }) {
    const prompt = `You are an interview evaluator.
Evaluate the candidate answer based on:
1. Clarity (0-10)
2. Confidence (0-10)
3. Technical Accuracy (0-10)
4. Missing Points
5. Suggestions

Question: ${question}
Job description: ${jobDescription || ""}
Answer: ${answer}

Return JSON with fields:
{"clarity": number, "confidence": number, "technicalAccuracy": number, "missedPoints": string[], "suggestions": string[]}
`

    try {
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        })

        const parsed = JSON.parse(response.text)
        const validated = evaluationSchema.safeParse(parsed)
        if (!validated.success) {
            throw new Error("AI returned invalid evaluation.")
        }

        return validated.data
    } catch (err) {
        if (isQuotaError(err)) {
            return {
                clarity: 6,
                confidence: 6,
                technicalAccuracy: 6,
                missedPoints: [ "Provide more concrete examples", "Add technical details relevant to the role" ],
                suggestions: [ "Structure your answer using STAR", "Highlight impact metrics" ]
            }
        }
        throw err
    }
}

module.exports = { generateInterviewReport, generateResumePdf, generateMockQuestion, evaluateMockAnswer }
