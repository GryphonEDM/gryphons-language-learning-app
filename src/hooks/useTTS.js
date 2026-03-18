import { useRef, useCallback } from 'react';

/**
 * Custom hook for Text-to-Speech functionality
 * Manages TTS with volume control and playback rate for all languages.
 * Uses a single persistent Audio element to avoid mobile browser
 * restrictions that block new Audio() elements created outside
 * of user gesture context.
 */
export const useTTS = (volume = 0.8, langCode = 'uk') => {
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const playingRef = useRef(false);

  // Reuse a single Audio element so mobile browsers keep it "unlocked"
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const speak = useCallback(async (text, rate = 0.8, customVolume = null) => {
    const audio = getAudio();

    // Stop any currently playing audio
    audio.pause();
    audio.currentTime = 0;

    // Revoke previous object URL to free memory
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    try {
      console.log(`[TTS] Requesting: "${text}"`);
      const response = await fetch('/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: langCode })
      });

      if (!response.ok) {
        console.log('[TTS] Server error:', response.statusText);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = audioUrl;

      // Reuse the same element — just update its src
      audio.src = audioUrl;
      audio.playbackRate = rate;
      audio.volume = customVolume !== null ? customVolume : volume;
      playingRef.current = true;

      // Return a promise that resolves when audio finishes playing
      return new Promise((resolve) => {
        const done = () => {
          playingRef.current = false;
          // Clean up handlers to avoid double-resolve
          audio.onended = null;
          audio.onerror = null;
          resolve();
        };
        audio.onended = done;
        audio.onerror = () => {
          console.log('[TTS] Audio error event');
          done();
        };
        audio.play().then(() => {
          console.log(`[TTS] Playing: "${text}"`);
        }).catch(err => {
          console.log('[TTS] Play error:', err.message);
          done(); // Resolve even on error so the game doesn't hang
        });
      });
    } catch (err) {
      console.log('[TTS] Error:', err.message);
      playingRef.current = false;
    }
  }, [volume, getAudio, langCode]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    playingRef.current = false;
  }, []);

  return {
    speak,
    stop,
    isPlaying: playingRef.current
  };
};
