import { useState, useRef, useEffect, useCallback } from 'react';
import { buildDictionary } from '../utils/dictionaryBuilder.js';
import { lookupUserDict, saveToUserDict, translateWithLLM } from '../utils/userDictionary.js';
import { stopSpeaking } from '../App.jsx';
import useWhisperSTT from './useWhisperSTT.js';

export function useLessonChat({ langName, langCode = 'uk', systemPrompt, onSpeak, ttsEnabled, ttsVolume }) {
  const dict = buildDictionary(langCode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsHighlight, setTtsHighlight] = useState(null); // { msgIdx, wordStart, wordEnd }
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeWord, setActiveWord] = useState(null);
  const [chatSelectedWord, setChatSelectedWord] = useState(null); // { word, translation }
  const [chatAddForm, setChatAddForm] = useState(null); // null | { en, translating }
  const historyRef = useRef([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const ttsSpeakingRef = useRef(false);
  const chatPendingRef = useRef(null);

  // Speech-to-text for mic input — set input and auto-send
  const sendRef = useRef(null);
  const handleMicTranscript = useCallback((text) => {
    setInput(text);
    // Auto-send after a short delay to let state update
    setTimeout(() => { if (sendRef.current) sendRef.current(text); }, 50);
  }, []);
  const stt = useWhisperSTT({ onTranscript: handleMicTranscript });
  const [micLang, setMicLang] = useState(null);
  const toggleMic = useCallback((lang) => {
    if (stt.isListening) {
      stt.stopListening();
      setMicLang(null);
    } else {
      setMicLang(lang);
      stt.startListening(lang);
    }
  }, [stt]);

  const lookupWord = useCallback((word) => {
    const cleaned = word.toLowerCase().replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '');
    if (!cleaned) return null;
    const userHit = lookupUserDict(cleaned);
    if (userHit) return userHit;
    if (dict.targetToEn[cleaned]) return dict.targetToEn[cleaned];
    for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
      if (dict.targetToEn[cleaned.slice(0, i)]) return dict.targetToEn[cleaned.slice(0, i)];
    }
    return null;
  }, [dict]);

  // Word click handler — speaks the word, looks it up, shows panel
  const onWordClick = useCallback((e, token, contextSentence = '') => {
    const cleaned = token.replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '').trim();
    if (!cleaned) return;
    // Stop any ongoing TTS before speaking single word
    if (ttsSpeakingRef.current) {
      ttsSpeakingRef.current = false;
      stopSpeaking();
      setTtsHighlight(null);
      setIsSpeaking(false);
    }
    const lower = cleaned.toLowerCase();
    const translation = lookupWord(cleaned);
    setActiveWord(lower);
    setChatSelectedWord({ word: cleaned, translation, contextSentence });
    setChatAddForm(null);
    if (ttsEnabled && onSpeak) onSpeak(cleaned, 0.8, ttsVolume);

    // Auto-translate with LLM and save to dictionary if no translation found
    if (!translation) {
      const requestId = Date.now();
      chatPendingRef.current = requestId;
      translateWithLLM(cleaned, langName, contextSentence).then(llmTranslation => {
        if (llmTranslation && chatPendingRef.current === requestId) {
          saveToUserDict(cleaned, llmTranslation);
          setChatSelectedWord(prev =>
            prev && prev.word === cleaned
              ? { ...prev, translation: llmTranslation }
              : prev
          );
        }
      });
    }
  }, [lookupWord, ttsEnabled, onSpeak, ttsVolume, langName]);

  const dismissChatWord = useCallback(() => { setChatSelectedWord(null); setChatAddForm(null); setActiveWord(null); }, []);

  const handleChatAddToDict = useCallback(() => {
    if (!chatSelectedWord) return;
    setChatAddForm({ en: '', translating: true });
    translateWithLLM(chatSelectedWord.word, langName, chatSelectedWord.contextSentence || '').then(t =>
      setChatAddForm(prev => prev ? { ...prev, en: t || '', translating: false } : null)
    );
  }, [chatSelectedWord, langName]);

  const handleChatSaveToDict = useCallback((en) => {
    if (!chatSelectedWord || !en.trim()) return;
    saveToUserDict(chatSelectedWord.word, en);
    dismissChatWord();
  }, [chatSelectedWord, dismissChatWord]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const speakWithHighlight = useCallback(async (text, msgIdx, startFromWordIdx = 0) => {
    if (!ttsEnabled || !onSpeak) return;
    // Stop any ongoing TTS first
    ttsSpeakingRef.current = false;
    stopSpeaking();
    await new Promise(r => setTimeout(r, 50));
    ttsSpeakingRef.current = true;
    setIsSpeaking(true);
    // Split on sentence boundaries and commas/semicolons for more responsive stopping
    const chunks = text.split(/(?<=[.!?;,])\s+/);
    let wordOffset = 0;
    for (const chunk of chunks) {
      if (!ttsSpeakingRef.current) break;
      const words = chunk.split(/\s+/).filter(Boolean);
      const chunkEnd = wordOffset + words.length;
      if (chunkEnd <= startFromWordIdx) { wordOffset = chunkEnd; continue; }
      let speakText = chunk;
      let highlightStart = wordOffset;
      if (wordOffset < startFromWordIdx) {
        const skipWords = startFromWordIdx - wordOffset;
        speakText = words.slice(skipWords).join(' ');
        highlightStart = startFromWordIdx;
      }
      setTtsHighlight({ msgIdx, wordStart: highlightStart, wordEnd: chunkEnd });
      try { await onSpeak(speakText, 0.8, ttsVolume); } catch {}
      wordOffset = chunkEnd;
      if (!ttsSpeakingRef.current) break;
    }
    setTtsHighlight(null);
    ttsSpeakingRef.current = false;
    setIsSpeaking(false);
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const send = async (directText) => {
    const text = (directText || input).trim();
    if (!text || loading) return;

    // Cancel any ongoing TTS
    ttsSpeakingRef.current = false;
    setTtsHighlight(null);

    const userMsg = { role: 'user', content: text };
    historyRef.current = [...historyRef.current, userMsg];

    const payload = [
      { role: 'system', content: systemPrompt + ` When including English translations, always put them in parentheses. Only use parentheses for English — never for ${langName} text.` },
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
        body: JSON.stringify({ model: 'local-model', messages: payload, temperature: 0.7, stream: true }),
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

  sendRef.current = send;

  const reset = () => {
    ttsSpeakingRef.current = false;
    setTtsHighlight(null);
    setMessages([]);
    setInput('');
    historyRef.current = [];
  };

  const stopTts = useCallback(() => {
    ttsSpeakingRef.current = false;
    setIsSpeaking(false);
    setTtsHighlight(null);
    stopSpeaking();
  }, []);

  // Stop TTS on unmount
  useEffect(() => {
    return () => {
      ttsSpeakingRef.current = false;
      stopSpeaking();
    };
  }, []);

  return { messages, input, setInput, loading, send, reset, scrollRef, inputRef, ttsHighlight, isSpeaking, speakWithHighlight, stopTts, onWordClick, activeWord, chatSelectedWord, chatAddForm, setChatAddForm, dismissChatWord, handleChatAddToDict, handleChatSaveToDict, stt, toggleMic, micLang, langCode };
}
