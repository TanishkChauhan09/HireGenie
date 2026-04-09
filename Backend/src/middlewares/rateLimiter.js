const rateLimit = require("express-rate-limit")
const { ipKeyGenerator } = require("express-rate-limit")
const { RedisStore } = require("rate-limit-redis")
const { getRedisClient } = require("../config/redis")

const redis = getRedisClient()

const rateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (req.user?.id) return `user:${req.user.id}`
        return ipKeyGenerator(req)
    },
    ...(redis
        ? {
              store: new RedisStore({
                  sendCommand: (...args) => redis.call(...args),
              }),
          }
        : {}),
})

module.exports = { rateLimiter }
