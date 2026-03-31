const mongoose = require("mongoose")


const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [ true, "token is required to be added in blacklist" ],
        index: true
    },
    expiresAt: {
        type: Date,
        index: { expires: 0 }
    }
}, {
    timestamps: true
})

const tokenBlacklistModel = mongoose.model("blacklistTokens", blacklistTokenSchema)


module.exports = tokenBlacklistModel
