const client = require("prom-client")

const register = new client.Registry()
client.collectDefaultMetrics({ register })

const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: [ "method", "route", "status_code" ],
    buckets: [ 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10 ]
})

const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: [ "method", "route", "status_code" ]
})

const httpErrorsTotal = new client.Counter({
    name: "http_errors_total",
    help: "Total number of HTTP error responses (5xx)",
    labelNames: [ "method", "route", "status_code" ]
})

const queueJobsTotal = new client.Counter({
    name: "bullmq_jobs_total",
    help: "Total number of BullMQ jobs",
    labelNames: [ "queue", "event", "job_name" ]
})

const queueJobDuration = new client.Histogram({
    name: "bullmq_job_duration_seconds",
    help: "BullMQ job processing duration in seconds",
    labelNames: [ "queue", "job_name", "status" ],
    buckets: [ 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60 ]
})

register.registerMetric(httpRequestDuration)
register.registerMetric(httpRequestsTotal)
register.registerMetric(httpErrorsTotal)
register.registerMetric(queueJobsTotal)
register.registerMetric(queueJobDuration)

const metricsMiddleware = (req, res, next) => {
    if (req.path === "/metrics") return next()

    const start = process.hrtime.bigint()
    res.on("finish", () => {
        const durationNs = Number(process.hrtime.bigint() - start)
        const durationSec = durationNs / 1e9

        const route = req.route?.path
            ? `${req.baseUrl}${req.route.path}`
            : req.baseUrl || req.path

        const labels = {
            method: req.method,
            route: route || "unknown",
            status_code: String(res.statusCode)
        }

        httpRequestDuration.observe(labels, durationSec)
        httpRequestsTotal.inc(labels)

        if (res.statusCode >= 500) {
            httpErrorsTotal.inc(labels)
        }
    })

    next()
}

const recordQueueEnqueued = (queue, jobName) => {
    queueJobsTotal.inc({ queue, event: "enqueued", job_name: jobName })
}

const recordQueueCompleted = (queue, jobName, durationMs) => {
    queueJobsTotal.inc({ queue, event: "completed", job_name: jobName })
    if (typeof durationMs === "number") {
        queueJobDuration.observe({ queue, job_name: jobName, status: "completed" }, durationMs / 1000)
    }
}

const recordQueueFailed = (queue, jobName, durationMs) => {
    queueJobsTotal.inc({ queue, event: "failed", job_name: jobName })
    if (typeof durationMs === "number") {
        queueJobDuration.observe({ queue, job_name: jobName, status: "failed" }, durationMs / 1000)
    }
}

module.exports = {
    register,
    metricsMiddleware,
    recordQueueEnqueued,
    recordQueueCompleted,
    recordQueueFailed
}
