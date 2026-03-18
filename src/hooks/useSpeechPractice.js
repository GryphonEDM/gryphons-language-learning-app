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
    // For single-word targets, strip spaces from transcript (Whisper may insert them)
    const compareText = !target.includes(' ') ? text.replace(/\s+/g, '') : text;
    const sim = similarity(target, compareText, langCode);
    const diff = computeDiff(target, compareText, langCode);
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
      const langSpecificMap = {
        uk: 'For Ukrainian, pay attention to: soft/hard consonants, palatalization, vowel reduction, stress patterns, and the letters ь, ї, є, щ, г (fricative "h").',
        ru: 'For Russian, pay attention to: soft/hard consonants, palatalization, vowel reduction (аканье/иканье), stress patterns, and the letters ы, э, ё, щ, ж.',
        de: 'For German, pay attention to: umlauts (ä, ö, ü), the ch sound (ich-Laut vs ach-Laut), final consonant devoicing, and the r sound.',
        es: 'For Spanish, pay attention to: rolled r (rr), the ñ sound, b/v distinction, and vowel clarity — Spanish vowels are always pure.',
        fr: 'For French, pay attention to: nasal vowels (an, en, in, on, un), the r sound (uvular), silent final consonants, and liaison between words.',
        el: 'For Greek, pay attention to: the γ sound (gamma, like a soft g), θ and δ (like English th in "think" and "this"), and stress marked by accent.',
        hi: 'For Hindi, pay attention to: aspirated vs unaspirated consonants (क vs ख), retroflex sounds (ट, ड), and the inherent "a" vowel in consonants.',
        ar: 'For Arabic, pay attention to: emphatic consonants (ص, ض, ط, ظ), the ع (ain) and ح (ha) sounds, and short vs long vowels.',
        ko: 'For Korean, pay attention to: tense vs lax vs aspirated consonants (ㄱ vs ㄲ vs ㅋ), vowel distinctions (ㅓ vs ㅗ), and final consonant sounds (받침).',
        zh: 'For Chinese, pay attention to: the four tones (flat, rising, dipping, falling), retroflex sounds (zh, ch, sh, r), the difference between j/q/x and z/c/s, and aspirated vs unaspirated consonants (b/p, d/t, g/k).',
        ja: 'For Japanese, pay attention to: long vs short vowels (おばさん vs おばあさん), pitch accent patterns, the difference between つ and す, particles は (wa) and を (wo), and double consonants (きっと vs きと).',
      };
      const langSpecific = langSpecificMap[langCode] || `Pay attention to the specific pronunciation features of ${langName}.`;

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
    // Auto-start recording after clearing
    setTimeout(() => toggleRecord(), 100);
  }, [toggleRecord]);

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
