const { ZodError } = require("zod")

const formatZodError = (error) => {
    if (!(error instanceof ZodError)) return "Invalid request"
    const issues = error.issues || error.errors || []
    return issues.map((err) => ({
        path: err.path.join("."),
        message: err.message
    }))
}

const validate = (schemas) => (req, res, next) => {
    try {
        if (schemas?.params) {
            const parsed = schemas.params.safeParse(req.params)
            if (!parsed.success) {
                return res.status(400).json({ message: "Invalid params", errors: formatZodError(parsed.error) })
            }
            req.params = parsed.data
        }

        if (schemas?.query) {
            const parsed = schemas.query.safeParse(req.query)
            if (!parsed.success) {
                return res.status(400).json({ message: "Invalid query", errors: formatZodError(parsed.error) })
            }
            req.query = parsed.data
        }

        if (schemas?.body) {
            const parsed = schemas.body.safeParse(req.body)
            if (!parsed.success) {
                return res.status(400).json({ message: "Invalid body", errors: formatZodError(parsed.error) })
            }
            req.body = parsed.data
        }

        return next()
    } catch (err) {
        return next(err)
    }
}

module.exports = { validate }
