import React, { useEffect, useState, useCallback } from 'react';
import useSpeechPractice from '../../hooks/useSpeechPractice.js';
import SpeechPracticeWidget from './SpeechPracticeWidget.jsx';
import { stopSpeaking } from '../../App.jsx';

/**
 * Modal overlay for practicing pronunciation of a single word.
 * Wraps SpeechPracticeWidget in a centered modal above the WordToolbar.
 */
export default function SpeechPracticeModal({ word, langCode, langName, onClose, onSpeak }) {
  const speech = useSpeechPractice({ langCode, langName });
  const [tipsSpeaking, setTipsSpeaking] = useState(false);

  const handleSpeakTips = useCallback(async (text) => {
    if (!onSpeak) return;
    setTipsSpeaking(true);
    try { await onSpeak(text, 1, undefined); } catch {}
    setTipsSpeaking(false);
  }, [onSpeak]);

  const handleStopTips = useCallback(() => {
    stopSpeaking();
    setTipsSpeaking(false);
  }, []);

  useEffect(() => {
    speech.setTarget(word);
  }, [word, speech.setTarget]);

  useEffect(() => {
    return () => { speech.reset(); stopSpeaking(); };
  }, []);

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.close} onClick={onClose}>✕</button>
        <div style={styles.header}>Practice saying:</div>
        <div style={styles.word}>{word}</div>
        {onSpeak && (
          <button style={styles.hearBtn} onClick={() => onSpeak(word, 0.7, undefined)}>
            🔊 Hear it
          </button>
        )}
        <SpeechPracticeWidget
          speech={speech}
          target={word}
          compact
          onSpeakTips={onSpeak ? handleSpeakTips : undefined}
          tipsSpeaking={tipsSpeaking}
          onStopTips={handleStopTips}
        />
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 1100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1101,
    background: 'linear-gradient(145deg, #2a2a4c, #1a1a2e)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '20px',
    padding: '1.5rem',
    minWidth: '300px',
    maxWidth: '400px',
    width: '90vw',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
  },
  close: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '4px 8px',
  },
  header: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.25rem',
    textAlign: 'center',
  },
  word: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: '0.75rem',
  },
  hearBtn: {
    display: 'block',
    margin: '0 auto 1.25rem',
    background: 'rgba(77,171,247,0.12)',
    border: '1px solid rgba(77,171,247,0.3)',
    color: '#4dabf7',
    padding: '0.4rem 1.2rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
};
