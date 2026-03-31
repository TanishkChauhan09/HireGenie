const multer = require("multer")

const allowedMimeTypes = new Set([
    "application/pdf",
    "audio/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/ogg"
])

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.has(file.mimetype)) {
            return cb(null, true)
        }
        return cb(new Error("Unsupported file type"))
    }
})


module.exports = upload
