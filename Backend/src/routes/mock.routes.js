const express = require("express")
const mockController = require("../controllers/mock.controller")
const upload = require("../middlewares/file.middleware")
const { rateLimiter } = require("../middlewares/rateLimiter")
const { validate } = require("../middlewares/validate")
const { getQuestionQuery, evaluateBody, jobStatusParams } = require("../validators/mock.schemas")

const mockRouter = express.Router()

// Generate a new interview question
mockRouter.get("/question", rateLimiter, validate({ query: getQuestionQuery }), mockController.getQuestion)

// Evaluate an answer
mockRouter.post("/evaluate", rateLimiter, validate({ body: evaluateBody }), mockController.evaluateAnswer)

// Job status
mockRouter.get("/status/:jobId", validate({ params: jobStatusParams }), mockController.getJobStatus)

// Speech to text (optional). If text is sent, return it back.
mockRouter.post("/speech-to-text", upload.single("audio"), mockController.speechToText)

module.exports = mockRouter
