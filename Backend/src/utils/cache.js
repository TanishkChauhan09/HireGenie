const crypto = require("crypto")
const { getRedisClient } = require("../config/redis")

const DEFAULT_TTL = Number(process.env.REDIS_CACHE_TTL || 60 * 60) // 1 hour
const USER_CACHE_VERSION_TTL = Number(process.env.USER_CACHE_VERSION_TTL || 60 * 60 * 24 * 30) // 30 days

const generateKey = (prefix, payload) => {
    const raw = JSON.stringify(payload || {})
    const hash = crypto.createHash("sha1").update(raw).digest("hex")
    return `${prefix}:${hash}`
}

const getCache = async (key) => {
    const redis = getRedisClient()
    if (!redis) return null
    const value = await redis.get(key)
    if (!value) return null
    try {
        return JSON.parse(value)
    } catch (err) {
        return value
    }
}

const setCache = async (key, value, ttl = DEFAULT_TTL) => {
    const redis = getRedisClient()
    if (!redis) return
    const payload = typeof value === "string" ? value : JSON.stringify(value)
    await redis.set(key, payload, "EX", ttl)
}

const getUserCacheVersion = async (userId) => {
    if (!userId) return 1
    const redis = getRedisClient()
    if (!redis) return 1
    const key = `user:cache:version:${userId}`
    const value = await redis.get(key)
    if (!value) return 1
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 1 : parsed
}

const bumpUserCacheVersion = async (userId) => {
    if (!userId) return 1
    const redis = getRedisClient()
    if (!redis) return 1
    const key = `user:cache:version:${userId}`
    const next = await redis.incr(key)
    await redis.expire(key, USER_CACHE_VERSION_TTL)
    return next
}

module.exports = { generateKey, getCache, setCache, getUserCacheVersion, bumpUserCacheVersion }
