import { useState, useRef, useEffect, useCallback } from 'react';

export function useLessonChat({ langName, systemPrompt, onSpeak, ttsEnabled, ttsVolume }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsHighlight, setTtsHighlight] = useState(null); // { msgIdx, wordStart, wordEnd }
  const historyRef = useRef([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const ttsSpeakingRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const speakWithHighlight = useCallback(async (text, msgIdx) => {
    if (!ttsEnabled || !onSpeak) return;
    ttsSpeakingRef.current = true;
    const sentences = text.split(/(?<=[.!?])\s+/);
    let wordOffset = 0;
    for (const sentence of sentences) {
      if (!ttsSpeakingRef.current) break;
      const words = sentence.split(/\s+/).filter(Boolean);
      setTtsHighlight({ msgIdx, wordStart: wordOffset, wordEnd: wordOffset + words.length });
      try { await onSpeak(sentence, 0.8, ttsVolume); } catch {}
      wordOffset += words.length;
      if (!ttsSpeakingRef.current) break;
    }
    setTtsHighlight(null);
    ttsSpeakingRef.current = false;
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Cancel any ongoing TTS
    ttsSpeakingRef.current = false;
    setTtsHighlight(null);

    const userMsg = { role: 'user', content: text };
    historyRef.current = [...historyRef.current, userMsg];

    const payload = [
      { role: 'system', content: systemPrompt },
      ...historyRef.current,
    ];

    // user will be at messages.length, bot at messages.length + 1
    const botMsgIdx = messages.length + 1;
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: payload, temperature: 0.7, max_tokens: 300, stream: true }),
      });
      if (!res.ok) throw new Error(`LLM error ${res.status}`);

      setMessages(prev => [...prev, { sender: 'bot', text: '' }]);
      setLoading(false);

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
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) {
              reply += delta;
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = { sender: 'bot', text: reply };
                return msgs;
              });
            }
          } catch { /* ignore */ }
        }
      }

      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
      speakWithHighlight(reply, botMsgIdx);
    } catch (err) {
      console.error('[LessonChat] error:', err);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, could not reach the AI. Make sure LM Studio is running.' }]);
      setLoading(false);
    }
  };

  const reset = () => {
    ttsSpeakingRef.current = false;
    setTtsHighlight(null);
    setMessages([]);
    setInput('');
    historyRef.current = [];
  };

  return { messages, input, setInput, loading, send, reset, scrollRef, inputRef, ttsHighlight, speakWithHighlight };
}
