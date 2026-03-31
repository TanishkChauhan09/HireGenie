const Redis = require("ioredis")

let redisClient

const getRedisConfig = () => {
    const url = process.env.REDIS_URL
    if (url) {
        return { url, maxRetriesPerRequest: null }
    }
    return {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    }
}

const getRedisClient = () => {
    if (redisClient) return redisClient
    const config = getRedisConfig()
    if (config.url) {
        redisClient = new Redis(config.url, { maxRetriesPerRequest: null })
    } else {
        redisClient = new Redis(config)
    }
    redisClient.on("error", (err) => {
        console.error("Redis error:", err?.message || err)
    })
    return redisClient
}

const closeRedisClient = async () => {
    if (!redisClient) return
    try {
        await redisClient.quit()
    } catch (err) {
        redisClient.disconnect()
    } finally {
        redisClient = null
    }
}

const getBullConnection = () => {
    return getRedisClient()
}

module.exports = { getRedisClient, getBullConnection, closeRedisClient }
