require("dotenv").config()
const { Worker } = require("bullmq")
const { getBullConnection, closeRedisClient } = require("../config/redis")
const { generateMockQuestion, evaluateMockAnswer, generateResumePdf } = require("../services/ai.service")
const { setCache, getCache } = require("../utils/cache")
const { recordQueueCompleted, recordQueueFailed } = require("../utils/metrics")
const interviewReportModel = require("../models/interviewReport.models")

const connection = getBullConnection()

const worker = new Worker(
    "interviewQueue",
    async (job) => {
        if (job.name === "question") {
            const { jobDescription, focus, cacheKey } = job.data
            const cached = await getCache(cacheKey)
            if (cached) return { question: cached, cached: true }
            const question = await generateMockQuestion({ jobDescription, focus })
            await setCache(cacheKey, question)
            return { question }
        }

        if (job.name === "evaluate") {
            const { question, answer, jobDescription, cacheKey } = job.data
            const cached = await getCache(cacheKey)
            if (cached) return { evaluation: cached, cached: true }
            const evaluation = await evaluateMockAnswer({ question, answer, jobDescription })
            await setCache(cacheKey, evaluation)
            return { evaluation }
        }

        if (job.name === "resume_pdf") {
            const { interviewReportId, userId } = job.data
            const cachedPdf = await getCache(`resume:pdf:report:${interviewReportId}`)
            if (cachedPdf) {
                await setCache(`resume:pdf:${job.id}`, cachedPdf, 10 * 60)
                return { stored: true, cached: true }
            }

            const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: userId })

            if (!interviewReport) {
                throw new Error("Interview report not found")
            }

            const { resume, jobDescription, selfDescription } = interviewReport
            const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })
            const base64 = pdfBuffer.toString("base64")
            await setCache(`resume:pdf:${job.id}`, base64, 10 * 60)
            await setCache(`resume:pdf:report:${interviewReportId}`, base64, 10 * 60)
            return { stored: true }
        }

        throw new Error(`Unknown job type: ${job.name}`)
    },
    { connection }
)

worker.on("completed", (job) => {
    const durationMs = job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined
    recordQueueCompleted("interviewQueue", job.name, durationMs)
})

worker.on("failed", (job, err) => {
    const durationMs = job?.processedOn ? Date.now() - job.processedOn : undefined
    recordQueueFailed("interviewQueue", job?.name || "unknown", durationMs)
    console.error(`Worker job failed: ${job?.id}`, err?.message || err)
})

const shutdown = async (signal) => {
    console.log(`Worker received ${signal}. Shutting down...`)
    try {
        await worker.close()
        await closeRedisClient()
    } catch (err) {
        console.error("Worker shutdown error:", err)
    } finally {
        process.exit(0)
    }
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

console.log("Interview worker running...")
