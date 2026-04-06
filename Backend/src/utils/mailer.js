const nodemailer = require("nodemailer")
const { logger } = require("./logger")

const parseBool = (value) => {
    if (value === undefined || value === null) return false
    return [ "1", "true", "yes", "on" ].includes(String(value).toLowerCase())
}

const getMailConfig = () => ({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || "HireGenie <no-reply@hiregenie.app>",
    enabled: parseBool(process.env.MAIL_ENABLED || "true")
})

const isConfigured = (config) => {
    return Boolean(config.host && config.user && config.pass)
}

let cachedTransport = null

const getTransport = (config) => {
    if (cachedTransport) return cachedTransport
    const secure = config.port === 465
    cachedTransport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure,
        auth: {
            user: config.user,
            pass: config.pass
        }
    })
    return cachedTransport
}

async function sendMail({ to, subject, text, html }) {
    const config = getMailConfig()
    if (!config.enabled) {
        return { skipped: true, reason: "MAIL_ENABLED=false" }
    }
    if (!isConfigured(config)) {
        return { skipped: true, reason: "SMTP not configured" }
    }

    const transport = getTransport(config)
    try {
        const info = await transport.sendMail({
            from: config.from,
            to,
            subject,
            text,
            html
        })
        return { ok: true, messageId: info.messageId }
    } catch (err) {
        logger.error({ err }, "Email send failed")
        return { ok: false, error: err?.message || "Unknown mail error" }
    }
}

module.exports = { sendMail }
