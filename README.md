# Multilingual Language Trainer

A free, open-source web app for learning to type and speak in 12 languages with offline TTS, speech-to-text, and AI tutoring.

Please report any errors in translation or pronunciation. Project is almost entirely vibe coded in spare time. Any issues may take a while or never be fixed.

## Supported Languages

Ukrainian, Russian, English, German, Spanish, French, Greek, Hindi, Arabic, Korean, Japanese, Chinese (Mandarin)

Each language includes typing lessons, vocabulary flashcards, grammar exercises, reading practice, dialogue practice, and text-to-speech pronunciation.

## Features

### Core
- **12 Languages** - Full support with one-click switching and separate progress tracking
- **Text-to-Speech** - Multiple TTS engines per language (Silero, Kokoro, MMS-TTS, Piper) — all server-side, fully offline
- **Speech-to-Text** - Whisper-powered dictation (fully offline, auto-detects language)
- **AI Tutor** - Local LLM integration via LM Studio for chat, translations, pronunciation tips, and story generation
- **Account System** - Create an account for cross-device progress sync (stored in local SQLite database)

### Typing
- **Typing Lessons** - 10 progressive levels from individual letters to full words, unlocked by earning XP
- **Alphabet Speed Challenge** - Type the entire alphabet as fast as you can with best-time tracking
- **Keyboard Explorer** - Click any key to hear its sound, see its position, and learn finger placement
- **Virtual Keyboard** - Color-coded finger guide with home row highlighting

### Vocabulary & Flashcards
- **4000+ Word Vocabulary** - Flashcards across 20+ themed categories
- **CEFR Difficulty Filtering** - Filter vocabulary by level (A1, A2, B1, B2)
- **Custom Flashcards** - Create and manage your own "My Words" flashcard sets
- **Word Click Definitions** - Click any word in chat, stories, or lessons to see its translation and hear pronunciation
- **Spaced Repetition Tracking** - Mastery levels tracked per word (times correct/wrong)

### Language Practice
- **Grammar Lessons** - A1 through B2 tiers with 8 exercise types (multiple choice, fill-in-the-blank, matching, reordering, and more)
- **Sentence Building** - Arrange word tiles into correct sentences with multiple valid orderings accepted
- **Dialogue Practice** - Practice real conversations (restaurant, directions, shopping, greetings) with NPC auto-speak via TTS
- **Reading Practice** - Read passages and answer comprehension questions at multiple difficulty levels
- **AI Story Generation** - Generate custom stories by topic and difficulty (A1-B2) with optional comprehension questions
- **Translation Practice** - Translate words between English and your target language with synonym support
- **Listening Practice** - Hear words spoken via TTS and type what you hear, with adjustable playback speed
- **Pronunciation Practice** - Speak words, phrases, or sentences and get scored on accuracy with LLM-powered coaching tips
- **Chat Practice** - Free conversation with a local AI tutor, with persistent chat sessions, word-click definitions, and microphone input
- **Translator** - Look up words and phrases with TTS playback and microphone input

### Gamification
- **Achievement System** - 60+ achievements to unlock across typing, vocabulary, grammar, reading, and more
- **XP & Leveling** - 10 player levels with XP thresholds that unlock new lesson content
- **Streak Tracking** - Current and best streak records for letters and words
- **Stats Page** - Detailed progress dashboard with typing stats, vocabulary mastery, mode activity, and achievement progress

## Quick Start

