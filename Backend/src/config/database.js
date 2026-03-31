const mongoose = require("mongoose")

const connectToDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected to Database")

        // Ensure indexes exist (production safety)
        const userModel = require("../models/user.model")
        const tokenBlacklistModel = require("../models/blacklist.models")
        const interviewReportModel = require("../models/interviewReport.models")

        await Promise.all([
            userModel.syncIndexes(),
            tokenBlacklistModel.syncIndexes(),
            interviewReportModel.syncIndexes()
        ])

        console.log("Mongo indexes synced")
    } catch (err) {
        console.error("Database connection failed:", err)
        throw err
    }
}

module.exports = connectToDB
