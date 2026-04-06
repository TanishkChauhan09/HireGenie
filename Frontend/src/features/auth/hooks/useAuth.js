import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe, clearStoredToken } from "../services/auth.api";



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context


    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const result = await login({ email, password })
            if (result?.error) {
                return { ok: false, error: result.error, status: result.status }
            }
            setUser(result.data.user)
            return { ok: true }
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        try {
            const result = await register({ username, email, password })
            if (result?.error) {
                return { ok: false, error: result.error, status: result.status }
            }
            setUser(result.data.user)
            return { ok: true }
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try {
            const result = await logout()
            if (!result?.error) {
                setUser(null)
            }
            if (result?.error) {
                clearStoredToken()
                setUser(null)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {

        const getAndSetUser = async () => {
            try {
                const result = await getMe()
                if (result?.data?.user) {
                    setUser(result.data.user)
                }
            } finally {
                setLoading(false)
            }
        }

        getAndSetUser()

    }, [])

    return { user, loading, handleRegister, handleLogin, handleLogout }
}
