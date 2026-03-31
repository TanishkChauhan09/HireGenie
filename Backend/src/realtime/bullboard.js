const { createBullBoard } = require("@bull-board/api")
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter")
const { ExpressAdapter } = require("@bull-board/express")
const { interviewQueue } = require("../queue/interviewQueue")

const setupBullBoard = (app) => {
    const serverAdapter = new ExpressAdapter()
    serverAdapter.setBasePath("/admin/queue")

    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
        queues: [ new BullMQAdapter(interviewQueue) ],
        serverAdapter,
        options: {
            readOnly: true
        }
    })

    app.use("/admin/queue", (req, res, next) => {
        const token = process.env.QUEUE_DASHBOARD_TOKEN
        if (token && req.headers["x-dashboard-token"] !== token) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        return next()
    }, serverAdapter.getRouter())

    return { serverAdapter, addQueue, removeQueue, setQueues, replaceQueues }
}

module.exports = { setupBullBoard }
