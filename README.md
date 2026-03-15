# Ukrainian & Russian Typing Game

A free, open-source web app originally made for learning to type on my Ukrainian keyboard but I have expanded this to also include TTS, as well as language lessons, and added Russian language. 

Please report any errors in translation, or pronunciation of alphabet, I cannot address mispronounced words but can work on the alphabet stuff. Project is almost entirely vibe coded in spare time. Any issues may take awhile or never be fixed. 

Includes typing lessons, vocabulary flashcards (4000+ words), grammar exercises, reading practice, dialogue practice, a translator, and text-to-speech pronunciation.

## Features

- **Ukrainian + Russian** - Full support for both languages with one-click switching
- **Typing Lessons** - Progressive lessons from individual letters to full words
- **Alphabet Speed Challenge** - Type the entire alphabet as fast as you can
- **Keyboard Explorer** - Click any key to hear its sound and learn its position
- **4000+ Word Vocabulary** - Flashcards across 20+ themed categories
- **Grammar Lessons** - Cases, verbs, pronouns, adjectives, word order
- **Sentence Building** - Arrange words into correct sentences
- **Dialogue Practice** - Practice real conversations (restaurant, directions, shopping, greetings)
- **Reading Practice** - Read passages and answer comprehension questions
- **Translation Practice** - Translate words between English and your target language
- **Listening Practice** - Hear words and type what you hear
- **Translator** - Look up words and phrases
- **Chat Practice** - Free conversation with a local AI tutor via LM Studio
- **Speech-to-Text** - Speak your messages using Whisper (fully offline)
- **Text-to-Speech** - Three separate TTS engines for English, Ukrainian, and Russian
- **Achievement System** - 20 achievements to unlock
- **Progress Tracking** - XP, streaks, and stats saved per language

## Quick Start