> **New to this?** Check out the **[Beginner-Friendly Setup Guide (SETUP.md)](SETUP.md)** for step-by-step instructions with no tech jargon.

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [Python](https://www.python.org/downloads/) 3.10+ (needed for TTS and STT)
- [espeak-ng](https://github.com/espeak-ng/espeak-ng) (system dependency for Kokoro TTS)

### One-click start (recommended)

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
Double-click `start.bat`

This automatically installs all dependencies, starts the TTS server, and launches the web app.

### Manual setup

#### 1. Clone and install

```bash
git clone https://github.com/GryphonEDM/gryphons-ukrainian-russian-learning-app.git
cd gryphons-ukrainian-russian-learning-app
npm install
```

#### 2. Set up the Python environment

```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate.bat     # Windows

pip install flask flask-cors torch soundfile requests
pip install flask-jwt-extended bcrypt   # account system
pip install num2words                   # number pronunciation
pip install transformers                # MMS-TTS (French, Greek, Korean)
pip install uroman                      # Korean TTS romanization
pip install piper-tts pathvalidate      # Arabic TTS

# Whisper STT — pick one:
pip install mlx-whisper          # macOS Apple Silicon (fast)
pip install faster-whisper       # Windows / Linux / Intel Mac
```

#### 3. Set up Kokoro TTS (Spanish, Hindi, Japanese, Chinese)

Kokoro requires Python 3.10-3.12 (may differ from your venv Python). It runs as an auto-launched sidecar on port 3003.

```bash
# Install on Python 3.12 (adjust path for your system)
python3.12 -m pip install kokoro>=0.9.4 soundfile "misaki[ja]" "misaki[zh]"
```

Set `KOKORO_PYTHON` environment variable if your Python 3.12 isn't at the default path.

#### 4. Start the servers

```bash
python tts-server.py    # Starts TTS on :3002, auto-launches Kokoro sidecar on :3003
npm run dev             # Starts web app on :5173
```

## Text-to-Speech Details

Multiple engines are used to get the best quality per language:

| Language | Engine | Model / Voice | Notes |
|----------|--------|---------------|-------|
| Ukrainian | Silero v5 | `v5_cis_base.pt` / `ukr_igor` | Auto-downloads ~91MB |
| Russian | Silero v5 | `v5_ru.pt` / `aidar` | Auto-downloads ~65MB |
| English | Silero v3 | `v3_en.pt` / `en_70` | Auto-downloads ~100MB |
| German | Silero v3 | `v3_de.pt` / `karlsson` | Auto-downloads ~54MB |
| Spanish | Kokoro | `em_alex` | Via sidecar on port 3003 |
| French | MMS-TTS | `facebook/mms-tts-fra` | Auto-downloads from HuggingFace |
| Greek | MMS-TTS | `facebook/mms-tts-ell` | Auto-downloads from HuggingFace |
| Hindi | Kokoro | `hm_omega` | Via sidecar on port 3003 |
| Arabic | Piper | `kareem` voice | Male voice with custom reference |
| Korean | MMS-TTS | `facebook/mms-tts-kor` | Requires `uroman` for romanization |
| Japanese | Kokoro | `jm_kumo` | Via sidecar on port 3003 |
| Chinese | Kokoro | `zm_yunjian` | Via sidecar on port 3003 |

**Mixed-language TTS:** When the AI tutor mixes languages (e.g. German text with English translations in parentheses), the app automatically routes each part to the correct TTS engine. For non-Latin-script languages (Ukrainian, Russian, Greek, Arabic, Korean, Chinese, Japanese), script detection splits native vs English text at the word level.

## Speech-to-Text (Whisper)

The chat mode includes a microphone button for voice input powered by [Whisper](https://github.com/openai/whisper) running locally. It auto-detects the language being spoken and transcribes it accurately.

- **macOS (Apple Silicon):** Uses [MLX Whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) — optimized for M-series chips, very fast (~500ms)
- **Windows / Linux / Intel Mac:** Uses [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — CPU-based, works everywhere

The Whisper model (~500MB) downloads automatically on first use. After that, speech-to-text works fully offline.


### Architecture

- **tts-server.py** (port 3002) — Main server handling Silero, MMS-TTS, and Piper models. Proxies Kokoro requests to the sidecar.
- **kokoro-tts.py** (port 3003) — Kokoro sidecar auto-launched by tts-server.py. Runs on Python 3.12 due to Kokoro's version requirement. Falls back to espeak-ng if Python 3.12 isn't available.

### 5. (Optional) Enable Chat Practice with a local AI tutor

Chat Practice lets you have free-form conversations with an AI language tutor. It requires [LM Studio](https://lmstudio.ai/) running locally to serve an LLM.

#### Install LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/) for your platform (Windows, macOS, or Linux)
2. Open LM Studio and download a model:
   - **Recommended:** `Qwen 3.5 35B` — excellent multilingual support (requires ~24GB RAM)
   - **Lighter alternative:** `Qwen 3.5 9B` — still good quality, runs on most machines (~8GB RAM)
   - Search for "Qwen 3.5" in the LM Studio model search, pick a GGUF quantization that fits your hardware
3. Load the model in LM Studio
4. Go to the **Developer** tab (or **Local Server**) and click **Start Server** — it runs on `http://localhost:1234` by default

That's it. The app automatically connects to LM Studio when you open Chat Practice. If LM Studio isn't running, the rest of the app works normally.

## How to play

1. **Set up your keyboard** - Add the target language as an input language in your OS settings (click the Keyboard Setup Guide in the app for instructions)
2. **Switch your keyboard** - Use `Win+Space` (Windows), `Ctrl+Space` (Mac), or `Super+Space` (Linux) to switch to the target language
3. **Start typing** - Pick a lesson and type the letters/words shown. The virtual keyboard highlights which key to press
4. **Explore other modes** - Try flashcards, grammar lessons, reading practice, and more from the main menu

## Project Structure

```
├── src/                    # React application source
│   ├── App.jsx             # Main app component
│   ├── components/modes/   # Game mode components (flashcards, grammar, chat, speech, etc.)
│   ├── components/         # Shared components (ModeHeader, WordToolbar, StatsPage, etc.)
│   ├── hooks/              # Custom hooks (TTS, STT, word click, speech practice, lesson chat)
│   ├── data/               # Language data directories (uk, ru, de, es, fr, el, hi, ar, ko, ja, zh)
│   └── utils/              # Helpers (dictionary builder, user dictionary, sound effects)
├── tts-server.py           # Main TTS + STT server (Silero, MMS-TTS, Piper) on port 3002
├── kokoro-tts.py           # Kokoro TTS sidecar (es, hi, ja, zh) on port 3003
├── ref_audio/              # Reference audio for voice cloning (Arabic)
├── scripts/                # Build scripts for vocabulary/story patches
├── start.bat               # Windows startup script
├── start.sh                # Mac/Linux startup script
├── index.html              # Vite entry point
├── package.json            # Node.js dependencies
└── vite.config.js          # Vite config
```

## Troubleshooting

**App works but no sound?**
- Make sure TTS is enabled in Settings (bottom of main menu)
- Check that the TTS server is running: `python tts-server.py`
- The server should show `[OK] ... TTS loaded!` for each language on startup
- Check the browser console for errors on the `/tts` endpoint

**Python dependency issues?**
```bash
pip install flask flask-cors torch soundfile requests transformers
pip install flask-jwt-extended bcrypt num2words uroman
pip install piper-tts pathvalidate
```

**Kokoro sidecar not starting?**
- Kokoro requires Python 3.10-3.12. Set `KOKORO_PYTHON` to the correct path if needed
- Install Kokoro on the right Python: `python3.12 -m pip install kokoro>=0.9.4 soundfile "misaki[ja]" "misaki[zh]"`
- If the sidecar isn't available, Spanish/Hindi/Japanese/Chinese fall back to espeak-ng

**Chat Practice says "LM Studio not detected"?**
- Make sure LM Studio is running and a model is loaded
- Check that the local server is started in LM Studio (Developer tab → Start Server)
- The server should be on `http://localhost:1234` (the default)

**Speech-to-text not working?**
- Make sure your browser has microphone permissions for the site
- The Whisper model downloads on first use (~500MB) — check the server console for download progress
- If using HTTPS, make sure your certs are set up (see below)

**Want HTTPS? (optional, needed for Web Speech API on some networks)**
```bash
mkdir .cert
openssl req -x509 -newkey rsa:2048 -keyout .cert/key.pem -out .cert/cert.pem -days 365 -nodes -subj "/CN=localhost"
```
The dev server will automatically use HTTPS when these cert files exist, and fall back to HTTP otherwise.

**Port already in use?**
- Close other apps using ports 5173, 3002, or 3003
- Or edit the port in `vite.config.js` / `tts-server.py` / `kokoro-tts.py`

## Credits

- TTS powered by [Silero Models](https://github.com/snakers4/silero-models), [Kokoro](https://github.com/hexgrad/kokoro), [MMS-TTS](https://huggingface.co/facebook/mms-tts), and [Piper](https://github.com/rhasspy/piper)
- Speech-to-text by [OpenAI Whisper](https://github.com/openai/whisper) via [MLX Whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) / [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- LLM chat powered by [LM Studio](https://lmstudio.ai/)
- Built with React + Vite
