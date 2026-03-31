const { z } = require("zod")

const registerBody = z.object({
    username: z.string().trim().min(2, "Username is too short"),
    email: z.string().trim().email("Invalid email"),
    password: z.string().min(4, "Password must be at least 4 characters")
})

const loginBody = z.object({
    email: z.string().trim().email("Invalid email"),
    password: z.string().min(4, "Password must be at least 4 characters")
})

module.exports = { registerBody, loginBody }
