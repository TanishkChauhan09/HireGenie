const { QueueEvents } = require("bullmq")
const { interviewQueue } = require("../queue/interviewQueue")
const { getBullConnection } = require("../config/redis")
const { getCache } = require("../utils/cache")

const initQueueEvents = (io) => {
    const connection = getBullConnection()
    const queueEvents = new QueueEvents("interviewQueue", { connection })

    queueEvents.on("completed", async ({ jobId, returnvalue }) => {
        try {
            const owner = (await getCache(`mock:job:${jobId}:owner`)) ||
                (await getCache(`resume:job:${jobId}:owner`))

            if (!owner) return

            const job = await interviewQueue.getJob(jobId)
            const payload = {
                jobId,
                status: "completed",
                jobName: job?.name,
                result: returnvalue
            }

            io.to(`user:${owner}`).emit("job:completed", payload)
            io.to(`job:${jobId}`).emit("job:completed", payload)
        } catch (err) {
            // swallow to avoid crashing event loop
        }
    })

    queueEvents.on("failed", async ({ jobId, failedReason }) => {
        try {
            const owner = (await getCache(`mock:job:${jobId}:owner`)) ||
                (await getCache(`resume:job:${jobId}:owner`))

            if (!owner) return

            const job = await interviewQueue.getJob(jobId)
            const payload = {
                jobId,
                status: "failed",
                jobName: job?.name,
                error: failedReason
            }

            io.to(`user:${owner}`).emit("job:failed", payload)
            io.to(`job:${jobId}`).emit("job:failed", payload)
        } catch (err) {
            // swallow to avoid crashing event loop
        }
    })

    return queueEvents
}

module.exports = { initQueueEvents }
