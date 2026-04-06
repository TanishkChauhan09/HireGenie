import React,{useEffect, useState} from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const ROTATING_LINES = [
    "Turn every interview into a confident story.",
    "AI-curated practice tailored to your exact role.",
    "Spot skill gaps before the recruiter does.",
    "Build a sharp, ATS-ready resume in minutes.",
    "Practice smarter, walk in stronger — HireGenie." 
]

const Register = () => {

    const navigate = useNavigate()
    const [ username, setUsername ] = useState("")
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ error, setError ] = useState("")
    const [ lineIndex, setLineIndex ] = useState(0)

    const {loading,handleRegister} = useAuth()
    
    useEffect(() => {
        const id = setInterval(() => {
            setLineIndex((prev) => (prev + 1) % ROTATING_LINES.length)
        }, 3500)
        return () => clearInterval(id)
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        const form = e.currentTarget
        const formData = new FormData(form)
        const formUsername = (formData.get("username") || "").toString().trim()
        const formEmail = (formData.get("email") || "").toString().trim()
        const formPassword = (formData.get("password") || "").toString()

        const result = await handleRegister({
            username: formUsername,
            email: formEmail,
            password: formPassword
        })
        if (!result?.ok) {
            setError(result?.error || "Registration failed")
            return
        }
        navigate("/generate")
    }

    if(loading){
        return (<main><h1>Loading.......</h1></main>)
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

            <section className='auth-hero'>
                <div className='hero-image'>
                    <div className='hero-overlay'>
                        <h1>Interview Strategy, Crafted by AI</h1>
                        <p>{ROTATING_LINES[lineIndex]}</p>
                    </div>
                </div>
            </section>

            <section className='auth-form'>
                <h1>Register</h1>

                <form onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            onChange={(e) => { setUsername(e.target.value) }}
                            type="text"
                            id="username"
                            name='username'
                            value={username}
                            autoComplete="username"
                            placeholder='Enter username'
                            required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email"
                            id="email"
                            name='email'
                            value={email}
                            autoComplete="email"
                            placeholder='Enter email address'
                            required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password"
                            id="password"
                            name='password'
                            value={password}
                            autoComplete="new-password"
                            placeholder='Enter password'
                            required />
                    </div>

                    {error && (
                        <div className='error-box' role='alert'>
                            {error}
                        </div>
                    )}

                    <button className='button primary-button' >Register</button>

                </form>

                <p>Already have an account? <Link to={"/login"} >Login</Link> </p>
            </section>
        </main>
    )
}

export default Register
