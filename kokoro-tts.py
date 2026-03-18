#!/usr/bin/env python3
"""Kokoro TTS sidecar service — runs on port 3003.

Preloads Kokoro pipelines for French, Hindi, Japanese, and Chinese.
Called by tts-server.py which proxies requests here.
"""
from flask import Flask, request, send_file
from flask_cors import CORS
import os
import tempfile
import numpy as np
import soundfile as sf
from kokoro import KPipeline

app = Flask(__name__)
CORS(app)

# Language config: app lang code -> (kokoro lang code, default voice)
KOKORO_LANGS = {
    'fr': ('f', 'ff_siwis'),
    'hi': ('h', 'hm_omega'),
    'ja': ('j', 'jm_kumo'),
    'zh': ('z', 'zm_yunjian'),
}

# Preload all pipelines at startup
pipelines = {}
for app_lang, (kokoro_code, voice) in KOKORO_LANGS.items():
    print(f"Loading Kokoro pipeline for {app_lang} (code={kokoro_code}, voice={voice})...")
    pipelines[app_lang] = KPipeline(lang_code=kokoro_code, repo_id='hexgrad/Kokoro-82M')
    print(f"[OK] Kokoro {app_lang} ready!")

@app.route('/tts', methods=['POST'])
def generate_tts():
    try:
        data = request.get_json()
        text = data.get('text', '')
        lang = data.get('lang', '')

        if not text:
            return {'error': 'Missing text'}, 400
        if lang not in KOKORO_LANGS:
            return {'error': f'Unsupported language: {lang}'}, 400

        kokoro_code, default_voice = KOKORO_LANGS[lang]
        voice = data.get('voice', default_voice)
        pipeline = pipelines[lang]

        print(f"[Kokoro-{lang}] Generating ({voice}): {text[:80]}")

        audio_chunks = []
        for gs, ps, audio in pipeline(text, voice=voice):
            audio_chunks.append(audio)

        if not audio_chunks:
            return {'error': 'No audio generated'}, 500

        full_audio = np.concatenate(audio_chunks)

        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp_path = tmp.name

        sf.write(tmp_path, full_audio, 24000)
        print(f"[Kokoro-{lang}] Generated successfully ({len(full_audio)/24000:.1f}s audio)")

        try:
            return send_file(tmp_path, mimetype='audio/wav')
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    except Exception as e:
        print(f"[Kokoro] Error: {repr(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'ok', 'languages': list(KOKORO_LANGS.keys())}

if __name__ == '__main__':
    print(f"\nKokoro TTS sidecar ready on port 3003")
    print(f"Supported languages: {', '.join(KOKORO_LANGS.keys())}\n")
    app.run(host='0.0.0.0', port=3003, debug=False)
