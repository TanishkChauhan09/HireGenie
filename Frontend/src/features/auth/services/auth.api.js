import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 15000
})

const formatError = (err, fallback) => {
    const data = err?.response?.data
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
        return data.errors.map((e) => e.message).join(", ")
    }
    return data?.message || fallback
}

export async function register({ username, email, password }) {

    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        })

        return { data: response.data }

    } catch (err) {
        const message = formatError(err, "Registration failed")
        return { error: message, status: err?.response?.status }
    }

}

export async function login({ email, password }) {

    try {

        const response = await api.post("/api/auth/login", {
            email, password
        })

        return { data: response.data }

    } catch (err) {
        const message = formatError(err, "Login failed")
        return { error: message, status: err?.response?.status }
    }

}

export async function logout() {
    try {

        const response = await api.get("/api/auth/logout")

        return { data: response.data }

    } catch (err) {
        const message = formatError(err, "Logout failed")
        return { error: message, status: err?.response?.status }
    }
}

export async function getMe() {

    try {

        const response = await api.get("/api/auth/get-me")

        return { data: response.data }

    } catch (err) {
        const message = formatError(err, "Not authenticated")
        return { error: message, status: err?.response?.status }
    }

}

export async function requestPasswordReset({ email }) {
    try {
        const response = await api.post("/api/auth/forgot-password", { email })
        return { data: response.data }
    } catch (err) {
        const message = formatError(err, "Failed to request reset.")
        return { error: message, status: err?.response?.status }
    }
}

export async function resetPassword({ token, password }) {
    try {
        const response = await api.post("/api/auth/reset-password", { token, password })
        return { data: response.data }
    } catch (err) {
        const message = formatError(err, "Failed to reset password.")
        return { error: message, status: err?.response?.status }
    }
}
