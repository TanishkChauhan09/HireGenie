import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import "./mock.scss"
import { evaluateMockAnswer, getMockQuestion } from "../services/mock.api"
import useSpeechToText from "../hooks/useSpeechtoText"
import { useInterview } from "../hooks/useInterview"

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

const pickFocusFromGaps = (skillGaps) => {
    if (!Array.isArray(skillGaps) || skillGaps.length === 0) return ""
    const high = skillGaps.filter((gap) => gap.severity === "high")
    const medium = skillGaps.filter((gap) => gap.severity === "medium")
    const pool = high.length ? high : (medium.length ? medium : skillGaps)
    const choice = pool[Math.floor(Math.random() * pool.length)]
    return choice?.skill || ""
}

const MockInterview = () => {
    const [ question, setQuestion ] = useState("")
    const [ answer, setAnswer ] = useState("")
    const [ feedback, setFeedback ] = useState(null)
    const [ loading, setLoading ] = useState(false)
    const [ timer, setTimer ] = useState(0)
    const [ error, setError ] = useState("")

    const feedbackRef = useRef(null)
    const { mockContext } = useInterview()

    const {
        isListening,
        transcript,
        status: speechStatus,
        error: speechError,
        startListening,
        stopListening,
        resetTranscript,
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
            const focus = pickFocusFromGaps(mockContext?.skillGaps)
            const data = await getMockQuestion({
                refresh: true,
                jobDescription: mockContext?.jobDescription || "",
                focus
            })
            setQuestion(data.question)
            setFeedback(null)
            setAnswer("")
            resetTranscript()
            setTimer(0)
        } catch (err) {
            setError("Failed to get a question. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchQuestion()
    }, [ mockContext?.jobDescription ])

    const startRecording = () => {
        if (!canRecord) {
            setError("Live speech recognition is not supported in this browser. Use Chrome.")
            return
        }
        setError("")
        setTimer(0)
        startListening({ appendText: answer })
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
            const data = await evaluateMockAnswer({
                question,
                answer,
                jobDescription: mockContext?.jobDescription || ""
            })
            setFeedback(data.evaluation)
        } catch (err) {
            setError("Failed to evaluate. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleClear = () => {
        setAnswer("")
        resetTranscript()
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
                    <div className='question-actions'>
                        <button onClick={fetchQuestion} className='ghost-btn' disabled={loading}>
                            {loading ? "Processing..." : "New Question"}
                        </button>
                        <span className='question-hint'>Focus: {pickFocusFromGaps(mockContext?.skillGaps) || "General"}</span>
                    </div>
                    {loading && (
                        <div className='ai-processing'>AI is processing. Please wait...</div>
                    )}
                </section>

                <section className='mock-controls'>
                    <div className='timer'>? {formatTime(timer)}</div>
                    <div className='controls'>
                        <button className='primary-cta' onClick={startRecording} disabled={isListening || loading}>
                            {isListening ? "Recording..." : "Start Recording"}
                        </button>
                        <button className='ghost-btn' onClick={stopRecording} disabled={!isListening}>
                            Stop Recording
                        </button>
                    </div>
                    <div className='mic-debug'>
                        <div className={`record-pill ${isListening ? "live" : "idle"}`}>
                            <span className='dot' />
                            {isListening ? "Live" : "Paused"}
                        </div>
                        <span className='mic-status'>Speech: {speechStatus}</span>
                        <span className='mic-hint'>Start again to append to your answer.</span>
                    </div>
                </section>

                <section className='mock-answer'>
                    <div className='answer-head'>
                        <label>Your Answer</label>
                        <div className='answer-actions'>
                            <button className='ghost-btn small' onClick={handleClear} type='button'>
                                Clear
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder='Type or record your answer...'
                    />
                    <button className='primary-cta' onClick={handleEvaluate} disabled={loading}>
                        {loading ? "Processing..." : "Submit for Evaluation"}
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
