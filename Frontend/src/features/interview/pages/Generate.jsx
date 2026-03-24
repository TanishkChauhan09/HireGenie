import React, { useEffect, useRef, useState } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useAuth } from '../../auth/hooks/useAuth'
import { Link, useNavigate } from 'react-router'

const Generate = () => {

    const { loading, generateReport, reports } = useInterview()
    const { user, handleLogout } = useAuth()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ error, setError ] = useState("")
    const [ showLogoutConfirm, setShowLogoutConfirm ] = useState(false)
    const resumeInputRef = useRef()

    const navigate = useNavigate()

    const handleGenerateReport = async () => {
        const resumeFile = resumeInputRef.current.files[ 0 ]
        setError("")

        if (!jobDescription.trim()) {
            setError("Please enter the job description.")
            return
        }

        if (!resumeFile && !selfDescription.trim()) {
            setError("Please upload a PDF resume or add a self description.")
            return
        }

        if (resumeFile && resumeFile.type !== "application/pdf") {
            setError("Only PDF resumes are supported.")
            return
        }

        const result = await generateReport({ jobDescription, selfDescription, resumeFile })
        if (result?.error) {
            setError(result.error)
            return
        }
        if (result?.report?._id) {
            navigate(`/interview/${result.report._id}`)
        } else {
            setError("Failed to generate interview strategy. Please try again.")
        }
    }

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
                <div className='generate-nav-left'>
                    <Link className='home-pill' to="/">Home</Link>
                    <div className='generate-auth-actions'>
                        <Link className='nav-solid' to="/login">Register/Login</Link>
                        {user && (
                            <div className='logout-anchor'>
                                <button
                                    onClick={() => setShowLogoutConfirm(true)}
                                    className='nav-solid logout-btn'
                                    type="button"
                                >
                                    Logout
                                </button>
                                {showLogoutConfirm && (
                                    <div className='logout-popover'>
                                        <p>Are you sure you want to log out?</p>
                                        <div className='logout-actions'>
                                            <button
                                                className='nav-ghost'
                                                type="button"
                                                onClick={() => setShowLogoutConfirm(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className='nav-solid'
                                                type="button"
                                                onClick={async () => {
                                                    await handleLogout()
                                                    setShowLogoutConfirm(false)
                                                    navigate("/")
                                                }}
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className='brand'>
                    {"HireGenie".split("").map((char, index) => (
                        <span key={`${char}-${index}`} style={{ "--i": index }}>
                            {char}
                        </span>
                    ))}
                </div>
            </header>

            <main className='landing-body'>
                <aside className='register-card'>
                    <h2>Generate Strategy</h2>
                    <p className='muted'>Fill these details to create your plan.</p>

                    <label className='field-label'>Target Job Description</label>
                    <textarea
                        onChange={(e) => { setJobDescription(e.target.value) }}
                        className='field-textarea'
                        placeholder='Paste the full job description here...'
                        maxLength={5000}
                    />

                    <label className='field-label'>Upload Resume (PDF)</label>
                    <label className='file-drop' htmlFor='resume'>
                        <span>Click to upload or drag & drop</span>
                        <small>PDF only (Max 5MB)</small>
                        <input ref={resumeInputRef} hidden type='file' id='resume' name='resume' accept='.pdf' />
                    </label>

                    <div className='divider'>OR</div>

                    <label className='field-label' htmlFor='selfDescription'>Quick Self-Description</label>
                    <textarea
                        onChange={(e) => { setSelfDescription(e.target.value) }}
                        id='selfDescription'
                        name='selfDescription'
                        className='field-textarea small'
                        placeholder="Briefly describe your experience and key skills..."
                    />

                    {error && (
                        <div className='error-box' role='alert'>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className='primary-cta'
                    >
                        Generate My Interview Strategy
                    </button>
                </aside>
            </main>

            {reports.length > 0 && (
                <section className='recent'>
                    <h3>Recent Plans</h3>
                    <div className='recent-grid'>
                        {reports.map(report => (
                            <div key={report._id} className='recent-card' onClick={() => navigate(`/interview/${report._id}`)}>
                                <h4>{report.title || 'Untitled Position'}</h4>
                                <p>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                                <span className='score'>Match Score: {report.matchScore}%</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <footer className='landing-footer landing-footer--center'>
                <div className='footer-links'>
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
            </footer>
        </div>
    )
}

export default Generate
