const { Queue } = require("bullmq")
const { getBullConnection } = require("../config/redis")

const connection = getBullConnection()

const interviewQueue = new Queue("interviewQueue", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 3600 },
    },
})

module.exports = { interviewQueue }
