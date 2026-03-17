#!/usr/bin/env python3
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import sys
import tempfile
import torch

# Resolve all paths relative to this script's directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TTS_MODEL_DIR = os.path.join(SCRIPT_DIR, "tts-model")
RU_MODEL_PATH = os.path.join(SCRIPT_DIR, "tts-model-ru", "v5_ru.pt")

# Add the TTS repo to path
sys.path.insert(0, os.path.join(SCRIPT_DIR, 'tts-repo'))

try:
    from ukrainian_tts.tts import TTS, Voices, Stress
    print("[OK] Ukrainian TTS loaded successfully!")
except Exception as e:
    print(f"[ERROR] Failed to load Ukrainian TTS: {e}")
    print("\nTrying to install missing dependencies...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "flask", "flask-cors"])
    sys.exit(1)

app = Flask(__name__)
CORS(app)


# === Ukrainian TTS (ESPnet) ===
print("Loading Ukrainian TTS model (Oleksa voice)...")
os.makedirs(TTS_MODEL_DIR, exist_ok=True)
os.chdir(TTS_MODEL_DIR)
tts_uk = TTS(cache_folder=".", device="cpu")
os.chdir(SCRIPT_DIR)
print("[OK] Ukrainian TTS model loaded!")

# === Russian TTS (Silero v5) ===
print("Loading Russian TTS model (Silero v5)...")
os.makedirs(os.path.join(SCRIPT_DIR, "tts-model-ru"), exist_ok=True)

if not os.path.isfile(RU_MODEL_PATH):
    print("  Downloading Silero v5 Russian model (~65MB)...")
    torch.hub.download_url_to_file('https://models.silero.ai/models/tts/ru/v5_ru.pt', RU_MODEL_PATH)

tts_ru = torch.package.PackageImporter(RU_MODEL_PATH).load_pickle("tts_models", "model")
tts_ru.to(torch.device('cpu'))
RU_SPEAKER = 'aidar'
RU_SAMPLE_RATE = 48000
print(f"[OK] Russian TTS model loaded! (speaker: {RU_SPEAKER})")

# === English TTS (Silero v3) ===
EN_MODEL_PATH = os.path.join(SCRIPT_DIR, "tts-model-en", "v3_en.pt")
os.makedirs(os.path.join(SCRIPT_DIR, "tts-model-en"), exist_ok=True)

print("Loading English TTS model (Silero v3)...")
if not os.path.isfile(EN_MODEL_PATH):
    print("  Downloading Silero v3 English model (~100MB)...")
    torch.hub.download_url_to_file('https://models.silero.ai/models/tts/en/v3_en.pt', EN_MODEL_PATH)

tts_en = torch.package.PackageImporter(EN_MODEL_PATH).load_pickle("tts_models", "model")
tts_en.to(torch.device('cpu'))
EN_SPEAKER = 'en_70'
EN_SAMPLE_RATE = 48000
print(f"[OK] English TTS model loaded! (speaker: {EN_SPEAKER})")

# === Whisper STT ===
# Try MLX Whisper first (macOS Apple Silicon), fall back to faster-whisper (Windows/Linux/Intel)
import platform

stt_backend = None
stt_available = False
stt_model_obj = None

MLX_MODEL = "mlx-community/whisper-small-mlx"
FASTER_WHISPER_MODEL = "small"

if platform.system() == 'Darwin' and platform.machine() == 'arm64':
    # macOS Apple Silicon — use MLX Whisper for best performance
    try:
        import mlx_whisper
        stt_backend = 'mlx'
        stt_available = True
        print(f"[OK] Whisper STT ready (MLX backend, model: {MLX_MODEL})")
    except ImportError:
        print("[WARN] mlx-whisper not installed — trying faster-whisper...")

if not stt_available:
    # Windows, Linux, or Intel Mac — use faster-whisper (CPU)
    try:
        from faster_whisper import WhisperModel
        print(f"Loading Whisper STT model (faster-whisper, model: {FASTER_WHISPER_MODEL})...")
        stt_model_obj = WhisperModel(FASTER_WHISPER_MODEL, device="cpu", compute_type="int8")
        stt_backend = 'faster-whisper'
        stt_available = True
        print(f"[OK] Whisper STT ready (faster-whisper backend, model: {FASTER_WHISPER_MODEL})")
    except ImportError:
        pass

if not stt_available:
    print("[WARN] No Whisper STT backend installed — STT endpoint disabled")
    if platform.system() == 'Darwin' and platform.machine() == 'arm64':
        print("       Install with: pip install mlx-whisper")
    else:
        print("       Install with: pip install faster-whisper")

def whisper_transcribe(audio_path, lang=None):
    """Transcribe audio using whichever Whisper backend is available.
    If lang is provided, it hints Whisper to expect that language.
    task='transcribe' ensures it writes what was said (no translation)."""
    kwargs = {'task': 'transcribe'}
    if lang:
        kwargs['language'] = lang

    if stt_backend == 'mlx':
        result = mlx_whisper.transcribe(
            audio_path,
            path_or_hf_repo=MLX_MODEL,
            **kwargs,
        )
        return result.get('text', '').strip()
    elif stt_backend == 'faster-whisper':
        segments, _ = stt_model_obj.transcribe(audio_path, **kwargs)
        return ' '.join(seg.text for seg in segments).strip()
    return ''

@app.route('/stt', methods=['POST'])
def transcribe_audio():
    if not stt_available:
        return jsonify({'error': 'No Whisper STT backend installed'}), 503

    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        lang = request.args.get('lang', None)

        # Save to temp file — Safari sends mp4, Chrome sends webm
        content_type = audio_file.content_type or ''
        filename = audio_file.filename or ''
        suffix = '.mp4' if ('mp4' in content_type or filename.endswith('.mp4')) else '.webm' if ('webm' in content_type or filename.endswith('.webm')) else '.wav'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            audio_file.save(tmp)
            tmp_path = tmp.name

        try:
            print(f"[STT] Transcribing (lang={'auto' if not lang else lang}, backend: {stt_backend})...")
            text = whisper_transcribe(tmp_path, lang=lang)
            print(f"[STT] Result: {text[:80]}{'...' if len(text) > 80 else ''}")
            return jsonify({'text': text})
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        print(f"[STT] Error: {repr(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/tts', methods=['POST'])
def generate_tts():
    try:
        data = request.get_json()
        text = data.get('text', '')
        lang = data.get('lang', 'uk')

        if not text:
            return {'error': 'Missing text parameter'}, 400

        # Route to the correct TTS engine
        if lang == 'ru':
            return generate_russian_tts(text)
        elif lang == 'en':
            return generate_english_tts(text)
        else:
            return generate_ukrainian_tts(text)

    except Exception as e:
        print(f"[TTS] Error: {repr(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500

def generate_ukrainian_tts(text):
    print(f"[TTS-UK] Generating: {len(text)} chars")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
        _, output_text = tts_uk.tts(text, Voices.Oleksa.value, Stress.Dictionary.value, tmp)
    try:
        print(f"[TTS-UK] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def generate_english_tts(text):
    print(f"[TTS-EN] Generating: {len(text)} chars")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    tts_en.save_wav(text=text, speaker=EN_SPEAKER, sample_rate=EN_SAMPLE_RATE, audio_path=tmp_path)
    try:
        print(f"[TTS-EN] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def generate_russian_tts(text):
    print(f"[TTS-RU] Generating: {len(text)} chars")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    tts_ru.save_wav(text=text, speaker=RU_SPEAKER, sample_rate=RU_SAMPLE_RATE, audio_path=tmp_path)
    try:
        print(f"[TTS-RU] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

if __name__ == '__main__':
    print("\n[SPEAKER] TTS + STT Server (Ukrainian + Russian + English)")
    print(f"   STT: {'enabled' if stt_available else 'disabled (install mlx-whisper)'}")
    print("   Starting on http://localhost:3002\n")
    app.run(host='0.0.0.0', port=3002, debug=False)
