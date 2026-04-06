const nodemailer = require("nodemailer")
const { Resend } = require("resend")
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
    enabled: parseBool(process.env.MAIL_ENABLED || "true"),
    resendKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM || process.env.SMTP_FROM || "HireGenie <no-reply@hiregenie.app>"
})

const isConfigured = (config) => {
    return Boolean(config.host && config.user && config.pass)
}

let cachedTransport = null
let cachedResend = null

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

const getResendClient = (config) => {
    if (!config.resendKey) return null
    if (!cachedResend) {
        cachedResend = new Resend(config.resendKey)
    }
    return cachedResend
}

async function sendMail({ to, subject, text, html }) {
    const config = getMailConfig()
    if (!config.enabled) {
        return { skipped: true, reason: "MAIL_ENABLED=false" }
    }

    const resend = getResendClient(config)
    if (resend) {
        try {
            const result = await resend.emails.send({
                from: config.resendFrom,
                to,
                subject,
                text,
                html
            })
            if (result?.error) {
                throw new Error(result.error?.message || "Resend error")
            }
            return { ok: true, messageId: result?.data?.id }
        } catch (err) {
            logger.error({ err }, "Resend email failed")
            return { ok: false, error: err?.message || "Resend error" }
        }
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
