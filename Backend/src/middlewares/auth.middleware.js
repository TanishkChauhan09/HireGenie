const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.models")



async function authUser(req, res, next) {

    const headerToken = req.header("authorization")
    const token = req.cookies.token || (headerToken ? headerToken.replace(/^Bearer\s+/i, "") : null)

    if (!token) {
        return res.status(401).json({
            message: "Token not provided."
        })
    }

    const isTokenBlacklisted = await tokenBlacklistModel.findOne({
        token
    })

    if (isTokenBlacklisted) {
        return res.status(401).json({
            message: "token is invalid"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decoded

        next()

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token."
        })
    }

}


module.exports = { authUser }
