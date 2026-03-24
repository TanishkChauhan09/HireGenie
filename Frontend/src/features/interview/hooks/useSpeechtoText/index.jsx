import { useEffect, useRef, useState } from "react"

const getSpeechRecognition = () => {
    return window.webkitSpeechRecognition || null
}

const useSpeechToText = (options = {}) => {
    const [ isListening, setIsListening ] = useState(false)
    const [ transcript, setTranscript ] = useState("")
    const [ status, setStatus ] = useState("idle")
    const [ error, setError ] = useState("")
    const recognitionRef = useRef(null)
    const shouldListenRef = useRef(false)
    const finalTranscriptRef = useRef("")
    const restartTimeoutRef = useRef(null)

    useEffect(() => {
        const SpeechRecognition = getSpeechRecognition()
        if (!SpeechRecognition) {
            setError("Speech recognition works only in Chrome. Please use Chrome.")
            return
        }

        const recognition = new SpeechRecognition()
        recognitionRef.current = recognition
        recognition.lang = options.lang || "en-US"
        recognition.interimResults = options.interimResults ?? true
        recognition.continuous = options.continuous ?? true

        recognition.onstart = () => {
            setError("")
            setIsListening(true)
            setStatus("listening")
        }

        recognition.onspeechstart = () => {
            setStatus("speech detected")
        }

        recognition.onspeechend = () => {
            setStatus("speech paused")
        }

        recognition.onresult = (event) => {
            let interim = ""
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const segment = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += `${segment} `
                } else {
                    interim += segment
                }
            }
            setTranscript(`${finalTranscriptRef.current}${interim}`.trim())
        }

        recognition.onerror = (event) => {
            setStatus("error")
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                shouldListenRef.current = false
                setIsListening(false)
                setError("Microphone blocked. Allow mic access in the browser and try again.")
                return
            }
            if (event.error === "audio-capture") {
                shouldListenRef.current = false
                setIsListening(false)
                setError("No microphone found. Connect a mic and try again.")
                return
            }
            if (event.error === "no-speech") {
                setError("No speech detected. Keep speaking — listening will continue.")
                if (shouldListenRef.current) {
                    clearTimeout(restartTimeoutRef.current)
                    restartTimeoutRef.current = setTimeout(() => {
                        try {
                            recognition.start()
                        } catch (err) {
                            // ignore
                        }
                    }, 500)
                }
                return
            }
            if (event.error === "network") {
                setError("Speech recognition network error. Check your connection.")
            } else {
                setError("Speech recognition failed. Please try again.")
            }
        }

        recognition.onend = () => {
            if (shouldListenRef.current) {
                try {
                    recognition.start()
                } catch (err) {
                    setIsListening(false)
                    setStatus("idle")
                    shouldListenRef.current = false
                }
            } else {
                setIsListening(false)
                setStatus("idle")
            }
        }

        return () => {
            clearTimeout(restartTimeoutRef.current)
            try {
                recognition.stop()
            } catch (err) {
                // ignore
            }
        }
    }, [ options.lang, options.interimResults, options.continuous ])

    const startListening = () => {
        const recognition = recognitionRef.current
        if (!recognition) {
            setError("Speech recognition works only in Chrome. Please use Chrome.")
            return
        }
        setError("")
        finalTranscriptRef.current = ""
        shouldListenRef.current = true
        try {
            recognition.start()
        } catch (err) {
            try {
                recognition.stop()
                recognition.start()
            } catch (innerErr) {
                setError("Speech recognition could not start. Refresh and try again.")
            }
        }
    }

    const stopListening = () => {
        shouldListenRef.current = false
        clearTimeout(restartTimeoutRef.current)
        const recognition = recognitionRef.current
        if (recognition) {
            try {
                recognition.stop()
            } catch (err) {
                // ignore
            }
        }
    }

    return {
        isListening,
        transcript,
        status,
        error,
        startListening,
        stopListening,
        supported: !!getSpeechRecognition(),
    }
}

export default useSpeechToText
