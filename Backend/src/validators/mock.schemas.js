const { z } = require("zod")

const getQuestionQuery = z.object({
    jobDescription: z.string().trim().optional(),
    focus: z.string().trim().optional(),
    refresh: z.string().trim().optional()
})

const evaluateBody = z.object({
    question: z.string().min(1, "Question is required"),
    answer: z.string().min(1, "Answer is required"),
    jobDescription: z.string().trim().optional()
})

const jobStatusParams = z.object({
    jobId: z.string().min(1, "Job id is required")
})

module.exports = { getQuestionQuery, evaluateBody, jobStatusParams }
