const { generateMockQuestion, evaluateMockAnswer } = require("../services/ai.service")
const OpenAI = require("openai")
const fs = require("fs")
const os = require("os")
const path = require("path")

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

async function getQuestion(req, res) {
    try {
        const { jobDescription, focus } = req.query
        const question = await generateMockQuestion({ jobDescription, focus })
        res.status(200).json({ question })
    } catch (err) {
        console.error("getQuestion error:", err)
        res.status(500).json({ message: "Failed to generate question.", error: err?.message || "Unknown error" })
    }
}

async function evaluateAnswer(req, res) {
    try {
        const { question, answer, jobDescription } = req.body
        if (!question || !answer) {
            return res.status(400).json({ message: "Question and answer are required." })
        }
        const evaluation = await evaluateMockAnswer({ question, answer, jobDescription })
        res.status(200).json({ evaluation })
    } catch (err) {
        console.error("evaluateAnswer error:", err)
        res.status(500).json({ message: "Failed to evaluate answer.", error: err?.message || "Unknown error" })
    }
}

async function speechToText(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No audio received." })
        }

        const tempPath = path.join(os.tmpdir(), `mock-audio-${Date.now()}.webm`)
        fs.writeFileSync(tempPath, req.file.buffer)

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-1"
        })

        fs.unlinkSync(tempPath)

        res.status(200).json({ text: transcription.text })
    } catch (err) {
        console.error("speechToText error:", err)
        res.status(500).json({ message: "Failed to transcribe audio.", error: err?.message || "Unknown error" })
    }
}

module.exports = { getQuestion, evaluateAnswer, speechToText }
