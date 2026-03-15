import { useState, useRef, useCallback } from 'react';

export default function useWhisperSTT({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

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

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('[STT] Mic access error:', err);
      setError('Microphone access denied');
      setIsListening(false);
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { isListening, isTranscribing, error, startListening, stopListening };
}
