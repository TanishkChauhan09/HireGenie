const { generateMockQuestion, evaluateMockAnswer } = require("../services/ai.service")
const { generateKey, getCache, setCache, getUserCacheVersion } = require("../utils/cache")
const { interviewQueue } = require("../queue/interviewQueue")
const { recordQueueEnqueued } = require("../utils/metrics")
const fs = require("fs")
const os = require("os")
const path = require("path")

const getOpenAIClient = () => {
    if (!process.env.OPENAI_API_KEY) return null
    const OpenAI = require("openai")
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const JOB_OWNER_TTL = 24 * 60 * 60

async function getQuestion(req, res) {
    try {
        const { jobDescription, focus, refresh } = req.query
        const userId = req.user?.id
        const cacheVersion = await getUserCacheVersion(userId)
        const shouldRefresh = refresh === true || refresh === "true" || refresh === "1"
        const cachePayload = shouldRefresh
            ? { jobDescription, focus, userId, v: cacheVersion, nonce: Date.now() }
            : { jobDescription, focus, userId, v: cacheVersion }
        const cacheKey = generateKey("mock:question", cachePayload)
        if (!shouldRefresh) {
            const cached = await getCache(cacheKey)
            if (cached) {
                return res.status(200).json({ source: "cache", question: cached })
            }
        }

        const job = await interviewQueue.add("question", {
            jobDescription,
            focus,
            cacheKey,
        })

        recordQueueEnqueued("interviewQueue", "question")
        await setCache(`mock:job:${job.id}:owner`, req.user.id, JOB_OWNER_TTL)

        res.status(202).json({ status: "processing", jobId: job.id })
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
        const userId = req.user?.id
        const cacheVersion = await getUserCacheVersion(userId)
        const cacheKey = generateKey("mock:evaluate", { question, answer, jobDescription, userId, v: cacheVersion })
        const cached = await getCache(cacheKey)
        if (cached) {
            return res.status(200).json({ source: "cache", evaluation: cached })
        }

        const job = await interviewQueue.add("evaluate", {
            question,
            answer,
            jobDescription,
            cacheKey,
        })

        recordQueueEnqueued("interviewQueue", "evaluate")
        await setCache(`mock:job:${job.id}:owner`, req.user.id, JOB_OWNER_TTL)

        res.status(202).json({ status: "processing", jobId: job.id })
    } catch (err) {
        console.error("evaluateAnswer error:", err)
        res.status(500).json({ message: "Failed to evaluate answer.", error: err?.message || "Unknown error" })
    }
}

async function getJobStatus(req, res) {
    try {
        const { jobId } = req.params
        const owner = await getCache(`mock:job:${jobId}:owner`)
        if (!owner || owner !== req.user.id) {
            return res.status(404).json({ status: "not_found" })
        }

        const job = await interviewQueue.getJob(jobId)
        if (!job) {
            return res.status(404).json({ status: "not_found" })
        }
        const state = await job.getState()
        if (state === "completed") {
            return res.status(200).json({ status: "completed", result: job.returnvalue })
        }
        if (state === "failed") {
            return res.status(200).json({ status: "failed", error: job.failedReason })
        }
        return res.status(200).json({ status: state })
    } catch (err) {
        console.error("getJobStatus error:", err)
        res.status(500).json({ message: "Failed to fetch job status.", error: err?.message || "Unknown error" })
    }
}

async function speechToText(req, res) {
    let tempPath
    try {
        const openai = getOpenAIClient()
        if (!openai) {
            return res.status(501).json({
                message: "Speech-to-text is disabled. Configure OPENAI_API_KEY to enable it."
            })
        }
        if (!req.file) {
            return res.status(400).json({ message: "No audio received." })
        }

        tempPath = path.join(os.tmpdir(), `mock-audio-${Date.now()}.webm`)
        fs.writeFileSync(tempPath, req.file.buffer)

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-1"
        })

        res.status(200).json({ text: transcription.text })
    } catch (err) {
        console.error("speechToText error:", err)
        res.status(500).json({ message: "Failed to transcribe audio.", error: err?.message || "Unknown error" })
    } finally {
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath)
        }
    }
}

module.exports = { getQuestion, evaluateAnswer, speechToText, getJobStatus }
