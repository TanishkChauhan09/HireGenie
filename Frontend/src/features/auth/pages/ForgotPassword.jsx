import React, { useState } from "react"
import { Link } from "react-router"
import "../auth.form.scss"
import { requestPasswordReset } from "../services/auth.api"

const ForgotPassword = () => {
    const [ email, setEmail ] = useState("")
    const [ status, setStatus ] = useState("")
    const [ loading, setLoading ] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setStatus("")
        setLoading(true)
        try {
            const result = await requestPasswordReset({ email })
            if (result?.error) {
                setStatus(result.error)
            } else {
                setStatus("If the email exists, a reset link has been sent.")
            }
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
                <h1>Forgot Password</h1>
                <p className='muted-text'>Enter your email to receive a reset link.</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            placeholder="Enter email address"
                            required
                        />
                    </div>

                    {status && (
                        <div className='error-box' role='status'>
                            {status}
                        </div>
                    )}

                    <button className='button primary-button' disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <p>Remembered your password? <Link to="/login">Login</Link></p>
            </section>
        </main>
    )
}

export default ForgotPassword
