# Ukrainian, Russian & German Typing Game

A free, open-source web app originally made for learning to type on my Ukrainian keyboard, expanded over time to include TTS, language lessons, Russian, and German.

Please report any errors in translation or pronunciation of the alphabet. Project is almost entirely vibe coded in spare time. Any issues may take a while or never be fixed.

Includes typing lessons, vocabulary flashcards (4000+ words), grammar exercises, reading practice, dialogue practice, pronunciation coaching, AI story generation, a translator, and text-to-speech pronunciation.

## Features

### Core
- **Ukrainian + Russian + German** - Full support for all three languages with one-click switching and separate progress tracking
- **Text-to-Speech** - All languages use server-side Silero TTS models (Ukrainian, Russian, English, German)
- **Speech-to-Text** - Speak using Whisper (fully offline, auto-detects language)
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
- [Python](https://www.python.org/downloads/) 3.8+ (needed for TTS and STT)

### 1. Clone and install

```bash
git clone https://github.com/GryphonEDM/gryphons-ukrainian-russian-learning-app.git
cd gryphons-ukrainian-russian-learning-app
npm install
```

### 2. Run the web app

```bash
npm run dev
```

Open http://localhost:5173 in your browser. The app is fully functional without the TTS server — you just won't hear pronunciation.

### 3. (Optional) Enable text-to-speech and speech-to-text

All TTS runs through a single Flask server (`tts-server.py`) on port 3002, using Silero models for all four languages.

#### Install Python dependencies

```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate.bat     # Windows

pip install flask flask-cors torch

# Optional but recommended:
pip install flask-jwt-extended bcrypt   # account system
pip install num2words                   # better number pronunciation

# Whisper STT — pick one:
pip install mlx-whisper          # macOS Apple Silicon (fast)
pip install faster-whisper       # Windows / Linux / Intel Mac
```

#### Start the TTS server

```bash
python tts-server.py
```

On first run, models are downloaded automatically:

| Language | Model | Size | Location |
|---|---|---|---|
| Ukrainian | Silero v5 CIS (`ukr_igor`) | ~91 MB | `tts-model-uk-silero/` |
| Russian | Silero v5 (`aidar`) | ~65 MB | `tts-model-ru/` |
| English | Silero v3 (`en_70`) | ~100 MB | `tts-model-en/` |
| German | Silero v3 (`bernd_ungerer`) | ~54 MB | `tts-model-de/` |

After the initial download (~310 MB total), TTS works fully offline. You should see:

```
[OK] Ukrainian TTS loaded! (speaker: ukr_igor)
[OK] Russian TTS model loaded! (speaker: aidar)
[OK] English TTS model loaded! (speaker: en_70)
[OK] German TTS model loaded! (speaker: bernd_ungerer)
[OK] Whisper STT ready (MLX backend, model: mlx-community/whisper-small-mlx)
[SPEAKER] TTS + STT Server (Ukrainian + Russian + English + German)
   Starting on http://localhost:3002
```

### Windows one-click start

Double-click `start.bat` to automatically install all dependencies and start both the web app and TTS server.

### Mac/Linux one-click start

```bash
chmod +x start.sh
./start.sh
```

## Text-to-Speech Details

All four languages use Silero models served from `tts-server.py`. There is no browser-side TTS — everything goes through the server.

| | Ukrainian | Russian | English | German |
|---|---|---|---|---|
| **Model** | Silero v5 CIS | Silero v5 | Silero v3 | Silero v3 |
| **Speaker** | ukr_igor | aidar | en_70 | bernd_ungerer |
| **Model file** | `tts-model-uk-silero/v5_cis_base.pt` | `tts-model-ru/v5_ru.pt` | `tts-model-en/v3_en.pt` | `tts-model-de/v3_de.pt` |
| **Download size** | ~91 MB | ~65 MB | ~100 MB | ~54 MB |
| **Works offline?** | Yes (after first download) | Yes | Yes | Yes |

Mixed-script text (e.g. a Ukrainian sentence containing an English word) is split by script and each chunk is routed to the appropriate model automatically.

### 4. (Optional) Enable Chat Practice with a local AI tutor

Chat Practice lets you have free-form conversations with an AI language tutor. It requires [LM Studio](https://lmstudio.ai/) running locally to serve an LLM.

#### Install LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/) for your platform (Windows, macOS, or Linux)
2. Open LM Studio and download a model:
   - **Recommended:** `Qwen 3.5 35B` — excellent multilingual support for Ukrainian, Russian, and German (requires ~24GB RAM)
   - **Lighter alternative:** `Qwen 3.5 9B` — still good quality, runs on most machines (~8GB RAM)
   - Search for "Qwen 3.5" in the LM Studio model search, pick a GGUF quantization that fits your hardware
3. Load the model in LM Studio
4. Go to the **Developer** tab (or **Local Server**) and click **Start Server** — it runs on `http://localhost:1234` by default

That's it. The app automatically connects to LM Studio when you open Chat Practice. If LM Studio isn't running, the rest of the app works normally.

#### Speech-to-Text (Whisper)

The chat mode includes a microphone button for voice input powered by [Whisper](https://github.com/openai/whisper) running locally. It auto-detects whether you're speaking English, Ukrainian, Russian, or German and transcribes it accurately.

- **macOS (Apple Silicon):** Uses [MLX Whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) — optimized for M-series chips, very fast (~500ms)
- **Windows / Linux / Intel Mac:** Uses [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — CPU-based, works everywhere

The Whisper model (~500MB) downloads automatically on first use. After that, speech-to-text works fully offline.

## How to play

1. **Set up your keyboard** - Add Ukrainian, Russian, or German as an input language in your OS settings (click the Keyboard Setup Guide in the app for instructions)
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
│   ├── data/               # Ukrainian language data (lessons, vocabulary, grammar, dialogues)
│   ├── data/ru/            # Russian language data
│   ├── data/de/            # German language data
│   └── utils/              # Helpers (dictionary builder, user dictionary, sound effects)
├── tts-server.py           # Local TTS + STT server — Silero (4 languages) + Whisper on port 3002
├── tts-model-uk-silero/    # Ukrainian TTS model files (auto-downloaded, gitignored)
├── tts-model-ru/           # Russian TTS model files (auto-downloaded, gitignored)
├── tts-model-en/           # English TTS model files (auto-downloaded, gitignored)
├── tts-model-de/           # German TTS model files (auto-downloaded, gitignored)
├── users.db                # SQLite database for accounts (auto-created, gitignored)
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
pip install flask flask-cors torch
pip install flask-jwt-extended bcrypt   # for account system
pip install num2words                   # for number pronunciation
```

**A TTS model won't download?**
- Ukrainian: download manually from `https://models.silero.ai/models/tts/ru/v5_cis_base.pt` → place at `tts-model-uk-silero/v5_cis_base.pt`
- Russian: `https://models.silero.ai/models/tts/ru/v5_ru.pt` → `tts-model-ru/v5_ru.pt`
- English: `https://models.silero.ai/models/tts/en/v3_en.pt` → `tts-model-en/v3_en.pt`
- German: `https://models.silero.ai/models/tts/de/v3_de.pt` → `tts-model-de/v3_de.pt`

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
- Close other apps using ports 5173 or 3002
- Or edit the port in `vite.config.js` / `tts-server.py`

## Credits

- TTS powered by [Silero Models](https://github.com/snakers4/silero-models)
- Speech-to-text by [OpenAI Whisper](https://github.com/openai/whisper) via [MLX Whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) / [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- LLM chat powered by [LM Studio](https://lmstudio.ai/)
- Built with React + Vite
