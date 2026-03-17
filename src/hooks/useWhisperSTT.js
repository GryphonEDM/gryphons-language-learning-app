import { useState, useRef, useCallback } from 'react';

export default function useWhisperSTT({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceFrameRef = useRef(null);
  const hasSpeechRef = useRef(false);

  const cleanupSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silenceFrameRef.current) {
      cancelAnimationFrame(silenceFrameRef.current);
      silenceFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    hasSpeechRef.current = false;
  }, []);

  const startListening = useCallback(async (lang = 'uk') => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Safari uses mp4, Chrome/Firefox use webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupSilenceDetection();
        // Stop all tracks to release the mic
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        chunksRef.current = [];

        if (blob.size === 0) {
          setIsListening(false);
          return;
        }

        setIsListening(false);
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          const ext = mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
          formData.append('audio', blob, `recording.${ext}`);

          const res = await fetch(`/stt?lang=${lang}`, {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `STT request failed (${res.status})`);
          }

          const data = await res.json();
          if (data.text && onTranscript) {
            onTranscript(data.text);
          }
        } catch (err) {
          console.error('[STT] Error:', err);
          setError(err.message);
        } finally {
          setIsTranscribing(false);
        }
      };

      // Set up silence detection via Web Audio API
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        analyserRef.current = analyser;
        hasSpeechRef.current = false;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const SPEECH_THRESHOLD = 25;   // volume level to detect speech
        const SILENCE_DURATION = 1200; // ms of silence after speech to auto-stop

        const checkAudio = () => {
          if (!analyserRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          // Average volume across frequency bins
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          if (avg > SPEECH_THRESHOLD) {
            hasSpeechRef.current = true;
            // Speech detected - clear any pending silence timer
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (hasSpeechRef.current && !silenceTimerRef.current) {
            // Speech was detected before, now it's silent - start countdown
            silenceTimerRef.current = setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
            }, SILENCE_DURATION);
          }

          silenceFrameRef.current = requestAnimationFrame(checkAudio);
        };
        silenceFrameRef.current = requestAnimationFrame(checkAudio);
      } catch (e) {
        // Silence detection is optional - continue without it
        console.warn('[STT] Silence detection unavailable:', e);
      }

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('[STT] Mic access error:', err);
      setError('Microphone access denied');
      setIsListening(false);
    }
  }, [onTranscript, cleanupSilenceDetection]);

  const stopListening = useCallback(() => {
    cleanupSilenceDetection();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [cleanupSilenceDetection]);

  return { isListening, isTranscribing, error, startListening, stopListening };
}
