const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("./interviewReport.models")
const { interviewQueue } = require("../queue/interviewQueue")
const { setCache, getCache, bumpUserCacheVersion } = require("../utils/cache")
const { recordQueueEnqueued } = require("../utils/metrics")

const RESUME_PDF_TTL = 10 * 60
const RESUME_OWNER_TTL = 24 * 60 * 60



/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    try {
        const { selfDescription, jobDescription } = req.body

        if (!jobDescription) {
            return res.status(400).json({
                message: "Job description is required."
            })
        }

        if (!req.file && !selfDescription) {
            return res.status(400).json({
                message: "Either resume PDF or self description is required."
            })
        }

        let resumeContent = ""
        if (req.file) {
            const isPdf =
                req.file.mimetype === "application/pdf" ||
                req.file.originalname?.toLowerCase().endsWith(".pdf")

            if (!isPdf) {
                return res.status(400).json({
                    message: "Only PDF resumes are supported."
                })
            }

            // Support both pdf-parse v1 (function) and v2 (PDFParse class)
            if (typeof pdfParse === "function") {
                const pdfData = await pdfParse(req.file.buffer)
                resumeContent = pdfData?.text || ""
            } else if (pdfParse?.default && typeof pdfParse.default === "function") {
                const pdfData = await pdfParse.default(req.file.buffer)
                resumeContent = pdfData?.text || ""
            } else if (pdfParse?.PDFParse) {
                const parser = new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))
                const pdfData = await parser.getText()
                resumeContent = pdfData?.text || ""
            } else {
                throw new Error("PDF parser is not available.")
            }
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeContent,
            selfDescription,
            jobDescription
        })

        const deriveTitle = (text) => {
            if (!text) return ""
            const line = text.split("\n").map(l => l.trim()).find(Boolean)
            if (!line) return ""
            return line.slice(0, 120)
        }

        const title = interViewReportByAi?.title || deriveTitle(jobDescription) || "Untitled Position"

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent,
            selfDescription,
            jobDescription,
            title,
            ...interViewReportByAi
        })

        await bumpUserCacheVersion(req.user.id)

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (err) {
        console.error("generateInterViewReportController error:", err)
        res.status(500).json({
            message: "Failed to generate interview report.",
            error: err?.message || "Unknown error"
        })
    }

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (err) {
        console.error("getInterviewReportByIdController error:", err)
        res.status(500).json({ message: "Failed to fetch interview report." })
    }
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query
        const skip = (page - 1) * limit

        const [ total, interviewReports ] = await Promise.all([
            interviewReportModel.countDocuments({ user: req.user.id }),
            interviewReportModel.find({ user: req.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")
        ])

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            interviewReports
        })
    } catch (err) {
        console.error("getAllInterviewReportsController error:", err)
        res.status(500).json({ message: "Failed to fetch interview reports." })
    }
}


/**
 * @description Controller to enqueue resume PDF generation job.
 */
async function enqueueResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const job = await interviewQueue.add("resume_pdf", {
            interviewReportId,
            userId: req.user.id
        })

        recordQueueEnqueued("interviewQueue", "resume_pdf")
        await setCache(`resume:job:${job.id}:owner`, req.user.id, RESUME_OWNER_TTL)

        res.status(202).json({ status: "processing", jobId: job.id })
    } catch (err) {
        console.error("enqueueResumePdfController error:", err)
        res.status(500).json({ message: "Failed to enqueue resume PDF." })
    }
}

/**
 * @description Controller to get resume pdf job status.
 */
async function getResumePdfStatusController(req, res) {
    try {
        const { jobId } = req.params
        const owner = await getCache(`resume:job:${jobId}:owner`)
        if (!owner || owner !== req.user.id) {
            return res.status(404).json({ status: "not_found" })
        }

        const job = await interviewQueue.getJob(jobId)
        if (!job) {
            return res.status(404).json({ status: "not_found" })
        }

        const state = await job.getState()
        if (state === "completed") {
            return res.status(200).json({ status: "completed" })
        }
        if (state === "failed") {
            return res.status(200).json({ status: "failed", error: job.failedReason })
        }
        return res.status(200).json({ status: state })
    } catch (err) {
        console.error("getResumePdfStatusController error:", err)
        res.status(500).json({ message: "Failed to fetch resume pdf status." })
    }
}

/**
 * @description Controller to download generated resume pdf.
 */
async function downloadResumePdfController(req, res) {
    try {
        const { jobId } = req.params
        const owner = await getCache(`resume:job:${jobId}:owner`)
        if (!owner || owner !== req.user.id) {
            return res.status(404).json({ status: "not_found" })
        }

        const cached = await getCache(`resume:pdf:${jobId}`)
        if (!cached) {
            return res.status(404).json({ message: "PDF not ready." })
        }

        const pdfBuffer = Buffer.from(cached, "base64")
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${jobId}.pdf`
        })

        res.send(pdfBuffer)
    } catch (err) {
        console.error("downloadResumePdfController error:", err)
        res.status(500).json({ message: "Failed to download resume PDF." })
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    enqueueResumePdfController,
    getResumePdfStatusController,
    downloadResumePdfController
}
