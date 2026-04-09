const mongoose = require("mongoose")

const passwordResetTokenSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        tokenHash: { type: String, required: true, index: true },
        expiresAt: { type: Date, required: true },
        usedAt: { type: Date, default: null }
    },
    { timestamps: true }
)

// Auto-delete expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema)
