import axios from "axios"


const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true
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
