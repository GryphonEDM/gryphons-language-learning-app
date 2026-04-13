# SLA Research-Driven App Enhancement Plan

## Context

Deep research into Second Language Acquisition science, cognitive psychology, and phonology revealed 20 evidence-based features that would transform this app from a good language learning tool into a comprehensive fluency engine. The research shows that most apps optimize for engagement over acquisition — our goal is to optimize for actual learning outcomes based on what the science says works.

The features are organized into 4 tiers by research-backed impact, with a dependency graph that determines implementation order.

---

## Implementation Order (respects dependencies)

```
Phase 1: Foundation (Tier 1 core)
  1. Self-Correction Prompting (Feature 2) — foundation for all typed-input improvements
  2. Sentence-Level Dictation (Feature 1) — creates sentenceDiff utility reused by others
  3. Production-First Flashcards (Feature 5) — transforms flashcards, uses self-correction

Phase 2: Smart Sessions (Tier 1 orchestration + Tier 4 quick wins)
  4. Interleaved Sessions (Feature 4) — creates interleaver utility
  5. Time-of-Day Optimization (Feature 16) — small scope, touches only dailySession.js
  6. Success Rate Calibration (Feature 18) — foundational utility, benefits all modes
  7. Cross-Mode SRS Reviews (Feature 3) — ties phases 1-2 together in daily review

Phase 3: Phonology & Listening (Tier 2 + Tier 3 audio)
  8. HVPT Enhancements to MinimalPairs (Feature 7) — self-contained enhancement
  9. Background Noise Training (Feature 13) — self-contained audio hook
  10. Prosody/Intonation Training (Feature 6) — new mode, needs prosody data
  11. Connected Speech Training (Feature 12) — needs new data file

Phase 4: Deep Processing (Tier 2 vocabulary depth)
  12. Context-Varied Vocabulary (Feature 9) — small, quick win
  13. Chunk/Collocation Teaching (Feature 8) — new data + multi-mode integration
  14. "Use It in a Sentence" Mode (Feature 10) — AI-validated deep processing

Phase 5: Advanced Modes (Tier 3 new modes)
  15. Bidirectional Translation (Feature 15) — new mode, uses existing data
  16. Narrow Listening (Feature 14) — needs server-side voice routing
  17. Shadowing Mode (Feature 11) — most complex audio synchronization

Phase 6: Intelligence Layer (Tier 4 remaining)
  18. Interference Detection (Feature 19) — builds on existing struggle engine
  19. Functional Load Weighting (Feature 17) — data-dependent, incremental
  20. Graded Reading (Feature 20) — builds on StoryMode, needs mature vocab data
```

---

## Phase 1: Foundation

### Feature 2: Self-Correction Prompting

**Why:** Research shows prompts forcing self-correction (d=0.81) dramatically outperform just showing the answer (d=0.70). This is the single highest-impact change to error handling.

**Create:**
- `src/hooks/useSelfCorrection.js` — reusable hook encapsulating retry logic

**Modify:**
- `src/components/modes/ListeningMode.jsx`
- `src/components/modes/TranslationPracticeMode.jsx`
- `src/components/modes/DailyReviewMode.jsx` (exercise phase)
- `src/components/modes/StruggleDrillMode.jsx`
- `src/utils/srs.js` — extend `mapCorrectToRating` to handle `attemptsBeforeCorrect`

**Hook API:**
```js
useSelfCorrection({ maxAttempts: 3 })
// Returns: { attempt, isRevealed, feedback, handleAttempt(input, checkFn), reset }
```

**Flow:**
- Attempt 1 wrong → "Not quite — try again!" + clear input
- Attempt 2 wrong → auto-escalate hint (first letter, phonetic, etc.) + clear input
- Attempt 3 wrong OR correct at any point → reveal answer, proceed
- `onTrackProgress` called only once at resolution with `{ selfCorrected: bool, attemptsBeforeCorrect: num }`

**SRS mapping update in `mapCorrectToRating`:**
- correct + attempt 1 + fast → 'easy'
- correct + attempt 1 → 'good'
- correct + attempt 2-3 (self-corrected) → 'hard'
- wrong after 3 attempts → 'again'

