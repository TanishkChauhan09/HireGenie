const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")
const { getCache } = require("../utils/cache")

const parseCookies = (cookieHeader) => {
    if (!cookieHeader) return {}
    return cookieHeader.split(";").reduce((acc, part) => {
        const [ key, ...rest ] = part.trim().split("=")
        acc[key] = decodeURIComponent(rest.join("=") || "")
        return acc
    }, {})
}

const initSocket = (server) => {
    const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        }
    })

    io.use((socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers.cookie || "")
            const headerToken = socket.handshake.headers.authorization
            const token = cookies.token || (headerToken ? headerToken.replace(/^Bearer\s+/i, "") : null)

            if (!token) {
                return next(new Error("Unauthorized"))
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.user = decoded
            return next()
        } catch (err) {
            return next(new Error("Unauthorized"))
        }
    })

    io.on("connection", (socket) => {
        const userId = socket.user?.id
        if (userId) {
            socket.join(`user:${userId}`)
        }

        socket.on("watch_job", async ({ jobId }, ack) => {
            try {
                if (!jobId || !userId) {
                    return ack?.({ ok: false, message: "Invalid request" })
                }

                const owner = (await getCache(`mock:job:${jobId}:owner`)) ||
                    (await getCache(`resume:job:${jobId}:owner`))

                if (!owner || owner !== userId) {
                    return ack?.({ ok: false, message: "Not authorized" })
                }

                socket.join(`job:${jobId}`)
                return ack?.({ ok: true })
            } catch (err) {
                return ack?.({ ok: false, message: "Failed to watch job" })
            }
        })

        socket.on("disconnect", () => {
            // no-op
        })
    })

    return io
}

module.exports = { initSocket }
