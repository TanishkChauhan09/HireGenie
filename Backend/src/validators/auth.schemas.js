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

const forgotPasswordBody = z.object({
    email: z.string().trim().email("Invalid email")
})

const resetPasswordBody = z.object({
    token: z.string().min(10, "Reset token is required"),
    password: z.string().min(4, "Password must be at least 4 characters")
})

module.exports = { registerBody, loginBody, forgotPasswordBody, resetPasswordBody }
