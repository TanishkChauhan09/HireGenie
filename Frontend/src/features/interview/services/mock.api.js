import axios from "axios";
import { waitForJobResultWithFallback } from "./realtime"

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
})

export const getMockQuestion = async ({ jobDescription, focus, refresh }) => {
    const response = await api.get("/api/mock/question", {
        params: { jobDescription, focus, refresh }
    })
    if (response.data?.question) return response.data
    if (response.data?.jobId) {
        const result = await waitForJobResultWithFallback(response.data.jobId, pollJob, 30000)
        return result.result || result
    }
    return response.data
}

export const evaluateMockAnswer = async ({ question, answer, jobDescription }) => {
    const response = await api.post("/api/mock/evaluate", {
        question, answer, jobDescription
    })
    if (response.data?.evaluation) return response.data
    if (response.data?.jobId) {
        const result = await waitForJobResultWithFallback(response.data.jobId, pollJob, 30000)
        return result.result || result
    }
    return response.data
}

export const speechToText = async ({ audioBlob }) => {
    const formData = new FormData()
    formData.append("audio", audioBlob, "answer.webm")
    const response = await api.post("/api/mock/speech-to-text", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    })
    return response.data
}

const pollJob = async (jobId, timeoutMs = 30000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        const statusRes = await api.get(`/api/mock/status/${jobId}`)
        if (statusRes.data?.status === "completed") {
            return statusRes.data.result || statusRes.data
        }
        if (statusRes.data?.status === "failed") {
            throw new Error(statusRes.data?.error || "AI job failed.")
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    throw new Error("AI processing timed out. Please try again.")
}
