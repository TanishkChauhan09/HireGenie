import React, { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import "../auth.form.scss"
import { resetPassword } from "../services/auth.api"

const ResetPassword = () => {
    const [ searchParams ] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get("token") || ""

    const [ password, setPassword ] = useState("")
    const [ confirm, setConfirm ] = useState("")
    const [ status, setStatus ] = useState("")
    const [ loading, setLoading ] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setStatus("")
        if (!token) {
            setStatus("Reset token missing.")
            return
        }
        if (password.length < 4) {
            setStatus("Password must be at least 4 characters.")
            return
        }
        if (password !== confirm) {
            setStatus("Passwords do not match.")
            return
        }

        setLoading(true)
        try {
            const result = await resetPassword({ token, password })
            if (result?.error) {
                setStatus(result.error)
                return
            }
            setStatus("Password reset successful. Redirecting to login...")
            setTimeout(() => navigate("/login"), 1200)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className='auth-shell'>
            <div className='auth-ambient' />
            <div className='auth-orb orb-one' />
            <div className='auth-orb orb-two' />

            <Link className='home-floating' to="/">Home</Link>
            <div className='auth-brand'>
                {"HireGenie".split("").map((char, index) => (
                    <span key={`${char}-${index}`} style={{ "--i": index }}>
                        {char}
                    </span>
                ))}
            </div>

            <section className='auth-form'>
                <h1>Reset Password</h1>
                <p className='muted-text'>Set a new password for your account.</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="password">New Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="confirm">Confirm Password</label>
                        <input
                            type="password"
                            id="confirm"
                            name="confirm"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                            placeholder="Re-enter new password"
                            required
                        />
                    </div>

                    {status && (
                        <div className='error-box' role='status'>
                            {status}
                        </div>
                    )}

                    <button className='button primary-button' disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                <p>Back to <Link to="/login">Login</Link></p>
            </section>
        </main>
    )
}

export default ResetPassword
