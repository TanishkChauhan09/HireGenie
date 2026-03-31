const { z } = require("zod")

const createInterviewBody = z.object({
    selfDescription: z.string().trim().optional(),
    jobDescription: z.string().trim().min(1, "Job description is required")
})

const interviewIdParams = z.object({
    interviewId: z.string().min(1, "Interview id is required")
})

const resumePdfParams = z.object({
    interviewReportId: z.string().min(1, "Interview report id is required")
})

const resumeJobParams = z.object({
    jobId: z.string().min(1, "Job id is required")
})

const paginationQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10)
})

module.exports = { createInterviewBody, interviewIdParams, resumePdfParams, resumeJobParams, paginationQuery }
