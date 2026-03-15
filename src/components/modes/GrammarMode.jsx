import React, { useState, useRef, useEffect } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';

export default function GrammarMode({ langCode = 'uk', grammarLessons, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const [phase, setPhase] = useState('picker'); // picker, lesson, exercise, complete
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(-1);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [totalExercises, setTotalExercises] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [completedSections, setCompletedSections] = useState([]);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatHistoryRef = useRef([]); // LLM-format history { role, content }
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (chatOpen) chatInputRef.current?.focus();
  }, [chatOpen]);

  const currentSection = selectedLesson?.sections[sectionIdx];
  const currentExercise = currentSection?.exercises[exerciseIdx];

  const buildSystemPrompt = () => {
    const lessonName = selectedLesson?.nameEn ?? 'grammar';
    const sectionName = currentSection?.title ?? '';
    return `You are a helpful ${langName} grammar tutor. The student is currently studying "${lessonName}"${sectionName ? ` — specifically the section "${sectionName}"` : ''}. Answer their questions clearly and concisely. Use examples in ${langName} with English translations. Keep responses focused and under 150 words unless a longer explanation is truly needed.`;
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userLLMMsg = { role: 'user', content: text };
    chatHistoryRef.current = [...chatHistoryRef.current, userLLMMsg];

    const newMessages = [
      { role: 'system', content: buildSystemPrompt() },
      ...chatHistoryRef.current,
    ];

    setChatMessages(prev => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: newMessages,
          temperature: 0.7,
          max_tokens: 300,
          stream: true,
        }),
      });
      if (!res.ok) throw new Error(`LLM error ${res.status}`);

      setChatMessages(prev => [...prev, { sender: 'bot', text: '' }]);
      setChatLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              reply += delta;
              setChatMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = { sender: 'bot', text: reply };
                return msgs;
              });
            }
          } catch { /* ignore */ }
        }
      }

      chatHistoryRef.current = [...chatHistoryRef.current, { role: 'assistant', content: reply }];
    } catch (err) {
      console.error('[GrammarChat] error:', err);
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I could not reach the AI. Make sure LM Studio is running.' }]);
      setChatLoading(false);
    }
  };

  const startLesson = (lesson) => {
    setSelectedLesson(lesson);
    setSectionIdx(0);
    setPhase('lesson');
    setScore(0);
    setTotalExercises(0);
    setXpEarned(0);
    setCompletedSections([]);
    setChatMessages([]);
    chatHistoryRef.current = [];
    setChatOpen(false);
  };

  const startExercises = () => {
    setExerciseIdx(0);
    setUserAnswer('');
    setSelectedOption(-1);
    setFeedback(null);
    setPhase('exercise');
  };

  const handleSubmitExercise = () => {
    if (!currentExercise || feedback) return;

    let isCorrect = false;

    if (currentExercise.type === 'fill-blank') {
      isCorrect = currentExercise.acceptedAnswers
        .map(a => a.toLowerCase())
        .includes(userAnswer.trim().toLowerCase());
    } else if (currentExercise.type === 'multiple-choice') {
      isCorrect = selectedOption === currentExercise.correctIndex;
    }

    const points = isCorrect ? 15 : 3;
    setFeedback({ correct: isCorrect, explanation: currentExercise.explanation || '' });
    setTotalExercises(prev => prev + 1);

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);
  };

  const handleNextExercise = () => {
    setFeedback(null);
    setUserAnswer('');
    setSelectedOption(-1);

    if (exerciseIdx < currentSection.exercises.length - 1) {
      setExerciseIdx(prev => prev + 1);
    } else {
      const newCompleted = [...completedSections, currentSection.sectionId];
      setCompletedSections(newCompleted);

      if (sectionIdx < selectedLesson.sections.length - 1) {
        setSectionIdx(prev => prev + 1);
        setPhase('lesson');
      } else {
        setPhase('complete');
        if (onComplete) {
          onComplete({ mode: 'grammar', lessonId: selectedLesson.lessonId, score, totalExercises, xpEarned });
        }
        if (onTrackProgress) {
          onTrackProgress('grammar', { lessonId: selectedLesson.lessonId, completed: true });
        }
      }
    }
  };

  const handleRetry = () => {
    if (selectedLesson) startLesson(selectedLesson);
  };

  // Chat panel (rendered alongside lesson/exercise)
  const ChatPanel = (
    <div style={styles.chatPanel}>
      <div style={styles.chatPanelHeader}>
        <span style={styles.chatPanelTitle}>Ask a Question</span>
        <button style={styles.chatCloseBtn} onClick={() => setChatOpen(false)} title="Close">✕</button>
      </div>
      <div ref={chatEndRef} style={styles.chatMessages}>
        {chatMessages.length === 0 && (
          <div style={styles.chatEmpty}>Ask me anything about this lesson!</div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} style={{ ...styles.chatBubble, ...(msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot) }}>
            {msg.text}
          </div>
        ))}
        {chatLoading && (
          <div style={{ ...styles.chatBubble, ...styles.chatBubbleBot }}>
            <span style={styles.typingDot}>●</span>
            <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}>●</span>
            <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}>●</span>
          </div>
        )}
      </div>
      <div style={styles.chatInputRow}>
        <input
          ref={chatInputRef}
          style={styles.chatInput}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
          placeholder="Ask a question..."
        />
        <button style={styles.chatSendBtn} onClick={sendChatMessage} disabled={chatLoading}>→</button>
      </div>
    </div>
  );

  // Floating "Have a question?" button
  const QuestionBtn = (
    <button style={styles.questionBtn} onClick={() => setChatOpen(o => !o)}>
      💬 Have a question?
    </button>
  );

  // Lesson Picker
  if (phase === 'picker') {
    return (
      <div style={styles.container}>
        <ModeHeader title="Grammar Lessons" subtitle={`Learn ${langName} grammar`} icon="📐" onExit={onExit} />
        <div style={styles.grid}>
          {grammarLessons.map(lesson => (
            <div key={lesson.lessonId} style={styles.lessonCard} onClick={() => startLesson(lesson)}>
              <div style={styles.lessonIcon}>{lesson.icon}</div>
              <div style={styles.lessonInfo}>
                <h3 style={styles.lessonTitle}>{lesson.nameEn}</h3>
                <p style={styles.lessonTitleUk}>{langCode === 'ru' ? lesson.nameRu : lesson.nameUk}</p>
                <p style={styles.lessonMeta}>{lesson.sections.length} sections</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Completion
  if (phase === 'complete') {
    return (
      <div style={styles.container}>
        <CompletionScreen
          stats={{ title: `${selectedLesson.nameEn} Complete!`, score, total: totalExercises, xpEarned, accuracy: totalExercises > 0 ? Math.round((score / totalExercises) * 100) : 0 }}
          onRetry={handleRetry}
          onExit={onExit}
        />
      </div>
    );
  }

  // Lesson explanation view
  if (phase === 'lesson' && currentSection) {
    return (
      <div style={styles.container}>
        <ModeHeader
          title={selectedLesson.nameEn}
          subtitle={`Section ${sectionIdx + 1} of ${selectedLesson.sections.length}`}
          icon={selectedLesson.icon}
          onExit={() => setPhase('picker')}
        />
        <div style={{ ...styles.contentRow, justifyContent: chatOpen ? 'flex-start' : 'center' }}>
          <div style={{ ...styles.sectionCard, flex: chatOpen ? '1 1 0' : 'none', maxWidth: chatOpen ? 'none' : '700px' }}>
            <h3 style={styles.sectionTitle}>{currentSection.title}</h3>
            <p style={styles.explanation}>{currentSection.explanation}</p>

            <div style={styles.examples}>
              <h4 style={styles.examplesTitle}>Examples:</h4>
              {currentSection.examples.map((ex, i) => {
                const nativeText = ex.uk ?? ex.ru ?? '';
                return (
                  <div key={i} style={styles.exampleRow}>
                    <div style={styles.exampleUk}>
                      {nativeText.split(ex.highlight).map((part, j, arr) => (
                        <span key={j}>
                          {part}
                          {j < arr.length - 1 && <span style={styles.highlight}>{ex.highlight}</span>}
                        </span>
                      ))}
                      {ttsEnabled && (
                        <button style={styles.miniSpeak} onClick={() => onSpeak(nativeText, 0.8, ttsVolume)}>🔊</button>
                      )}
                    </div>
                    <div style={styles.exampleEn}>{ex.en}</div>
                  </div>
                );
              })}
            </div>

            <button style={styles.practiceBtn} onClick={startExercises}>
              Practice Exercises →
            </button>
          </div>
          {chatOpen && ChatPanel}
        </div>
        {!chatOpen && QuestionBtn}
      </div>
    );
  }

  // Exercise view
  if (phase === 'exercise' && currentExercise) {
    return (
      <div style={styles.container}>
        <ModeHeader
          title={currentSection.title}
          subtitle={`Exercise ${exerciseIdx + 1} of ${currentSection.exercises.length}`}
          icon={selectedLesson.icon}
          onExit={() => setPhase('lesson')}
        />
        <div style={{ ...styles.contentRow, justifyContent: chatOpen ? 'flex-start' : 'center' }}>
          <div style={{ ...styles.exerciseCard, flex: chatOpen ? '1 1 0' : 'none', maxWidth: chatOpen ? 'none' : '600px' }}>
            <p style={styles.exercisePrompt}>{currentExercise.prompt}</p>

            {currentExercise.type === 'fill-blank' && (
              <div style={styles.fillBlank}>
                <input
                  style={styles.input}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (feedback) handleNextExercise();
                      else handleSubmitExercise();
                    }
                  }}
                  placeholder="Type your answer..."
                  disabled={!!feedback}
                  autoFocus
                />
                {currentExercise.hint && !feedback && (
                  <p style={styles.hint}>Hint: {currentExercise.hint}</p>
                )}
              </div>
            )}

            {currentExercise.type === 'multiple-choice' && (
              <div style={styles.options}>
                {currentExercise.options.map((opt, i) => (
                  <button
                    key={i}
                    style={{
                      ...styles.optionBtn,
                      ...(selectedOption === i ? styles.optionSelected : {}),
                      ...(feedback && i === currentExercise.correctIndex ? styles.optionCorrect : {}),
                      ...(feedback && selectedOption === i && i !== currentExercise.correctIndex ? styles.optionWrong : {})
                    }}
                    onClick={() => !feedback && setSelectedOption(i)}
                    disabled={!!feedback}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {!feedback && (
              <button style={styles.checkBtn} onClick={handleSubmitExercise}>
                Check Answer
              </button>
            )}

            {feedback && (
              <div style={{ ...styles.feedbackBox, borderColor: feedback.correct ? '#4ade80' : '#f87171' }}>
                <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                  {feedback.correct ? 'Correct!' : 'Not quite...'}
                </div>
                {feedback.explanation && (
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>{feedback.explanation}</p>
                )}
                <button style={styles.nextBtn} onClick={handleNextExercise}>
                  Continue →
                </button>
              </div>
            )}
          </div>
          {chatOpen && ChatPanel}
        </div>
        {!chatOpen && QuestionBtn}
      </div>
    );
  }

  return null;
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
  },
  contentRow: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  lessonCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    cursor: 'pointer',
    border: '2px solid rgba(255,215,0,0.2)',
    transition: 'all 0.3s'
  },
  lessonIcon: { fontSize: '2.5rem' },
  lessonInfo: { flex: 1 },
  lessonTitle: { margin: 0, color: '#ffd700', fontSize: '1.2rem' },
  lessonTitleUk: { margin: '0.25rem 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' },
  lessonMeta: { margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' },
  sectionCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.2)',
    width: '100%',
  },
  sectionTitle: { color: '#ffd700', fontSize: '1.4rem', marginBottom: '1rem' },
  explanation: { fontSize: '1.05rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' },
  examples: { marginBottom: '1.5rem' },
  examplesTitle: { color: '#4dabf7', marginBottom: '0.75rem' },
  exampleRow: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem'
  },
  exampleUk: { fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  exampleEn: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' },
  highlight: { color: '#ffd700', fontWeight: '700' },
  miniSpeak: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.2rem'
  },
  practiceBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '1rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  exerciseCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.2)',
    width: '100%',
  },
  exercisePrompt: { fontSize: '1.2rem', marginBottom: '1.5rem', lineHeight: 1.4 },
  fillBlank: { marginBottom: '1rem' },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '1.1rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box'
  },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.5rem', fontStyle: 'italic' },
  options: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' },
  optionBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1.05rem',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  optionSelected: { borderColor: '#ffd700', background: 'rgba(255,215,0,0.1)' },
  optionCorrect: { borderColor: '#4ade80', background: 'rgba(74,222,128,0.15)' },
  optionWrong: { borderColor: '#f87171', background: 'rgba(248,113,113,0.15)' },
  checkBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.75rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  feedbackBox: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1rem',
    borderLeft: '4px solid',
    marginTop: '1rem'
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)',
    border: 'none',
    color: '#fff',
    padding: '0.6rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '0.75rem'
  },
  // Chat panel
  chatPanel: {
    width: '340px',
    flexShrink: 0,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,215,0,0.25)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '70vh',
    minHeight: '400px',
  },
  chatPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  chatPanelTitle: {
    fontWeight: '700',
    fontSize: '1rem',
    color: '#ffd700',
  },
  chatCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
    lineHeight: 1,
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  chatEmpty: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginTop: '1rem',
  },
  chatBubble: {
    padding: '0.6rem 0.9rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    maxWidth: '90%',
    wordBreak: 'break-word',
  },
  chatBubbleUser: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    alignSelf: 'flex-end',
    color: '#fff',
  },
  chatBubbleBot: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    color: 'rgba(255,255,255,0.9)',
  },
  chatInputRow: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  chatInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  chatSendBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    borderRadius: '10px',
    color: '#1a1a2e',
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.5rem 0.9rem',
    cursor: 'pointer',
  },
  typingDot: {
    display: 'inline-block',
    animation: 'pulse 1.2s infinite',
    marginRight: '2px',
    fontSize: '0.7rem',
  },
  // Floating button
  questionBtn: {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    borderRadius: '999px',
    color: '#fff',
    fontWeight: '700',
    fontSize: '0.95rem',
    padding: '0.75rem 1.25rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(77,171,247,0.4)',
    zIndex: 100,
  },
};
