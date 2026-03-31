import { io } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"
let socket

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true
        })
    }
    return socket
}

export const waitForJobResult = (jobId, { timeoutMs = 30000 } = {}) => {
    return new Promise((resolve, reject) => {
        const s = getSocket()
        let settled = false

        const cleanup = () => {
            if (settled) return
            settled = true
            s.off("job:completed", onCompleted)
            s.off("job:failed", onFailed)
            if (timeout) clearTimeout(timeout)
        }

        const onCompleted = (payload) => {
            if (payload?.jobId !== jobId) return
            cleanup()
            resolve(payload)
        }

        const onFailed = (payload) => {
            if (payload?.jobId !== jobId) return
            cleanup()
            reject(new Error(payload?.error || "AI job failed."))
        }

        const subscribe = () => {
            s.emit("watch_job", { jobId }, (ack) => {
                if (ack && ack.ok === false) {
                    // keep socket listeners; fallback will handle if needed
                }
            })
        }

        s.on("job:completed", onCompleted)
        s.on("job:failed", onFailed)

        if (s.connected) {
            subscribe()
        } else {
            s.once("connect", subscribe)
        }

        const timeout = setTimeout(() => {
            cleanup()
            reject(new Error("AI processing timed out. Please try again."))
        }, timeoutMs)
    })
}

export const waitForJobResultWithFallback = async (jobId, pollFn, timeoutMs = 30000) => {
    try {
        const socketTimeout = Math.min(timeoutMs, 20000)
        return await waitForJobResult(jobId, { timeoutMs: socketTimeout })
    } catch (err) {
        return await pollFn(jobId, timeoutMs)
    }
}
