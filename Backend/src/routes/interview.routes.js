const express = require("express")
const interviewController = require("../models/interview.controller")
const upload = require("../middlewares/file.middleware")
const { validate } = require("../middlewares/validate")
const { createInterviewBody, interviewIdParams, resumePdfParams, resumeJobParams, paginationQuery } = require("../validators/interview.schemas")

const interviewRouter = express.Router()



/**
 * @route POST /api/interview/
 * @description generate new interview report on the basis of user self description,resume pdf and job description.
 * @access private
 */
interviewRouter.post("/", upload.single("resume"), validate({ body: createInterviewBody }), interviewController.generateInterViewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
interviewRouter.get("/report/:interviewId", validate({ params: interviewIdParams }), interviewController.getInterviewReportByIdController)


/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @access private
 */
interviewRouter.get("/", validate({ query: paginationQuery }), interviewController.getAllInterviewReportsController)


/**
 * @route POST /api/interview/resume/pdf/:interviewReportId
 * @description enqueue resume pdf generation job.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId", validate({ params: resumePdfParams }), interviewController.enqueueResumePdfController)

/**
 * @route GET /api/interview/resume/pdf/status/:jobId
 * @description get resume pdf job status
 * @access private
 */
interviewRouter.get("/resume/pdf/status/:jobId", validate({ params: resumeJobParams }), interviewController.getResumePdfStatusController)

/**
 * @route GET /api/interview/resume/pdf/download/:jobId
 * @description download generated resume pdf
 * @access private
 */
interviewRouter.get("/resume/pdf/download/:jobId", validate({ params: resumeJobParams }), interviewController.downloadResumePdfController)



module.exports = interviewRouter
