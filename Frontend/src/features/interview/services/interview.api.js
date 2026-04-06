import axios from "axios";
import { waitForJobResultWithFallback } from "./realtime"
import { getStoredToken } from "../../auth/services/auth.api"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
})

api.interceptors.request.use((config) => {
    const token = getStoredToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})


/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {

    const formData = new FormData()
    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)
    formData.append("resume", resumeFile)

    const response = await api.post("/api/interview/", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })

    return response.data

}


/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}


/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async ({ page = 1, limit = 10 } = {}) => {
    const response = await api.get("/api/interview/", {
        params: { page, limit }
    })

    return response.data
}


const pollResumeJob = async (jobId, timeoutMs = 30000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        const statusRes = await api.get(`/api/interview/resume/pdf/status/${jobId}`)
        if (statusRes.data?.status === "completed") {
            return statusRes.data
        }
        if (statusRes.data?.status === "failed") {
            throw new Error(statusRes.data?.error || "Resume job failed.")
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    throw new Error("Resume generation timed out. Please try again.")
}

const downloadResumePdf = async (jobId) => {
    const response = await api.get(`/api/interview/resume/pdf/download/${jobId}`, {
        responseType: "blob"
    })
    return response.data
}


/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`)

    if (response.data?.jobId) {
        await waitForJobResultWithFallback(response.data.jobId, pollResumeJob, 45000)
        return await downloadResumePdf(response.data.jobId)
    }

    return response.data
}