> **New to this?** Check out the **[Beginner-Friendly Setup Guide (SETUP.md)](SETUP.md)** for step-by-step instructions with no tech jargon.

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [Python](https://www.python.org/downloads/) 3.8+ (needed for Ukrainian and Russian TTS)

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

Open http://localhost:5173 in your browser. The app is fully functional without the TTS server - you just won't hear Ukrainian/Russian pronunciation. English TTS works out of the box (see below).

### 3. (Optional) Enable Ukrainian & Russian text-to-speech

The TTS server runs both Ukrainian and Russian speech synthesis on a single Flask server (port 3002). English TTS is handled separately by the browser and requires no setup.

#### Install Python dependencies

```bash
# Install the Ukrainian TTS library
cd tts-repo
pip install -e .
cd ..

# Install server and model dependencies
pip install flask flask-cors torch
```

> **Note:** `torch` (PyTorch) is required by both the Ukrainian and Russian TTS models. If you run into issues with `espnet` (used by Ukrainian TTS), install it explicitly: `pip install espnet`

#### Start the TTS server

```bash
python tts-server.py
```

On first run, models are downloaded automatically:
- **Ukrainian model** (~425 MB) - ESPnet model from [robinhad/ukrainian-tts](https://github.com/robinhad/ukrainian-tts) releases, saved to `tts-model/`
- **Russian model** (~65 MB) - Silero v5 model from [silero-models](https://github.com/snakers4/silero-models), saved to `tts-model-ru/`

After the initial download, TTS works fully offline. You should see:

```
[OK] Ukrainian TTS loaded successfully!
[OK] Ukrainian TTS model loaded!
[OK] Russian TTS model loaded! (speaker: aidar)
[OK] Whisper STT ready (MLX backend, model: mlx-community/whisper-small-mlx)
[SPEAKER] TTS + STT Server (Ukrainian + Russian)
   STT:      enabled
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

This app uses three different TTS engines, one for each language:

| | English | Ukrainian | Russian |
|---|---|---|---|
| **Technology** | Browser Web Speech API | ESPnet (robinhad/ukrainian-tts) | Silero v5 |
| **Server required?** | No (runs in browser) | Yes (`tts-server.py`) | Yes (`tts-server.py`) |
| **Model download** | None | ~425 MB (auto on first run) | ~65 MB (auto on first run) |
| **Model location** | N/A | `tts-model/` | `tts-model-ru/` |
| **Voice** | OS default | Oleksa (male) | Aidar (male) |
| **Works offline?** | Yes | Yes (after first download) | Yes (after first download) |
| **Cache** | None | `tts-cache/` | `tts-cache-ru/` |

### English TTS

English pronunciation (used in flashcard mode for English translations) uses the browser's built-in [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis). No setup required - it works automatically in any modern browser using your OS's installed voices.

### Ukrainian TTS

Uses the [ukrainian-tts](https://github.com/robinhad/ukrainian-tts) library by robinhad, which is an ESPnet-based model. The library source is included in the `tts-repo/` directory. The model files (~425 MB) are downloaded from GitHub releases on first run and cached in `tts-model/`. Five voices are available (Oleksa, Tetiana, Dmytro, Mykyta, Lada) - the server uses Oleksa by default.

### Russian TTS

Uses [Silero Models v5](https://github.com/snakers4/silero-models) for Russian speech synthesis. The model (~65 MB) is downloaded automatically on first run from `https://models.silero.ai` and saved to `tts-model-ru/v5_ru.pt`. The server uses the "aidar" voice at 48kHz sample rate.

### 4. (Optional) Enable Chat Practice with a local AI tutor

Chat Practice lets you have free-form conversations with an AI language tutor. It requires [LM Studio](https://lmstudio.ai/) running locally to serve an LLM.

#### Install LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/) for your platform (Windows, macOS, or Linux)
2. Open LM Studio and download a model:
   - **Recommended:** `Qwen 3.5 35B` — excellent multilingual support for Ukrainian and Russian (requires ~24GB RAM)
   - **Lighter alternative:** `Qwen 3.5 9B` — still good quality, runs on most machines (~8GB RAM)
   - Search for "Qwen 3.5" in the LM Studio model search, pick a GGUF quantization that fits your hardware
3. Load the model in LM Studio
4. Go to the **Developer** tab (or **Local Server**) and click **Start Server** — it runs on `http://localhost:1234` by default

That's it. The app automatically connects to LM Studio when you open Chat Practice. If LM Studio isn't running, the rest of the app works normally — you just won't have the chat feature.

#### Speech-to-Text (Whisper)

The chat mode includes a microphone button for voice input powered by [Whisper](https://github.com/openai/whisper) running locally. It auto-detects whether you're speaking English, Ukrainian, or Russian and transcribes it accurately. The start scripts install the correct Whisper backend automatically:

- **macOS (Apple Silicon):** Uses [MLX Whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) — optimized for M-series chips, very fast (~500ms)
- **Windows / Linux / Intel Mac:** Uses [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — CPU-based, works everywhere

The Whisper model (~500MB) downloads automatically on first use. After that, speech-to-text works fully offline.

## How to play

1. **Set up your keyboard** - Add Ukrainian or Russian as an input language in your OS settings (click the Keyboard Setup Guide in the app for instructions)
2. **Switch your keyboard** - Use `Win+Space` (Windows), `Ctrl+Space` (Mac), or `Super+Space` (Linux) to switch to the target language
3. **Start typing** - Pick a lesson and type the letters/words shown. The virtual keyboard highlights which key to press
4. **Explore other modes** - Try flashcards, grammar lessons, reading practice, and more from the main menu

## Project Structure

```
├── src/                    # React application source
│   ├── App.jsx             # Main app component
│   ├── components/modes/   # Game mode components (flashcards, grammar, etc.)
│   ├── data/               # Ukrainian language data (lessons, vocabulary, grammar)
│   ├── data/ru/            # Russian language data
│   └── utils/              # Helpers (dictionary builder, sound effects)
├── tts-repo/               # Ukrainian TTS library (from robinhad/ukrainian-tts)
├── tts-server.py           # Local TTS + STT server - TTS (ESPnet + Silero) + STT (Whisper) on port 3002
├── tts-model/              # Ukrainian TTS model files (auto-downloaded, gitignored)
├── tts-model-ru/           # Russian TTS model files (auto-downloaded, gitignored)
├── tts-cache/              # Cached Ukrainian TTS audio (gitignored)
├── tts-cache-ru/           # Cached Russian TTS audio (gitignored)
├── start.bat               # Windows startup script
├── start.sh                # Mac/Linux startup script
├── index.html              # Vite entry point
├── package.json            # Node.js dependencies
└── vite.config.js          # Vite config
```

## Troubleshooting

**App works but no Ukrainian/Russian sound?**
- Make sure TTS is enabled in Settings (bottom of main menu)
- Check that the TTS server is running (`python tts-server.py`)
- The server should show `[OK] Ukrainian TTS model loaded!` and `[OK] Russian TTS model loaded!` when ready
- Check the browser console for errors on the `/tts` endpoint

**No English sound on flashcards?**
- English TTS uses the browser's Web Speech API - make sure your browser supports it
- Check that your OS has English voice packs installed

**Python dependency issues?**
```bash
pip install torch
pip install espnet
pip install flask flask-cors
cd tts-repo && pip install -e . && cd ..
```

**Russian model won't download?**
- The Silero model downloads from `https://models.silero.ai/models/tts/ru/v5_ru.pt`
- You can download it manually and place it at `tts-model-ru/v5_ru.pt`

**Ukrainian model won't download?**
- The ESPnet model downloads from GitHub releases of [robinhad/ukrainian-tts](https://github.com/robinhad/ukrainian-tts/releases)
- Check your internet connection and try running `python tts-server.py` again

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

- Ukrainian TTS model by [robinhad](https://github.com/robinhad/ukrainian-tts)
- Russian TTS model by [Silero](https://github.com/snakers4/silero-models)
- Speech-to-text by [OpenAI Whisper](https://github.com/openai/whisper) via [MLX Whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) / [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- LLM chat powered by [LM Studio](https://lmstudio.ai/)
- Built with React + Vite
