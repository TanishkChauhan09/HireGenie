import React, { useEffect, useState } from 'react'
import "../style/home.scss"
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/hooks/useAuth'

const ROTATING_LINES = [
    "AI crafts a tailored interview strategy from your resume and job post.",
    "Get role-specific technical and behavioral practice in seconds.",
    "Identify skill gaps and a day-wise prep roadmap automatically.",
    "Download a clean, ATS-friendly resume aligned to the job.",
    "Turn scattered prep into a focused, high-confidence plan."
]

const Home = () => {

    const { loading, user } = useAuth()
    const [ lineIndex, setLineIndex ] = useState(0)
    const [ error, setError ] = useState("")

    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const id = setInterval(() => {
            setLineIndex((prev) => (prev + 1) % ROTATING_LINES.length)
        }, 3500)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        if (user) {
            navigate("/generate")
        }
    }, [ user, navigate ])

    useEffect(() => {
        if (location.state?.fromProtected) {
            setError("Please login or register to continue.")
        }
    }, [ location.state ])

    const handleGoLogin = () => navigate("/login")
    const handleGoRegister = () => navigate("/register")

    if (loading) {
        return (
            <main className='loading-screen'>
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    return (
        <div className='landing'>
            <div className='ambient-grid' />
            <div className='ambient-orb orb-one' />
            <div className='ambient-orb orb-two' />

            <header className='landing-nav'>
                <Link className='home-pill' to="/">Home</Link>
                <div className='brand'>
                    {"HireGenie".split("").map((char, index) => (
                        <span key={`${char}-${index}`} style={{ "--i": index }}>
                            {char}
                        </span>
                    ))}
                </div>
                <div className='nav-actions'>
                    <button onClick={handleGoLogin} className='nav-solid'>Login</button>
                    <button onClick={handleGoRegister} className='nav-solid'>Register</button>
                </div>
            </header>
            {error && (
                <div className='error-box' role='alert'>
                    {error}
                </div>
            )}

            <main className='landing-body'>
                <section className='hero-card'>
                    <div className='hero-image'>
                        <div className='hero-overlay'>
                            <h1>Interview Strategy, Crafted by AI</h1>
                            <p className='hero-rotating'>{ROTATING_LINES[lineIndex]}</p>
                        </div>
                    </div>
                    <div className='hero-copy'>
                        <p>
                            Upload your resume or describe your experience, paste a job description,
                            and get a complete interview prep package in one click.
                        </p>
                        <div className='hero-stats'>
                            <div>
                                <span className='stat-value'>5+</span>
                                <span className='stat-label'>Questions per section</span>
                            </div>
                            <div>
                                <span className='stat-value'>7</span>
                                <span className='stat-label'>Day roadmap</span>
                            </div>
                            <div>
                                <span className='stat-value'>1</span>
                                <span className='stat-label'>Aligned resume PDF</span>
                            </div>
                        </div>
                        <div className='hero-social'>
                            <a
                                href="https://www.linkedin.com"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="LinkedIn"
                                className='social-link social-link--large'
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM0.5 23.5H4.5V7.5H0.5V23.5ZM8.5 7.5H12.3V9.7H12.35C12.89 8.68 14.2 7.6 16.2 7.6 20.2 7.6 21 10.1 21 13.6V23.5H17V14.3C17 12.1 16.96 9.3 14 9.3 11 9.3 10.5 11.6 10.5 14.1V23.5H6.5V7.5H8.5Z"/>
                                </svg>
                            </a>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="GitHub"
                                className='social-link social-link--large'
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 0.5C5.65 0.5 0.5 5.74 0.5 12.22c0 5.2 3.32 9.62 7.92 11.18.58.11.79-.26.79-.57 0-.28-.01-1.04-.02-2.04-3.22.71-3.9-1.6-3.9-1.6-.53-1.38-1.29-1.75-1.29-1.75-1.05-.74.08-.73.08-.73 1.16.08 1.77 1.22 1.77 1.22 1.03 1.8 2.7 1.28 3.36.98.1-.76.4-1.28.72-1.57-2.57-.3-5.27-1.32-5.27-5.86 0-1.3.45-2.37 1.18-3.2-.12-.3-.51-1.52.11-3.17 0 0 .97-.32 3.18 1.22a10.82 10.82 0 0 1 2.9-.4c.98 0 1.97.14 2.9.4 2.2-1.54 3.17-1.22 3.17-1.22.62 1.65.23 2.87.11 3.17.74.83 1.18 1.9 1.18 3.2 0 4.55-2.71 5.56-5.29 5.85.41.37.78 1.1.78 2.22 0 1.6-.02 2.89-.02 3.28 0 .31.21.69.8.57 4.6-1.56 7.92-5.98 7.92-11.18C23.5 5.74 18.35 0.5 12 0.5Z"/>
                                </svg>
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Twitter"
                                className='social-link social-link--large'
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M23.5 4.8c-.84.38-1.74.64-2.69.76a4.67 4.67 0 0 0 2.05-2.6 9.1 9.1 0 0 1-2.96 1.16A4.54 4.54 0 0 0 16.5 3c-2.6 0-4.7 2.18-4.7 4.87 0 .38.04.75.12 1.1-3.9-.2-7.36-2.13-9.68-5.06a5 5 0 0 0-.63 2.46c0 1.7.84 3.2 2.1 4.08a4.47 4.47 0 0 1-2.12-.6v.06c0 2.38 1.64 4.37 3.82 4.82a4.32 4.32 0 0 1-2.11.08c.6 1.92 2.33 3.31 4.38 3.35a9.04 9.04 0 0 1-5.8 2.08c-.38 0-.76-.02-1.13-.07a12.72 12.72 0 0 0 7.2 2.18c8.64 0 13.37-7.37 13.37-13.76 0-.21 0-.42-.01-.63A9.65 9.65 0 0 0 23.5 4.8Z"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <footer className='landing-footer' />
        </div>
    )
}

export default Home
