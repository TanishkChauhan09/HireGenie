const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const mongoose = require("mongoose")
const pinoHttp = require("pino-http")
const helmet = require("helmet")
const { randomUUID } = require("crypto")
const { getRedisClient } = require("./config/redis")
const { logger } = require("./utils/logger")
const { register, metricsMiddleware } = require("./utils/metrics")
const { setupBullBoard } = require("./realtime/bullboard")

const app = express()


app.set("trust proxy", 1)
app.use(helmet())
app.use(pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"] || randomUUID()
}))
app.use((req, res, next) => {
    res.setHeader("x-request-id", req.id)
    next()
})
app.use(metricsMiddleware)
app.use(express.json({ limit: "1mb" }))
app.use(cookieParser())
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error("Not allowed by CORS"))
    },
    credentials: true,
    allowedHeaders: [ "Content-Type", "Authorization" ]
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
const mockRouter = require("./routes/mock.routes")
const authMiddleware = require("./middlewares/auth.middleware")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", authMiddleware.authUser, interviewRouter)
app.use("/api/mock", authMiddleware.authUser, mockRouter)

setupBullBoard(app)

app.get("/metrics", async (req, res) => {
    const token = process.env.METRICS_TOKEN
    if (token && req.headers["x-metrics-token"] !== token) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    res.setHeader("Content-Type", register.contentType)
    res.end(await register.metrics())
})

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() })
})

app.get("/ready", (req, res) => {
    const dbReady = mongoose.connection.readyState === 1
    let redisReady = false
    try {
        const redis = getRedisClient()
        redisReady = !!redis && redis.status === "ready"
    } catch (err) {
        redisReady = false
    }

    if (dbReady && redisReady) {
        return res.status(200).json({ status: "ready" })
    }

    return res.status(503).json({
        status: "not_ready",
        db: dbReady ? "ready" : "not_ready",
        redis: redisReady ? "ready" : "not_ready"
    })
})


app.use((err, req, res, next) => {
    let status = err?.statusCode || err?.status || 500
    let message = err?.message || "Internal server error"

    if (err?.name === "MulterError" || err?.message === "Unsupported file type") {
        status = 400
        message = err.message
    }

    if (status >= 500) {
        logger.error({ err, reqId: req.id }, "Unhandled error")
    }
    res.status(status).json({ message })
})

module.exports = app
