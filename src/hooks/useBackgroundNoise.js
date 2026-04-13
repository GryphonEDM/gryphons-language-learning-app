import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Background Noise Hook — mixes noise with audio playback for
 * perception-in-noise training.
 *
 * Research: Non-native listeners need 4-5 dB more SNR than natives.
 * Training with background noise at adaptive levels closes this gap.
 * HVPT-AAC achieves 10.4% improvement per training hour.
 *
 * Uses Web Audio API to generate and mix noise client-side.
 */

/**
 * Generate a buffer of white noise.
 * @param {AudioContext} ctx
 * @param {number} durationSec
 * @returns {AudioBuffer}
 */
function createWhiteNoise(ctx, durationSec = 10) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Generate pink noise using Voss-McCartney algorithm.
 * @param {AudioContext} ctx
 * @param {number} durationSec
 * @returns {AudioBuffer}
 */
function createPinkNoise(ctx, durationSec = 10) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

/**
 * Convert SNR in dB to a gain ratio.
 * SNR = 20 * log10(signal/noise), so noise = signal * 10^(-SNR/20)
 * @param {number} snrDb
 * @returns {number} Noise gain relative to signal (at gain=1)
 */
function snrToGain(snrDb) {
  return Math.pow(10, -snrDb / 20);
}

export default function useBackgroundNoise() {
  const [enabled, setEnabled] = useState(false);
  const [noiseType, setNoiseType] = useState('pink'); // 'white' | 'pink'
  const [snrDb, setSnrDb] = useState(15); // Start easy
  const [isPlaying, setIsPlaying] = useState(false);

  // Adaptive tracking
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const rollingAccuracyRef = useRef([]);

  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const getOrCreateContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  /**
   * Start playing background noise.
   */
  const start = useCallback(() => {
    if (!enabled) return;
    stop(); // Stop any existing noise

    const ctx = getOrCreateContext();
    const buffer = noiseType === 'white'
      ? createWhiteNoise(ctx, 30)
      : createPinkNoise(ctx, 30);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = snrToGain(snrDb);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    sourceRef.current = source;
    gainRef.current = gain;
    setIsPlaying(true);
  }, [enabled, noiseType, snrDb, getOrCreateContext]);

  /**
   * Stop playing background noise.
   */
  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (gainRef.current) {
      try { gainRef.current.disconnect(); } catch {}
      gainRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  /**
   * Update SNR (adjusts gain in real-time if playing).
   */
  const updateSnr = useCallback((newSnr) => {
    const clamped = Math.max(0, Math.min(20, newSnr));
    setSnrDb(clamped);
    if (gainRef.current) {
      gainRef.current.gain.value = snrToGain(clamped);
    }
  }, []);

  /**
   * Report an accuracy result for adaptive SNR adjustment.
   * @param {boolean} correct
   */
  const reportAccuracy = useCallback((correct) => {
    if (!adaptiveMode) return;

    const window = rollingAccuracyRef.current;
    window.push(correct ? 1 : 0);
    if (window.length > 10) window.shift();

    if (window.length >= 5) {
      const accuracy = window.reduce((a, b) => a + b, 0) / window.length;
      if (accuracy < 0.60) {
        // Too hard — increase SNR by 2dB (make easier)
        updateSnr(snrDb + 2);
      } else if (accuracy > 0.90) {
        // Too easy — decrease SNR by 1dB (make harder)
        updateSnr(snrDb - 1);
      }
    }
  }, [adaptiveMode, snrDb, updateSnr]);

  const toggle = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  // Auto-start/stop when enabled changes
  useEffect(() => {
    if (!enabled && isPlaying) {
      stop();
    }
  }, [enabled, isPlaying, stop]);

  return {
    enabled,
    noiseType,
    snrDb,
    isPlaying,
    adaptiveMode,
    toggle,               // Toggle enabled on/off
    setNoiseType,         // 'white' | 'pink'
    updateSnr,            // Set SNR in dB
    setAdaptiveMode,      // Enable/disable adaptive
    start,                // Start noise playback
    stop,                 // Stop noise playback
    reportAccuracy,       // Report result for adaptive adjustment
  };
}
