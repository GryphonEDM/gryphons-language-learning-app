import React, { useState } from 'react';
import SpeechPracticeModal from './SpeechPracticeModal.jsx';

/**
 * Always-visible inline chat panel for learning modes.
 * Place alongside main content in a flex row.
 * Pass the result of useLessonChat() as props.
 */
export default function LessonChat({ messages, input, setInput, loading, send, scrollRef, inputRef, onWordClick, activeWord, ttsHighlight, isSpeaking, speakWithHighlight, stopTts, chatSelectedWord, chatAddForm, setChatAddForm, dismissChatWord, handleChatAddToDict, handleChatSaveToDict, stt, toggleMic, micLang, langCode, onSpeak }) {
  const targetLabel = langCode === 'ru' ? 'RU' : langCode === 'uk' ? 'UA' : 'EN';
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const [showPractice, setShowPractice] = useState(null); // null or word string
  return (
    <div className="lesson-chat-panel" style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>💬 Ask a Question</span>
        {isSpeaking && stopTts && (
          <button style={styles.headerStopBtn} onClick={stopTts} title="Stop TTS">⏹</button>
        )}
      </div>

      <div ref={scrollRef} style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>Ask me anything about this exercise!</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.bubble, ...(msg.sender === 'user' ? styles.userBubble : styles.botBubble) }}>
            {msg.sender === 'bot'
              ? (() => {
                  let wordCount = 0;
                  return msg.text.split(/(\s+)/).map((token, j) => {
                    if (/^\s+$/.test(token)) return token;
                    const myWordIdx = wordCount++;
                    const isHighlighted = ttsHighlight?.msgIdx === i &&
                      myWordIdx >= ttsHighlight.wordStart && myWordIdx < ttsHighlight.wordEnd;
                    const cleaned = token.replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '').toLowerCase();
                    const isActive = onWordClick && activeWord === cleaned;
                    return (
                      <span
                        key={j}
                        onClick={onWordClick ? (e) => onWordClick(e, token, msg.text) : undefined}
                        style={{
                          cursor: onWordClick ? 'pointer' : 'default',
                          borderRadius: '3px',
                          padding: '0 1px',
                          background: isHighlighted
                            ? 'rgba(77,171,247,0.3)'
                            : isActive
                            ? 'rgba(255,215,0,0.25)'
                            : 'transparent',
                          color: isHighlighted ? '#4dabf7' : 'inherit',
                          transition: 'background 0.15s',
                        }}
                      >{token}</span>
                    );
                  });
                })()
              : msg.text}
            {msg.sender === 'bot' && speakWithHighlight && (
              <>
                <button
                  style={styles.speakBtn}
                  onClick={() => speakWithHighlight(msg.text, i)}
                  title="Listen"
                >🔊</button>
                {isSpeaking && ttsHighlight?.msgIdx === i && (
                  <button style={styles.stopBtn} onClick={stopTts} title="Stop">⏹</button>
                )}
              </>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.botBubble }}>
            <span style={styles.dot}>●</span>
            <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
            <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
          </div>
        )}
      </div>

      {/* Word info panel — shown when a word is clicked in chat */}
      {chatSelectedWord && (
        <div style={styles.wordPanel}>
          <div style={styles.wordPanelTop}>
            <span style={styles.wordPanelWord}>{chatSelectedWord.word}</span>
            <button style={styles.wordPanelClose} onClick={dismissChatWord}>✕</button>
          </div>
          {chatSelectedWord.translation ? (
            <>
              <div style={styles.wordPanelTranslation}>= "{chatSelectedWord.translation}"</div>
              <button style={styles.wordPanelPracticeBtn} onClick={() => setShowPractice(chatSelectedWord.word)}>🎤 Practice</button>
            </>
          ) : !chatAddForm ? (
            <>
              <div style={styles.wordPanelNoResult}>No translation found</div>
              <div style={styles.wordPanelActions}>
                {handleChatAddToDict && (
                  <button style={styles.wordPanelAddBtn} onClick={handleChatAddToDict}>+ Add to dictionary</button>
                )}
                <button style={styles.wordPanelPracticeBtn} onClick={() => setShowPractice(chatSelectedWord.word)}>🎤 Practice</button>
              </div>
            </>
          ) : (
            <div style={styles.addForm}>
              <div style={styles.addLabel}>
                English meaning
                {chatAddForm.translating && <span style={styles.translatingHint}> translating…</span>}
              </div>
              <input
                style={{ ...styles.addInput, ...(chatAddForm.translating ? { opacity: 0.5 } : {}) }}
                value={chatAddForm.en}
                onChange={e => setChatAddForm(prev => ({ ...prev, en: e.target.value }))}
                placeholder={chatAddForm.translating ? 'Getting translation…' : 'Enter translation...'}
                disabled={chatAddForm.translating}
                autoFocus={!chatAddForm.translating}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleChatSaveToDict(chatAddForm.en);
                  if (e.key === 'Escape') setChatAddForm(null);
                }}
              />
              <div style={styles.addActions}>
                <button style={styles.cancelBtn} onClick={() => setChatAddForm(null)}>Cancel</button>
                <button
                  style={styles.saveBtn}
                  disabled={chatAddForm.translating || !chatAddForm.en.trim()}
                  onClick={() => handleChatSaveToDict(chatAddForm.en)}
                >Save</button>
              </div>
            </div>
          )}
        </div>
      )}

      {stt?.isTranscribing && (
        <div style={styles.transcribingBar}>Transcribing...</div>
      )}
      <div style={styles.inputArea}>
        <input
          ref={inputRef}
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask a question..."
        />
        <div style={styles.inputButtons}>
          {toggleMic && (
            <>
              <button
                style={{ ...styles.micBtn, ...(stt?.isListening && micLang === 'en' ? styles.micBtnActive : {}), ...(stt?.isTranscribing ? styles.micBtnTranscribing : {}) }}
                onClick={() => toggleMic('en')}
                disabled={stt?.isTranscribing || (stt?.isListening && micLang !== 'en')}
                title="Speak in English"
              >🎤 EN</button>
              <button
                style={{ ...styles.micBtn, ...(stt?.isListening && micLang === langCode ? styles.micBtnActive : {}), ...(stt?.isTranscribing ? styles.micBtnTranscribing : {}) }}
                onClick={() => toggleMic(langCode)}
                disabled={stt?.isTranscribing || (stt?.isListening && micLang !== langCode)}
                title={`Speak in ${targetLabel}`}
              >🎤 {targetLabel}</button>
            </>
          )}
          <button style={styles.sendBtn} onClick={send} disabled={loading}>→</button>
        </div>
      </div>

      {showPractice && (
        <SpeechPracticeModal
          word={showPractice}
          langCode={langCode}
          langName={langName}
          onClose={() => setShowPractice(null)}
          onSpeak={onSpeak}
        />
      )}

      <style>{`
        @keyframes lessonDotPulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  panel: {
    width: '340px',
    flexShrink: 0,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,215,0,0.25)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '70vh',
    minHeight: '300px',
    position: 'sticky',
    top: '1rem',
  },
  header: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerStopBtn: {
    background: 'rgba(255,80,80,0.15)',
    border: '1px solid rgba(255,80,80,0.35)',
    borderRadius: '8px',
    color: '#f87171',
    padding: '0.25rem 0.6rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
  },
  title: {
    fontWeight: '700',
    fontSize: '1rem',
    color: '#ffd700',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  empty: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginTop: '1rem',
  },
  bubble: {
    padding: '0.6rem 0.9rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    maxWidth: '90%',
    wordBreak: 'break-word',
  },
  userBubble: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    alignSelf: 'flex-end',
    color: '#fff',
  },
  botBubble: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    color: 'rgba(255,255,255,0.9)',
  },
  speakBtn: {
    display: 'inline-block',
    marginTop: '0.3rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    opacity: 0.45,
    padding: 0,
    color: '#fff',
    marginRight: '0.3rem',
  },
  stopBtn: {
    display: 'inline-block',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    opacity: 0.45,
    padding: 0,
    color: '#ff6b6b',
  },
  wordPanel: {
    margin: '0 0.5rem 0.5rem',
    background: 'rgba(77,171,247,0.1)',
    border: '1px solid rgba(77,171,247,0.25)',
    borderRadius: '10px',
    padding: '0.6rem 0.8rem',
    flexShrink: 0,
  },
  wordPanelTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.2rem',
  },
  wordPanelWord: {
    fontWeight: '700',
    color: '#ffd700',
    fontSize: '1rem',
  },
  wordPanelClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '2px',
  },
  wordPanelTranslation: {
    fontSize: '0.88rem',
    color: '#4dabf7',
    fontStyle: 'italic',
  },
  wordPanelNoResult: {
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    marginBottom: '0.3rem',
  },
  wordPanelActions: {
    display: 'flex',
    gap: '0.3rem',
    flexWrap: 'wrap',
    marginTop: '0.2rem',
  },
  wordPanelAddBtn: {
    background: 'rgba(255,215,0,0.12)',
    border: '1px solid rgba(255,215,0,0.3)',
    color: '#ffd700',
    padding: '0.25rem 0.6rem',
    borderRadius: '15px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  wordPanelPracticeBtn: {
    background: 'rgba(77,171,247,0.12)',
    border: '1px solid rgba(77,171,247,0.3)',
    color: '#4dabf7',
    padding: '0.25rem 0.6rem',
    borderRadius: '15px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    marginTop: '0.3rem',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  addLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
  },
  translatingHint: {
    color: '#4dabf7',
    fontStyle: 'italic',
  },
  addInput: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: '#fff',
    padding: '0.35rem 0.5rem',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  addActions: {
    display: 'flex',
    gap: '0.3rem',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.5)',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontFamily: 'inherit',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    borderRadius: '6px',
    color: '#1a1a2e',
    padding: '0.25rem 0.6rem',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: '700',
    fontFamily: 'inherit',
  },
  inputArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    padding: '0.6rem 0.75rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  inputButtons: {
    display: 'flex',
    gap: '0.35rem',
    justifyContent: 'flex-end',
  },
  micBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '0.35rem 0.5rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#fff',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  micBtnActive: {
    background: 'rgba(255,80,80,0.3)',
    borderColor: '#f87171',
    animation: 'lessonDotPulse 1.5s infinite',
  },
  micBtnTranscribing: {
    opacity: 0.4,
    cursor: 'wait',
  },
  transcribingBar: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    padding: '0.2rem 0.75rem',
    fontStyle: 'italic',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    borderRadius: '10px',
    color: '#1a1a2e',
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.5rem 0.9rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  dot: {
    display: 'inline-block',
    animation: 'lessonDotPulse 1.2s infinite',
    marginRight: '2px',
    fontSize: '0.7rem',
  },
};
