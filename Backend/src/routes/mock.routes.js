const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const mockController = require("../controllers/mock.controller")
const upload = require("../middlewares/file.middleware")

const mockRouter = express.Router()

// Generate a new interview question
mockRouter.get("/question", authMiddleware.authUser, mockController.getQuestion)

// Evaluate an answer
mockRouter.post("/evaluate", authMiddleware.authUser, mockController.evaluateAnswer)

// Speech to text (optional). If text is sent, return it back.
mockRouter.post("/speech-to-text", authMiddleware.authUser, upload.single("audio"), mockController.speechToText)

module.exports = mockRouter
