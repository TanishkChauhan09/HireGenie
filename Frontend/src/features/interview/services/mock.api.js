import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
})

export const getMockQuestion = async ({ jobDescription, focus }) => {
    const response = await api.get("/api/mock/question", {
        params: { jobDescription, focus }
    })
    return response.data
}

export const evaluateMockAnswer = async ({ question, answer, jobDescription }) => {
    const response = await api.post("/api/mock/evaluate", {
        question, answer, jobDescription
    })
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
