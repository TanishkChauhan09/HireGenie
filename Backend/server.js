require("dotenv").config()

const http = require("http")
const app = require("./src/app")
const connectToDB = require("./src/config/database")
const mongoose = require("mongoose")
const { closeRedisClient } = require("./src/config/redis")
const { logger } = require("./src/utils/logger")
const { initSocket } = require("./src/realtime/socket")
const { initQueueEvents } = require("./src/realtime/queueEvents")

const PORT = Number(process.env.PORT || 3000)
let server
let io
let queueEvents

const startServer = async () => {
    try {
        await connectToDB()
        server = http.createServer(app)
        io = initSocket(server)
        queueEvents = initQueueEvents(io)

        server.listen(PORT, () => {
            logger.info({ port: PORT }, "Server started")
        })
    } catch (err) {
        logger.error({ err }, "Failed to start server")
        process.exit(1)
    }
}

const shutdown = async (signal) => {
    logger.info({ signal }, "Shutting down")
    try {
        if (queueEvents) {
            await queueEvents.close()
        }
        if (io) {
            await io.close()
        }
        if (server) {
            await new Promise((resolve) => server.close(resolve))
        }
        await mongoose.connection.close()
        await closeRedisClient()
    } catch (err) {
        logger.error({ err }, "Error during shutdown")
    } finally {
        process.exit(0)
    }
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

startServer()
