import React from 'react';

/**
 * Reusable speech practice UI widget.
 * Renders record button, feedback display, diff, LLM tips, retry.
 * Used in both SpeechMode (full) and FlashcardMode (compact).
 *
 * @param {Object} props
 * @param {Object} props.speech - return value of useSpeechPractice hook
 * @param {string} [props.target] - target word/phrase (for display in expected)
 * @param {boolean} [props.compact] - smaller sizing for embed in flashcards
 * @param {boolean} [props.showRetryNext] - show retry/next buttons (SpeechMode only)
 * @param {Function} [props.onRetry] - retry callback
 * @param {Function} [props.onNext] - next callback
 * @param {string} [props.nextLabel] - label for next button
 */
export default function SpeechPracticeWidget({ speech, target, compact = false, showRetryNext = false, onRetry, onNext, nextLabel = 'Next', onSpeakTips }) {
  const s = compact ? compactStyles : fullStyles;
  const diffColors = { correct: '#4ade80', wrong: '#f87171', missing: '#fbbf24', extra: '#f87171' };
  const matchColors = { correct: '#4ade80', close: '#fbbf24', miss: '#f87171' };
  const matchLabels = { correct: 'Correct!', close: 'Almost there!', miss: 'Try again' };

  return (
    <div style={s.container} onClick={e => e.stopPropagation()}>
      {/* Record button */}
      <div style={s.recordSection}>
        <button
          style={{
            ...s.recordBtn,
            ...(speech.isListening ? s.recordBtnActive : {}),
            transform: speech.isListening ? `scale(${speech.pulseScale})` : 'scale(1)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
          onClick={speech.toggleRecord}
          disabled={speech.isTranscribing}
        >
          {speech.isTranscribing ? (
            <span style={s.recordIcon}>⏳</span>
          ) : speech.isListening ? (
            <span style={s.recordIcon}>⏹️</span>
          ) : (
            <span style={s.recordIcon}>🎤</span>
          )}
        </button>
        <div style={s.recordLabel}>
          {speech.isTranscribing ? 'Processing...' : speech.isListening ? 'Tap to stop' : 'Tap to speak'}
        </div>
      </div>

      {speech.error && (
        <div style={s.errorMsg}>
          {speech.error === 'Microphone access denied'
            ? 'Microphone access required. Please allow and try again.'
            : speech.error}
        </div>
      )}

      {/* Feedback */}
      {speech.feedback && (
        <div style={s.feedbackArea}>
          <div style={{ ...s.feedbackHeader, color: matchColors[speech.feedback.match] }}>
            {matchLabels[speech.feedback.match]}
            <span style={s.simBadge}>{speech.feedback.similarity}% match</span>
          </div>

          {/* Visual diff */}
          <div style={s.diffSection}>
            <div style={s.diffLabel}>You said:</div>
            <div style={s.diffDisplay}>
              {speech.feedback.diff.map((d, i) => (
                <span key={i} style={{
                  color: diffColors[d.type],
                  fontWeight: '700',
                  fontSize: compact ? '1.1rem' : '1.3rem',
                  textDecoration: d.type === 'extra' ? 'line-through' : 'none',
                }}>
                  {d.char}
                </span>
              ))}
            </div>
            {speech.feedback.match !== 'correct' && target && (
              <div style={s.expectedLabel}>
                Expected: <strong>{target}</strong>
              </div>
            )}
          </div>

          {/* LLM tips */}
          {!speech.llmFeedback && !speech.llmLoading && (
            <button style={s.tipsBtn} onClick={speech.getTips}>
              💡 Get pronunciation tips
            </button>
          )}
          {speech.llmLoading && (
            <div style={s.tipsLoading}>Analyzing your pronunciation...</div>
          )}
          {speech.llmFeedback && (
            <div style={s.tipsBox}>
              <div style={s.tipsHeader}>
                💡 Pronunciation Coach
                {onSpeakTips && (
                  <button
                    style={s.speakTipsBtn}
                    onClick={() => onSpeakTips(speech.llmFeedback)}
                    title="Listen to tips"
                  >
                    🔊
                  </button>
                )}
              </div>
              <div style={s.tipsText}>{speech.llmFeedback}</div>
            </div>
          )}

          {/* Action buttons */}
          {showRetryNext && (
            <div style={s.actionRow}>
              <button style={s.retryBtn} onClick={onRetry}>
                🔄 Retry
              </button>
              <button style={s.nextBtn} onClick={onNext}>
                {nextLabel}
              </button>
            </div>
          )}
          {!showRetryNext && (
            <div style={s.actionRow}>
              <button style={s.retryBtn} onClick={speech.retry}>
                🔄 Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const sharedStyles = {
  recordSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  recordBtnActive: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    boxShadow: '0 0 20px rgba(239,68,68,0.5)',
  },
  errorMsg: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    color: '#fca5a5',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  feedbackHeader: {
    fontSize: '1.2rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  simBadge: {
    fontSize: '0.85rem',
    background: 'rgba(255,255,255,0.1)',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  diffSection: { marginBottom: '0.75rem' },
  diffLabel: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '0.25rem',
  },
  diffDisplay: {
    fontFamily: 'monospace',
    letterSpacing: '1px',
    lineHeight: '1.6',
  },
  expectedLabel: {
    marginTop: '0.5rem',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
  },
  tipsLoading: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '0.5rem',
  },
  tipsBox: {
    background: 'rgba(255,215,0,0.08)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginTop: '0.5rem',
  },
  tipsHeader: {
    fontWeight: '700',
    color: '#ffd700',
    marginBottom: '0.5rem',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  speakTipsBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.1rem 0.3rem',
    borderRadius: '6px',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  tipsText: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: '1.5',
    fontSize: '0.9rem',
  },
  actionRow: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    marginTop: '0.75rem',
  },
};

const fullStyles = {
  ...sharedStyles,
  container: { },
  recordBtn: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '3px solid rgba(255,215,0,0.4)',
    background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  recordIcon: { fontSize: '2rem' },
  recordLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
  },
  feedbackArea: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '16px',
    padding: '1.25rem',
    marginTop: '1rem',
  },
  tipsBtn: {
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '10px',
    padding: '0.6rem 1rem',
    color: '#ffd700',
    cursor: 'pointer',
    fontSize: '0.9rem',
    width: '100%',
    textAlign: 'center',
  },
  retryBtn: {
    flex: 1,
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  nextBtn: {
    flex: 1,
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
    color: '#1a1a2e',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
};

const compactStyles = {
  ...sharedStyles,
  container: {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: '16px',
    padding: '1rem',
    marginTop: '0.75rem',
    border: '1px solid rgba(255,215,0,0.15)',
  },
  recordBtn: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '2px solid rgba(255,215,0,0.4)',
    background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  recordIcon: { fontSize: '1.5rem' },
  recordLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
  },
  feedbackArea: {
    marginTop: '0.75rem',
  },
  tipsBtn: {
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    color: '#ffd700',
    cursor: 'pointer',
    fontSize: '0.85rem',
    width: '100%',
    textAlign: 'center',
  },
  retryBtn: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  nextBtn: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
    color: '#1a1a2e',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
};
