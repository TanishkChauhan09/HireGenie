import axios from "axios"


const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true
})

export async function register({ username, email, password }) {

    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        })

        return { data: response.data }

    } catch (err) {
        const message = err?.response?.data?.message || "Registration failed"
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
        const message = err?.response?.data?.message || "Login failed"
        return { error: message, status: err?.response?.status }
    }

}

export async function logout() {
    try {

        const response = await api.get("/api/auth/logout")

        return { data: response.data }

    } catch (err) {
        const message = err?.response?.data?.message || "Logout failed"
        return { error: message, status: err?.response?.status }
    }
}

export async function getMe() {

    try {

        const response = await api.get("/api/auth/get-me")

        return { data: response.data }

    } catch (err) {
        const message = err?.response?.data?.message || "Not authenticated"
        return { error: message, status: err?.response?.status }
    }

}