**Hint generation per mode:**
- ListeningMode: auto-replay slower on retry 1; show first letter on retry 2
- TranslationPracticeMode: reuse existing hint system but auto-escalate
- DailyReviewMode: show word length on retry 1, first+last letter on retry 2

---

### Feature 1: Sentence-Level Dictation

**Why:** Connected speech is the #1 reason learners can read but not understand spoken language. Single-word dictation misses linking, reduction, assimilation entirely.

**Create:**
- `src/utils/sentenceDiff.js` — word-level diff algorithm (reused by Features 8, 15)

**Modify:**
- `src/components/modes/ListeningMode.jsx` — add dictation level selector and sentence support

**Implementation:**
1. Add "Level" selector after category/CEFR picker: "Words" (current) | "Phrases" (2-3 words) | "Sentences" (full)
2. Sentences sourced from `src/data/sentences.json` (has en, uk, words, difficulty fields), filtered by CEFR
3. Phrases: slice sentences or combine 2-3 vocabulary words from same category
4. Word-level diff in `sentenceDiff.js`: tokenize both strings → edit distance on word arrays → return `[{ word, type: 'correct'|'wrong'|'missing'|'extra', expected? }]`
5. Feedback: word-by-word color coding (green/red/yellow/strikethrough)
6. `onTrackProgress` called per individual word in the sentence with `context: 'sentence'`
7. Punctuation stripped before comparison; case-insensitive

**Data gap:** `sentences.json` only has ~15 entries, all Ukrainian. Need to expand for other languages or generate with AI.

---

### Feature 5: Production-First Flashcards

**Why:** Current flashcards are recognition (flip to see answer). Research shows generation effect provides 20-40% better retention. Typing IS generation.

**Modify:**
- `src/components/modes/FlashcardMode.jsx` — major restructure of card interaction

**Implementation:**
1. Add mode toggle: "Production Mode" (default) vs "Recognition Mode" (legacy)
2. Production flow: show English → text input → Check → self-correction (Feature 2) → show card details + TTS
3. Handle multi-answer words (split on `/` like TranslationPracticeMode does)
4. SRS rating derived automatically from correctness + response time + self-correction attempts
5. Remove "Know it" / "Review Again" binary in production mode — let SRS handle scheduling
6. `onTrackProgress` changes from `{ mastered: bool }` to `{ correct: bool, userAnswer, expected, responseMs }`
7. Keep Recognition Mode accessible with note: "Production mode recommended for stronger learning"

---

## Phase 2: Smart Sessions

### Feature 4: Interleaved Sessions

**Why:** Interleaving produces 63% accuracy on delayed tests vs 20% for blocked practice. Most impactful change to session structure.

**Create:**
- `src/utils/interleaver.js` — interleaving algorithm

**Modify:**
- `src/components/modes/ListeningMode.jsx` — add "Smart Mix" option
- `src/components/modes/TranslationPracticeMode.jsx` — same
- `src/components/modes/FlashcardMode.jsx` — synthetic "Smart Mix" vocabulary set

**Algorithm (`buildInterleavedSession`):**
- Pull from 3-5 different categories
- Mix difficulty: ~40% current level, ~30% below (consolidation), ~30% above (stretch)
- Prioritize words not seen recently + include 2-3 struggle words
- Post-process: no two same-category adjacent, no two same-difficulty adjacent
- Similar-sounding words spaced ≥3 apart

---

### Feature 16: Time-of-Day Optimization

**Why:** Sleep consolidation research shows new vocabulary before bed consolidates better; morning reviews leverage overnight consolidation.

**Modify:**
- `src/utils/dailySession.js` — dynamic MAX_REVIEWS/MAX_NEW_CARDS based on hour
- `src/components/modes/DailyReviewMode.jsx` — informational banner

**Profiles:**
- Morning (<12): maxNew=2, maxReview=25 ("Morning Review Focus")
- Afternoon (12-19): maxNew=5, maxReview=20 ("Balanced Practice")
- Evening (19+): maxNew=8, maxReview=10 ("New Vocabulary Focus")

Informational only — user can always override via manual mode selection.

---

### Feature 18: Success Rate Calibration

**Why:** Zone of proximal learning = 70-85% accuracy. Below 60% = frustration. Above 90% = not learning.

