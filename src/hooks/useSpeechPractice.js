import { useState, useCallback, useRef, useEffect } from 'react';
import useWhisperSTT from './useWhisperSTT.js';
import { similarity, computeDiff } from '../utils/speechUtils.js';

/**
 * Custom hook for speech practice evaluation.
 * Wraps useWhisperSTT with similarity scoring, feedback state, and LLM pronunciation tips.
 *
 * @param {Object} opts
 * @param {string} opts.langCode - 'uk' or 'ru'
 * @param {string} opts.langName - 'Ukrainian' or 'Russian'
 * @param {Function} [opts.onResult] - callback({match, similarity, transcript, diff}) after each evaluation
 */
export default function useSpeechPractice({ langCode, langName, onResult }) {
  const targetRef = useRef('');

  // Feedback
  const [feedback, setFeedback] = useState(null);
  const [llmFeedback, setLlmFeedback] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);

  // Pulse animation
  const [pulseScale, setPulseScale] = useState(1);
  const pulseRef = useRef(null);

  const onTranscript = useCallback((text) => {
    const target = targetRef.current;
    if (!target) return;
    const sim = similarity(target, text);
    const diff = computeDiff(target, text);
    const match = sim >= 90 ? 'correct' : sim >= 70 ? 'close' : 'miss';
    const result = { match, transcript: text, similarity: sim, diff };
    setFeedback(result);
    if (onResult) onResult(result);
  }, [onResult]);

  const stt = useWhisperSTT({ onTranscript });

  // Pulse animation while listening
  useEffect(() => {
    if (stt.isListening) {
      pulseRef.current = setInterval(() => {
        setPulseScale(p => p === 1 ? 1.15 : 1);
      }, 500);
    } else {
      clearInterval(pulseRef.current);
      setPulseScale(1);
    }
    return () => clearInterval(pulseRef.current);
  }, [stt.isListening]);

  const setTarget = useCallback((word) => {
    targetRef.current = word;
  }, []);

  const toggleRecord = useCallback(() => {
    if (stt.isListening) {
      stt.stopListening();
    } else {
      setFeedback(null);
      setLlmFeedback(null);
      stt.startListening(langCode);
    }
  }, [stt, langCode]);

  const stopRecording = useCallback(() => {
    if (stt.isListening) {
      stt.stopListening();
    }
  }, [stt]);

  const getTips = useCallback(async () => {
    if (!feedback || llmLoading) return;
    setLlmLoading(true);
    try {
      const langSpecific = langCode === 'uk'
        ? 'For Ukrainian, pay attention to: soft/hard consonants, palatalization, vowel reduction, stress patterns, and the letters ь, ї, є, щ, г (fricative "h").'
        : 'For Russian, pay attention to: soft/hard consonants, palatalization, vowel reduction (аканье/иканье), stress patterns, and the letters ы, э, ё, щ, ж.';

      const systemPrompt = `You are a ${langName} pronunciation coach. A student spoke a ${langName} word/phrase and a speech recognition system (Whisper) transcribed what it heard.

Your job:
- Analyze the difference between the target and what Whisper heard
- Identify which specific sounds or syllables likely caused the mismatch
- ${langSpecific}
- Give 1-2 specific, actionable pronunciation tips
- If they got it right, give brief encouragement and mention a subtle aspect they could refine
- Use IPA or simplified phonetic notation when helpful
- Keep responses under 100 words — be direct and practical
- Do NOT repeat the target or transcript back verbatim`;

      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Target: "${targetRef.current}"\nWhisper heard: "${feedback.transcript}"\nSimilarity: ${feedback.similarity}%\nPlease analyze.` },
          ],
          temperature: 0.5,
          max_tokens: 300,
          stream: false,
        }),
      });
      const data = await res.json();
      setLlmFeedback(data.choices?.[0]?.message?.content || 'No feedback available.');
    } catch {
      setLlmFeedback('Could not reach the AI. Make sure LM Studio is running.');
    } finally {
      setLlmLoading(false);
    }
  }, [feedback, llmLoading, langCode, langName]);

  const retry = useCallback(() => {
    setFeedback(null);
    setLlmFeedback(null);
  }, []);

  const reset = useCallback(() => {
    setFeedback(null);
    setLlmFeedback(null);
    setLlmLoading(false);
    if (stt.isListening) {
      stt.stopListening();
    }
  }, [stt]);

  return {
    // STT state
    isListening: stt.isListening,
    isTranscribing: stt.isTranscribing,
    error: stt.error,
    // Feedback
    feedback,
    llmFeedback,
    llmLoading,
    // Pulse
    pulseScale,
    // Actions
    setTarget,
    toggleRecord,
    stopRecording,
    getTips,
    retry,
    reset,
  };
}
