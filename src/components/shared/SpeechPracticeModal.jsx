import React, { useEffect } from 'react';
import useSpeechPractice from '../../hooks/useSpeechPractice.js';
import SpeechPracticeWidget from './SpeechPracticeWidget.jsx';

/**
 * Modal overlay for practicing pronunciation of a single word.
 * Wraps SpeechPracticeWidget in a centered modal above the WordToolbar.
 */
export default function SpeechPracticeModal({ word, langCode, langName, onClose, onSpeak }) {
  const speech = useSpeechPractice({ langCode, langName });

  useEffect(() => {
    speech.setTarget(word);
  }, [word, speech.setTarget]);

  useEffect(() => {
    return () => { speech.reset(); };
  }, []);

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.close} onClick={onClose}>✕</button>
        <div style={styles.header}>Practice saying:</div>
        <div style={styles.word}>{word}</div>
        <SpeechPracticeWidget
          speech={speech}
          target={word}
          compact
          onSpeakTips={onSpeak ? (text) => onSpeak(text, 1, undefined) : undefined}
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
    marginBottom: '1.25rem',
  },
};