**Create:**
- `src/utils/calibration.js` — rolling accuracy tracking + adjustment computation

**Modify:**
- `src/App.jsx` — add `sessionCalibration` state, update on every `handleTrackProgress`
- ListeningMode, TranslationPracticeMode, FlashcardMode, MinimalPairsMode — consume adjustments
- `src/utils/dailySession.js` — use calibration to adjust new card count

**Adjustment levers:**
- CEFR filter shift (-1/+1)
- Batch size multiplier (0.5-1.5)
- Hint availability toggle
- Playback rate adjustment
- New card count in daily review

**Anti-oscillation:** Lock adjustments for 10 items after each change. Visual indicator (green/yellow/red) in mode header.

---

### Feature 3: Cross-Mode SRS Reviews

**Why:** Transfer-appropriate processing: practice must match use case. A word reviewed only as flashcards is retrievable only in flashcard-like contexts.

**Create:**
- `src/utils/modeSelector.js` — picks optimal review mode per word

**Modify:**
- `src/utils/dailySession.js` — assign `reviewMode` per card
- `src/components/modes/DailyReviewMode.jsx` — render different exercise types per card

**Mode selection logic (`selectReviewMode`):**
- Listening errors dominant + TTS → 'listening'
- Confusion errors dominant + TTS → 'minimal-pairs' (if pair data exists)
- Spelling errors dominant → 'typing' (EN→target translation)
- Meaning errors dominant → 'translation' (target→EN)
- Default: least-recently-used mode from `wordData.lastModeTested`

**Data:** Add `lastModeTested: { [mode]: timestamp }` to vocabularyMastery entries.

**Session restructure:** Remove single exercise phase at end. Review phase now renders mode-specific UI per card (flashcard, listening input, translation input, minimal-pairs choice). Shuffle after mode assignment to interleave mode types.

---

## Phase 3: Phonology & Listening

### Feature 7: HVPT Enhancements to MinimalPairs

**Modify:**
- `src/components/modes/MinimalPairsMode.jsx`
- `src/data/minimalPairs.js` — add difficulty ratings per pair

**Create:**
- `src/utils/hvpt.js` — adaptive difficulty algorithm

**Enhancements:**
1. **Multi-voice:** Cycle 2-3 TTS voices per pair (add `voice` param to `onSpeak`)
2. **Adaptive difficulty:** Track per-contrast accuracy; retire >85% categories, increase <60% frequency
3. **Phonetic context:** Add position variants per pair (initial/medial/final)
4. **Data:** Add `minimalPairAccuracy: { [category]: { correct, total } }` to vocabularyMastery

---

### Feature 13: Background Noise Training

**Create:**
- `src/hooks/useBackgroundNoise.js` — Web Audio API noise mixing
- `src/data/noiseProfiles.js` — noise type definitions

**Modify:**
- `src/components/modes/ListeningMode.jsx` — noise toggle + SNR slider
- `src/components/modes/MinimalPairsMode.jsx` — same
- `src/hooks/useTTS.js` — expose AudioContext for mixing

**Implementation:** Client-side Web Audio API mixing. White/pink noise generated programmatically. Babble noise from layered TTS of random sentences. Adaptive SNR: accuracy <60% → +2dB, >90% → -1dB. Unlocks after >70% accuracy in quiet mode.

---

### Feature 6: Prosody/Intonation Training

**Create:**
- `src/components/modes/ProsodyMode.jsx` — new mode
- `src/data/prosody/` — per-language prosody exercises (start with `uk.json`)

**Modify:**
- `src/App.jsx` — register mode

**Exercise types:**
1. Stress identification: play sentence → tap stressed syllable
2. Question vs statement: same words, different intonation → identify which
3. Emphasis matching: pick which word was emphasized

TTS naturally produces different intonation for `?` vs `.` — use this for question/statement exercises. Track in `modeProgress['prosody']` (sentence-level, not word-level SRS).

---

### Feature 12: Connected Speech Training

**Create:**
- `src/components/modes/ConnectedSpeechMode.jsx` — new mode
- `src/data/connectedSpeech.js` — phenomena + examples per language

**Modify:**
- `src/App.jsx` — register mode

