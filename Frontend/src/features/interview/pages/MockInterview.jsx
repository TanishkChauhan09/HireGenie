import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import "./mock.scss"
import { evaluateMockAnswer, getMockQuestion } from "../services/mock.api"
import useSpeechToText from "../hooks/useSpeechtoText"

const MockInterview = () => {
    const [ question, setQuestion ] = useState("")
    const [ answer, setAnswer ] = useState("")
    const [ feedback, setFeedback ] = useState(null)
    const [ loading, setLoading ] = useState(false)
    const [ timer, setTimer ] = useState(0)
    const [ error, setError ] = useState("")

    const feedbackRef = useRef(null)

    const {
        isListening,
        transcript,
        status: speechStatus,
        error: speechError,
        startListening,
        stopListening,
        supported,
    } = useSpeechToText({ continuous: true, interimResults: true, lang: "en-US" })

    const canRecord = useMemo(() => supported, [ supported ])

    useEffect(() => {
        let interval
        if (isListening) {
            interval = setInterval(() => setTimer((t) => t + 1), 1000)
        }
        return () => clearInterval(interval)
    }, [ isListening ])

    const fetchQuestion = async () => {
        setError("")
        setLoading(true)
        try {
            const data = await getMockQuestion({})
            setQuestion(data.question)
            setFeedback(null)
            setAnswer("")
        } catch (err) {
            setError("Failed to get a question. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchQuestion()
    }, [])

    const startRecording = () => {
        if (!canRecord) {
            setError("Live speech recognition is not supported in this browser. Use Chrome.")
            return
        }
        setError("")
        setTimer(0)
        startListening()
    }

    const stopRecording = () => {
        stopListening()
    }

    const handleEvaluate = async () => {
        setError("")
        if (!answer.trim()) {
            setError("Please provide an answer.")
            return
        }
        setLoading(true)
        try {
            const data = await evaluateMockAnswer({ question, answer })
            setFeedback(data.evaluation)
        } catch (err) {
            setError("Failed to evaluate. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (feedbackRef.current && feedback) {
            feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, [ feedback ])

    useEffect(() => {
        if (transcript) {
            setAnswer(transcript)
        }
    }, [ transcript ])

    useEffect(() => {
        if (speechError) {
            setError(speechError)
        }
    }, [ speechError ])

    return (
        <div className='mock-shell'>
            <div className='mock-ambient' />
            <div className='mock-orb orb-one' />
            <div className='mock-orb orb-two' />

            <Link className='home-floating' to="/">Home</Link>
            <div className='mock-brand'>
                {"HireGenie".split("").map((char, index) => (
                    <span key={`${char}-${index}`} style={{ "--i": index }}>
                        {char}
                    </span>
                ))}
            </div>

            <div className='mock-card'>
                <header>
                    <h1>Mock Interview</h1>
                    <p>Answer the question by voice or text, then get AI feedback.</p>
                </header>

                <section className='mock-question'>
                    <div className='question-label'>Question</div>
                    <p>{question || "Loading question..."}</p>
                    <button onClick={fetchQuestion} className='ghost-btn' disabled={loading}>
                        New Question
                    </button>
                </section>

                <section className='mock-controls'>
                    <div className='timer'>? {timer}s</div>
                    <div className='controls'>
                        <button className='primary-cta' onClick={startRecording} disabled={isListening || loading}>
                            Start Recording 
                        </button>
                        <button className='ghost-btn' onClick={stopRecording} disabled={!isListening}>
                            Stop Recording
                        </button>
                    </div>
                    <div className='mic-debug'>
                        <span className='mic-status'>Speech: {speechStatus}</span>
                    </div>
                </section>

                <section className='mock-answer'>
                    <label>Your Answer</label>
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder='Type or record your answer...'
                    />
                    <button className='primary-cta' onClick={handleEvaluate} disabled={loading}>
                        Submit for Evaluation
                    </button>
                    {error && <div className='error-box'>{error}</div>}
                </section>

                {feedback && (
                    <section className='mock-feedback' ref={feedbackRef}>
                        <h2>Feedback</h2>
                        <div className='score-grid'>
                            <div><span>Clarity</span><strong>{feedback.clarity}/10</strong></div>
                            <div><span>Confidence</span><strong>{feedback.confidence}/10</strong></div>
                            <div><span>Accuracy</span><strong>{feedback.technicalAccuracy}/10</strong></div>
                        </div>
                        <div className='feedback-block'>
                            <h3>Missed Points</h3>
                            <ul>
                                {feedback.missedPoints.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <div className='feedback-block'>
                            <h3>Suggestions</h3>
                            <ul>
                                {feedback.suggestions.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}

export default MockInterview
