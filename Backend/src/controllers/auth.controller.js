const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.models")
const { sendMail } = require("../utils/mailer")
const { logger } = require("../utils/logger")
const crypto = require("crypto")
const passwordResetTokenModel = require("../models/passwordResetToken.model")

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/"
}

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body

        const normalizedEmail = email.toLowerCase().trim()
        const normalizedUsername = username.trim()

        const isUserAlreadyExists = await userModel.findOne({
            $or: [ { username: normalizedUsername }, { email: normalizedEmail } ]
        })

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "Account already exists with this email address or username"
            })
        }

        const hash = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password: hash
        })

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, cookieOptions)

        void sendMail({
            to: user.email,
            subject: "Welcome to HireGenie",
            text: `Hi ${user.username}, your account is now active. You can start your interview prep right away.`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
                    <h2>Welcome to HireGenie</h2>
                    <p>Hi ${user.username},</p>
                    <p>Your account is now active. You can start your interview prep right away.</p>
                    <p style="margin-top:16px;">If this wasn't you, please ignore this email.</p>
                </div>
            `
        }).then((result) => {
            if (result?.ok) {
                logger.info({ email: user.email }, "Registration email sent")
            }
        })

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error("registerUserController error:", err)
        res.status(500).json({ message: "Registration failed." })
    }
}


/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {
    try {
        const { email, password } = req.body

        const normalizedEmail = email.toLowerCase().trim()

        const user = await userModel.findOne({ email: normalizedEmail })

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, cookieOptions)
        void sendMail({
            to: user.email,
            subject: "New login to your HireGenie account",
            text: `Hi ${user.username}, a login to your account was just detected. If this wasn't you, please reset your password.`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
                    <h2>New login detected</h2>
                    <p>Hi ${user.username},</p>
                    <p>A login to your HireGenie account was just detected.</p>
                    <p>If this wasn't you, please reset your password immediately.</p>
                </div>
            `
        }).then((result) => {
            if (result?.ok) {
                logger.info({ email: user.email }, "Login email sent")
            }
        })
        res.status(200).json({
            message: "User loggedIn successfully.",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error("loginUserController error:", err)
        res.status(500).json({ message: "Login failed." })
    }
}


/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    try {
        const headerToken = req.header("authorization")
        const token = req.cookies.token || (headerToken ? headerToken.replace(/^Bearer\s+/i, "") : null)

        if (token) {
            const decoded = jwt.decode(token)
            const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000)
            await tokenBlacklistModel.create({ token, expiresAt })
        }

        res.clearCookie("token", cookieOptions)

        res.status(200).json({
            message: "User logged out successfully"
        })
    } catch (err) {
        console.error("logoutUserController error:", err)
        res.status(500).json({ message: "Logout failed." })
    }
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                message: "Unauthorized."
            })
        }

        const user = await userModel.findById(req.user.id)

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            })
        }

        res.status(200).json({
            message: "User details fetched successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error("getMeController error:", err)
        res.status(500).json({ message: "Failed to fetch user." })
    }
}

/**
 * @name requestPasswordResetController
 * @description request a password reset email
 * @access public
 */
async function requestPasswordResetController(req, res) {
    try {
        const { email } = req.body
        const normalizedEmail = email.toLowerCase().trim()
        const user = await userModel.findOne({ email: normalizedEmail })

        // Always respond with success to avoid email enumeration
        if (!user) {
            return res.status(200).json({ message: "If the email exists, a reset link has been sent." })
        }

        const rawToken = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await passwordResetTokenModel.create({
            user: user._id,
            tokenHash,
            expiresAt
        })

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"
        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`

        void sendMail({
            to: user.email,
            subject: "Reset your HireGenie password",
            text: `Hello ${user.username}, reset your password using this link: ${resetLink}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
                    <h2>Reset your password</h2>
                    <p>Hello ${user.username},</p>
                    <p>We received a request to reset your HireGenie password.</p>
                    <p>
                        <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#e35b3c;color:#fff;text-decoration:none;border-radius:6px;">
                            Reset Password
                        </a>
                    </p>
                    <p>This link expires in 1 hour.</p>
                    <p>If you didn't request this, you can ignore this email.</p>
                </div>
            `
        })

        return res.status(200).json({ message: "If the email exists, a reset link has been sent." })
    } catch (err) {
        console.error("requestPasswordResetController error:", err)
        return res.status(500).json({ message: "Failed to start password reset." })
    }
}

/**
 * @name resetPasswordController
 * @description reset password using token
 * @access public
 */
async function resetPasswordController(req, res) {
    try {
        const { token, password } = req.body
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

        const record = await passwordResetTokenModel.findOne({
            tokenHash,
            usedAt: null,
            expiresAt: { $gt: new Date() }
        })

        if (!record) {
            return res.status(400).json({ message: "Reset token is invalid or expired." })
        }

        const user = await userModel.findById(record.user)
        if (!user) {
            return res.status(404).json({ message: "User not found." })
        }

        const hash = await bcrypt.hash(password, 10)
        user.password = hash
        await user.save()

        record.usedAt = new Date()
        await record.save()

        return res.status(200).json({ message: "Password reset successful. Please login again." })
    } catch (err) {
        console.error("resetPasswordController error:", err)
        return res.status(500).json({ message: "Failed to reset password." })
    }
}


module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController,
    requestPasswordResetController,
    resetPasswordController
}