**Exercise types:**
1. Two-playback contrast: word-by-word TTS at 0.6x, then full phrase at 1.0x
2. Dictation: hear connected speech → type what you hear
3. Phenomenon identification: what happened? (linking/reduction/elision)

Needs curated data per language (start with 10-15 Ukrainian examples across 3-4 phenomena).

---

## Phase 4: Deep Processing

### Feature 9: Context-Varied Vocabulary

**Create:**
- `src/utils/exampleRotator.js` — tracks/rotates shown examples per word

**Modify:**
- `src/components/modes/DailyReviewMode.jsx` — varied examples in card display
- `src/components/modes/FlashcardMode.jsx` — rotate examples

**Data:** Add `examplesShown: number[]` to vocabularyMastery. Existing vocabulary data already has multiple examples per word. Rotator picks unseen examples, resets when exhausted.

---

### Feature 8: Chunk/Collocation Teaching

**Create:**
- `src/data/chunks/` — collocation data per language (~50-100 per language)
- `src/utils/chunkManager.js` — load, lookup, integrate chunks

**Modify:**
- `src/App.jsx` — handle `chunk:` prefixed keys in vocabularyMastery
- `src/utils/dailySession.js` — include chunks in review selection (max 3-5/session)
- FlashcardMode, TranslationPracticeMode, ListeningMode — render chunks properly

**Key:** Chunks stored as `vocabularyMastery["chunk:Як справи?"]` with `isChunk: true`. Component words tracked independently — getting a chunk right doesn't count as reviewing its individual words.

---

### Feature 10: "Use It in a Sentence" Mode

**Create:**
- `src/components/modes/SentenceProductionMode.jsx` — new mode

**Modify:**
- `src/App.jsx` — register mode
- `src/utils/modeSelector.js` — add as review mode option for high-stability words

**Flow:** Show target word + meaning → user types complete sentence → AI validates (word used? grammatical? correct meaning?) → feedback + corrected version. Requires LLM backend. Offline fallback: check if target word appears in input only.

**Integration:** `selectReviewMode` can assign this for words approaching maturity (reviewed in all other modes, high stability). Deepest processing level.

---

## Phase 5: Advanced Modes

### Feature 15: Bidirectional Translation

**Create:**
- `src/components/modes/BidirectionalTranslationMode.jsx`

**Three-step flow:**
1. See L2 → type L1 translation (any reasonable English accepted)
2. See YOUR L1 translation → type L2 back-translation
3. Compare your L2 with original via word-level diff + optional LLM semantic scoring

Source: sentences.json, vocabulary examples, reading passages.

---

### Feature 14: Narrow Listening

**Create:**
- `src/components/modes/NarrowListeningMode.jsx`

**Modify:**
- `tts-server.py` — add `voice` parameter to `/tts` endpoint for speaker selection

**Flow:** Topic card → 3 passages (different voices/speeds) → comprehension checks between each → vocabulary recap. Content from dialogue scenarios or LLM-generated. Multiple TTS voices already available per language via different engines.

---

### Feature 11: Shadowing Mode

**Create:**
- `src/components/modes/ShadowingMode.jsx`
- `src/hooks/useShadowing.js` — simultaneous recording + playback

**Key difference from SpeechMode:** Recording starts AT THE SAME TIME as TTS playback. Uses `useWhisperSTT` + `useTTS` together. Visual waveform shows timing alignment. Progressive: phrases → sentences → passages. Headphone detection needed (TTS bleeds into mic without headphones).

---

## Phase 6: Intelligence Layer

### Feature 19: Interference Detection

**Create:**
- `src/utils/interferenceDetector.js`

**Modify:**
- `src/utils/struggleEngine.js` — integrate into drill session building
- `src/utils/dailySession.js` — filter co-occurring interference pairs
- `src/components/modes/StruggleWordsMode.jsx` — display alerts

**Detection:** Orthographic (Levenshtein ≤ 2), phonological (phonetic string similarity), semantic (same category), empirical (existing confusionPairs data). When both words of a pair appear in same session, remove the lower-score one.

---

### Feature 17: Functional Load Weighting

**Create:**
- `src/data/functionalLoad.js` — per-language phonemic contrast rankings

