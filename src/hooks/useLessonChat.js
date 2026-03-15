import { useState, useRef, useEffect } from 'react';

export function useLessonChat({ langName, systemPrompt }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyRef = useRef([]); // { role, content }[] — LLM format
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    historyRef.current = [...historyRef.current, userMsg];

    const payload = [
      { role: 'system', content: systemPrompt },
      ...historyRef.current,
    ];

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
    } catch (err) {
      console.error('[LessonChat] error:', err);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, could not reach the AI. Make sure LM Studio is running.' }]);
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setInput('');
    historyRef.current = [];
  };

  return { open, setOpen, messages, input, setInput, loading, send, reset, scrollRef, inputRef };
}