**Modify:**
- `src/utils/struggleEngine.js` — add 7th signal (functionalLoad * 0.10, reduce difficulty + response from 0.10 to 0.05 each)

High-load contrast errors (e.g., Ukrainian и/і) get amplified struggle scores. Low-load contrasts (e.g., г/ґ) get dampened. Needs linguistic data curation per language.

---

### Feature 20: Graded Reading

**Create:**
- `src/components/modes/GradedReadingMode.jsx`
- `src/utils/readingLevel.js` — word coverage computation

**Implementation:** Compute known words from vocabularyMastery (stability ≥ 7). Filter texts to ≥98% coverage. Unknown words highlighted with click-to-define (reuse `useWordClick` hook). AI story generation calibrated to user's specific known vocabulary. Track words read, reading time, new words encountered.

Could extend StoryMode rather than separate mode — add "Graded" tab to picker phase.

---

## New Files Summary

**Hooks (3):**
- `src/hooks/useSelfCorrection.js`
- `src/hooks/useBackgroundNoise.js`
- `src/hooks/useShadowing.js`

**Utilities (9):**
- `src/utils/sentenceDiff.js`
- `src/utils/interleaver.js`
- `src/utils/modeSelector.js`
- `src/utils/calibration.js`
- `src/utils/hvpt.js`
- `src/utils/interferenceDetector.js`
- `src/utils/readingLevel.js`
- `src/utils/exampleRotator.js`
- `src/utils/chunkManager.js`

**New Modes (7):**
- `src/components/modes/ProsodyMode.jsx`
- `src/components/modes/ConnectedSpeechMode.jsx`
- `src/components/modes/SentenceProductionMode.jsx`
- `src/components/modes/BidirectionalTranslationMode.jsx`
- `src/components/modes/NarrowListeningMode.jsx`
- `src/components/modes/ShadowingMode.jsx`
- `src/components/modes/GradedReadingMode.jsx`

**Data Files (5+):**
- `src/data/prosody/uk.json` (+ per language)
- `src/data/connectedSpeech.js`
- `src/data/chunks/uk.json` (+ per language)
- `src/data/functionalLoad.js`
- `src/data/noiseProfiles.js`

## Most-Modified Existing Files

- `src/App.jsx` — every feature touches this (mode registration, handleTrackProgress, props)
- `src/utils/dailySession.js` — Features 3, 4, 5, 16, 18, 19
- `src/utils/struggleEngine.js` — Features 11, 12, 15, 17, 19
- `src/components/modes/DailyReviewMode.jsx` — Features 2, 3, 9
- `src/components/modes/ListeningMode.jsx` — Features 1, 2, 4, 13
- `src/components/modes/FlashcardMode.jsx` — Features 2, 4, 5, 9
- `src/components/modes/MinimalPairsMode.jsx` — Features 7, 13
- `src/components/modes/TranslationPracticeMode.jsx` — Features 2, 4
- `src/hooks/useTTS.js` — Features 7, 13, 14

---

## Verification

After each phase:
1. `npm run dev` — confirm app starts without errors
2. Test each modified mode end-to-end in browser
3. Verify `handleTrackProgress` correctly updates vocabularyMastery for new data fields
4. Check localStorage persistence — reload app, confirm state survives
5. Test with TTS server running for audio features
6. For AI features (10, 15, 20): test with and without LM Studio running

Phase-specific checks:
- **Phase 1:** Test self-correction retry flow in listening + translation. Test sentence dictation at all 3 levels. Test production flashcards with multi-answer words.
- **Phase 2:** Verify Smart Mix pulls from multiple categories. Verify daily review assigns different modes per card. Check calibration adjusts difficulty after sustained high/low accuracy.
- **Phase 3:** Verify multi-voice in minimal pairs. Test noise overlay at different SNR levels. Test prosody exercises with question vs statement TTS.
- **Phase 4:** Verify example rotation shows different sentences. Test chunk SRS tracking independently from component words.
- **Phase 5:** Test bidirectional translation 3-step flow. Test narrow listening with different TTS voices. Test shadowing with headphones (mic shouldn't capture TTS).
- **Phase 6:** Verify interference pairs are separated in daily review. Test graded reading coverage computation against known vocabulary.
