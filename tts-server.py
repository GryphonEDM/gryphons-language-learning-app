#!/usr/bin/env python3
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import re
import tempfile
import torch
import sqlite3
import datetime
import requests as http_requests

try:
    from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
    import bcrypt
    DB_ENABLED = True
except ImportError:
    DB_ENABLED = False
    print("[WARN] flask-jwt-extended or bcrypt not installed — auth/db endpoints disabled")
    print("       Install with: pip install flask-jwt-extended bcrypt")

# Resolve all paths relative to this script's directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RU_MODEL_PATH = os.path.join(SCRIPT_DIR, "tts-model-ru", "v5_ru.pt")
DE_MODEL_PATH = os.path.join(SCRIPT_DIR, "tts-model-de", "v3_de.pt")
ES_MODEL_PATH = os.path.join(SCRIPT_DIR, "tts-model-es", "v3_es.pt")
# French TTS now handled by Kokoro sidecar

app = Flask(__name__)
CORS(app)

# === Database & Auth ===
DB_PATH = os.path.join(SCRIPT_DIR, 'users.db')

if DB_ENABLED:
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'typing-game-secret-change-me-in-prod')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=30)
    jwt = JWTManager(app)

    def get_db():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db():
        conn = get_db()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS user_data (
                user_id INTEGER NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, key),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        conn.commit()
        conn.close()
        print('[DB] Database ready!')

    init_db()

    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = request.get_json() or {}
        username = data.get('username', '').strip().lower()
        password = data.get('password', '')
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        if len(username) < 2:
            return jsonify({'error': 'Username must be at least 2 characters'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        try:
            conn = get_db()
            conn.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, password_hash))
            conn.commit()
            user = conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
            conn.close()
            token = create_access_token(identity={'id': user['id'], 'username': username})
            return jsonify({'token': token, 'username': username})
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Username already taken'}), 409
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = request.get_json() or {}
        username = data.get('username', '').strip().lower()
        password = data.get('password', '')
        conn = get_db()
        user = conn.execute('SELECT id, password_hash FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
            return jsonify({'error': 'Invalid username or password'}), 401
        token = create_access_token(identity={'id': user['id'], 'username': username})
        return jsonify({'token': token, 'username': username})

    @app.route('/api/data', methods=['GET'])
    @jwt_required()
    def get_all_data():
        identity = get_jwt_identity()
        user_id = identity['id']
        conn = get_db()
        rows = conn.execute('SELECT key, value FROM user_data WHERE user_id = ?', (user_id,)).fetchall()
        conn.close()
        return jsonify({row['key']: row['value'] for row in rows})

    @app.route('/api/data/<path:key>', methods=['PUT'])
    @jwt_required()
    def set_data(key):
        identity = get_jwt_identity()
        user_id = identity['id']
        data = request.get_json() or {}
        value = data.get('value')
        if value is None:
            return jsonify({'error': 'value required'}), 400
        conn = get_db()
        conn.execute('''
            INSERT INTO user_data (user_id, key, value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        ''', (user_id, key, value))
        conn.commit()
        conn.close()
        return jsonify({'ok': True})


# === Ukrainian TTS (Silero v5 CIS) ===
UK_MODEL_PATH = os.path.join(SCRIPT_DIR, "tts-model-uk-silero", "v5_cis_base.pt")
UK_SPEAKER = 'ukr_igor'
UK_SAMPLE_RATE = 48000

os.makedirs(os.path.join(SCRIPT_DIR, "tts-model-uk-silero"), exist_ok=True)
if not os.path.isfile(UK_MODEL_PATH):
    print("  Downloading Silero v5 CIS Ukrainian model (~91MB)...")
    torch.hub.download_url_to_file('https://models.silero.ai/models/tts/ru/v5_cis_base.pt', UK_MODEL_PATH)
tts_uk = torch.package.PackageImporter(UK_MODEL_PATH).load_pickle("tts_models", "model")
tts_uk.to(torch.device('cpu'))
print(f"[OK] Ukrainian TTS loaded! (speaker: {UK_SPEAKER})")

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

# === German TTS (Silero v3) ===
os.makedirs(os.path.join(SCRIPT_DIR, "tts-model-de"), exist_ok=True)

print("Loading German TTS model (Silero v3)...")
if not os.path.isfile(DE_MODEL_PATH):
    print("  Downloading Silero v3 German model (~100MB)...")
    torch.hub.download_url_to_file('https://models.silero.ai/models/tts/de/v3_de.pt', DE_MODEL_PATH)

tts_de = torch.package.PackageImporter(DE_MODEL_PATH).load_pickle("tts_models", "model")
tts_de.to(torch.device('cpu'))
DE_SPEAKER = 'bernd_ungerer'
DE_SAMPLE_RATE = 48000
print(f"[OK] German TTS model loaded! (speaker: {DE_SPEAKER})")

# === Spanish TTS (Silero v3) ===
os.makedirs(os.path.join(SCRIPT_DIR, "tts-model-es"), exist_ok=True)

print("Loading Spanish TTS model (Silero v3)...")
if not os.path.isfile(ES_MODEL_PATH):
    print("  Downloading Silero v3 Spanish model (~100MB)...")
    torch.hub.download_url_to_file('https://models.silero.ai/models/tts/es/v3_es.pt', ES_MODEL_PATH)

tts_es = torch.package.PackageImporter(ES_MODEL_PATH).load_pickle("tts_models", "model")
tts_es.to(torch.device('cpu'))
ES_SPEAKER = 'es_0'
ES_SAMPLE_RATE = 48000
print(f"[OK] Spanish TTS model loaded! (speaker: {ES_SPEAKER})")

# === French TTS — now handled by Kokoro sidecar (port 3003) ===
print("[OK] French TTS → Kokoro sidecar")

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

WHISPER_INITIAL_PROMPTS = {
    'ru': 'Говорю по-русски. Пишу кириллицей.',
    'uk': 'Говорю українською. Пишу кирилицею.',
    'de': 'Ich spreche Deutsch.',
    'es': 'Hablo español.',
    'fr': 'Je parle français.',
    'zh': '你好，请问，谢谢，中国，学生，老师',
    'ja': 'こんにちは、ありがとう、日本、東京、学生、先生',
}

def whisper_transcribe(audio_path, lang=None):
    """Transcribe audio using whichever Whisper backend is available.
    If lang is provided, it hints Whisper to expect that language.
    task='transcribe' ensures it writes what was said (no translation).
    initial_prompt forces Cyrillic output for RU/UK to prevent English hallucination."""
    kwargs = {'task': 'transcribe'}
    if lang:
        kwargs['language'] = lang
        if lang in WHISPER_INITIAL_PROMPTS:
            kwargs['initial_prompt'] = WHISPER_INITIAL_PROMPTS[lang]

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

# Single-letter phonetic expansions so Silero can pronounce them
RU_LETTER_PHONETICS = {
    'а': 'а', 'б': 'бэ', 'в': 'вэ', 'г': 'гэ', 'д': 'дэ', 'е': 'е',
    'ё': 'йо', 'ж': 'жэ', 'з': 'зэ', 'и': 'и', 'й': 'й краткое',
    'к': 'ка', 'л': 'эль', 'м': 'эм', 'н': 'эн', 'о': 'о', 'п': 'пэ',
    'р': 'эр', 'с': 'эс', 'т': 'тэ', 'у': 'у', 'ф': 'эф', 'х': 'ха',
    'ц': 'цэ', 'ч': 'чэ', 'ш': 'ша', 'щ': 'ща', 'ъ': 'твёрдый знак',
    'ы': 'ы', 'ь': 'мягкий знак', 'э': 'э', 'ю': 'ю', 'я': 'я',
}
UK_LETTER_PHONETICS = {
    'а': 'а', 'б': 'бе', 'в': 'ве', 'г': 'ге', 'ґ': 'ґе', 'д': 'де',
    'е': 'е', 'є': 'є', 'ж': 'же', 'з': 'зе', 'и': 'и', 'і': 'і',
    'ї': 'ї', 'й': 'йот', 'к': 'ка', 'л': 'ел', 'м': 'ем', 'н': 'ен',
    'о': 'о', 'п': 'пе', 'р': 'ер', 'с': 'ес', 'т': 'те', 'у': 'у',
    'ф': 'еф', 'х': 'ха', 'ц': 'це', 'ч': 'че', 'ш': 'ша', 'щ': 'ща',
    'ь': 'мʼякий знак', 'ю': 'ю', 'я': 'я',
}

DE_LETTER_PHONETICS = {
    'a': 'ah', 'b': 'be', 'c': 'tse', 'd': 'de', 'e': 'eh', 'f': 'ef',
    'g': 'ge', 'h': 'ha', 'i': 'ih', 'j': 'yot', 'k': 'ka', 'l': 'el',
    'm': 'em', 'n': 'en', 'o': 'oh', 'p': 'pe', 'q': 'ku', 'r': 'er',
    's': 'es', 't': 'te', 'u': 'uh', 'v': 'fau', 'w': 've', 'x': 'iks',
    'y': 'ypsilon', 'z': 'tset', 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'es-tset',
}

ES_LETTER_PHONETICS = {
    'a': 'a', 'b': 'be', 'c': 'ce', 'd': 'de', 'e': 'e', 'f': 'efe',
    'g': 'ge', 'h': 'hache', 'i': 'i', 'j': 'jota', 'k': 'ka', 'l': 'ele',
    'm': 'eme', 'n': 'ene', 'ñ': 'eñe', 'o': 'o', 'p': 'pe', 'q': 'cu',
    'r': 'erre', 's': 'ese', 't': 'te', 'u': 'u', 'v': 'uve', 'w': 'uve doble',
    'x': 'equis', 'y': 'ye', 'z': 'zeta',
}

FR_LETTER_PHONETICS = {
    'a': 'a', 'b': 'bé', 'c': 'cé', 'd': 'dé', 'e': 'e', 'f': 'effe',
    'g': 'gé', 'h': 'hache', 'i': 'i', 'j': 'ji', 'k': 'ka', 'l': 'elle',
    'm': 'emme', 'n': 'enne', 'o': 'o', 'p': 'pé', 'q': 'cu', 'r': 'erre',
    's': 'esse', 't': 'té', 'u': 'u', 'v': 'vé', 'w': 'double vé',
    'x': 'ixe', 'y': 'i grec', 'z': 'zède',
}

def expand_single_letter(text, lang):
    """If text is a single letter, expand to its spoken name for TTS."""
    stripped = text.strip()
    if len(stripped) == 1:
        # espeak-ng languages handle single letters natively — skip lookup
        if lang in ('el', 'hi', 'ar', 'ko', 'zh', 'ja'):
            return text
        if lang == 'ru':
            lookup = RU_LETTER_PHONETICS
        elif lang == 'de':
            lookup = DE_LETTER_PHONETICS
        elif lang == 'es':
            lookup = ES_LETTER_PHONETICS
        elif lang == 'fr':
            lookup = FR_LETTER_PHONETICS
        else:
            lookup = UK_LETTER_PHONETICS
        return lookup.get(stripped.lower(), text)
    return text

KOKORO_URL = 'http://localhost:3003/tts'

def proxy_to_kokoro(text, lang):
    """Proxy TTS request to Kokoro sidecar service on port 3003."""
    try:
        print(f"[TTS-Kokoro] Proxying {lang}: {text[:80]}")
        resp = http_requests.post(KOKORO_URL, json={'text': text, 'lang': lang}, timeout=30)
        if resp.status_code != 200:
            print(f"[TTS-Kokoro] Sidecar error {resp.status_code}, falling back to espeak-ng")
            return generate_espeak_tts(text, lang)
        # Write response audio to temp file and serve it
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(resp.content)
            tmp_path = tmp.name
        try:
            return send_file(tmp_path, mimetype='audio/wav')
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    except http_requests.ConnectionError:
        print(f"[TTS-Kokoro] Sidecar not running, falling back to espeak-ng")
        return generate_espeak_tts(text, lang)
    except Exception as e:
        print(f"[TTS-Kokoro] Error: {repr(e)}, falling back to espeak-ng")
        return generate_espeak_tts(text, lang)

def generate_espeak_tts(text, lang):
    """Fallback espeak-ng TTS for any language."""
    import subprocess
    print(f"[TTS-espeak] Generating ({lang}): {text[:80]}")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            ['espeak-ng', '-v', lang, '-s', '150', '-a', '180', '-w', tmp_path, text],
            check=True, capture_output=True
        )
        return send_file(tmp_path, mimetype='audio/wav')
    except subprocess.CalledProcessError as e:
        print(f"[TTS-espeak] Error: {e.stderr.decode()}")
        raise
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

@app.route('/tts', methods=['POST'])
def generate_tts():
    try:
        data = request.get_json()
        text = data.get('text', '')
        lang = data.get('lang', 'uk')

        if not text:
            return {'error': 'Missing text parameter'}, 400

        text = expand_single_letter(text, lang)

        # Kokoro TTS languages — proxy to sidecar on port 3003
        if lang in ('fr', 'hi', 'ja', 'zh'):
            return proxy_to_kokoro(text, lang)
        elif lang == 'ru':
            return generate_russian_tts(text)
        elif lang == 'de':
            return generate_german_tts(text)
        elif lang == 'en':
            return generate_english_tts(text)
        elif lang == 'es':
            return generate_spanish_tts(text)
        elif lang == 'el':
            return generate_greek_tts(text)
        elif lang == 'ar':
            return generate_arabic_tts(text)
        elif lang == 'ko':
            return generate_korean_tts(text)
        else:
            return generate_ukrainian_tts(text)

    except Exception as e:
        print(f"[TTS] Error: {repr(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500

def generate_ukrainian_tts(text):
    text = numbers_to_words(text, lang='uk')
    print(f"[TTS-UK] Generating ({UK_SPEAKER}): {text[:80]}")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    tts_uk.save_wav(text=text, speaker=UK_SPEAKER, sample_rate=UK_SAMPLE_RATE, audio_path=tmp_path)
    try:
        print(f"[TTS-UK] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

EN_NUMBERS = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
    '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
    '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
    '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
    '33': 'thirty three', '100': 'one hundred', '1000': 'one thousand',
}
RU_NUMBERS = {
    '0': 'ноль', '1': 'один', '2': 'два', '3': 'три', '4': 'четыре',
    '5': 'пять', '6': 'шесть', '7': 'семь', '8': 'восемь', '9': 'девять',
    '10': 'десять', '11': 'одиннадцать', '12': 'двенадцать', '13': 'тринадцать',
    '14': 'четырнадцать', '15': 'пятнадцать', '16': 'шестнадцать', '17': 'семнадцать',
    '18': 'восемнадцать', '19': 'девятнадцать', '20': 'двадцать', '30': 'тридцать',
    '33': 'тридцать три', '100': 'сто', '1000': 'тысяча',
}

def numbers_to_words(text, lang='en'):
    """Convert numbers in text to words so Silero TTS can pronounce them."""
    lookup = RU_NUMBERS if lang == 'ru' else EN_NUMBERS
    # For German, num2words handles it natively with lang='de'
    try:
        from num2words import num2words as n2w
        def replace_num(match):
            s = match.group()
            if s in lookup:
                return lookup[s]
            try:
                return n2w(s, lang=lang)
            except Exception:
                return s
        return re.sub(r'\d+', replace_num, text)
    except ImportError:
        return re.sub(r'\d+', lambda m: lookup.get(m.group(), m.group()), text)

def generate_english_tts(text):
    text = numbers_to_words(text, lang='en')
    print(f"[TTS-EN] Generating: {text[:80]}")
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
    text = numbers_to_words(text, lang='ru')
    print(f"[TTS-RU] Generating: {text[:80]}")
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

def generate_german_tts(text):
    text = numbers_to_words(text, lang='de')
    print(f"[TTS-DE] Generating ({DE_SPEAKER}): {text[:80]}")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    tts_de.save_wav(text=text, speaker=DE_SPEAKER, sample_rate=DE_SAMPLE_RATE, audio_path=tmp_path)
    try:
        print(f"[TTS-DE] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def generate_spanish_tts(text):
    text = numbers_to_words(text, lang='es')
    print(f"[TTS-ES] Generating ({ES_SPEAKER}): {text[:80]}")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    tts_es.save_wav(text=text, speaker=ES_SPEAKER, sample_rate=ES_SAMPLE_RATE, audio_path=tmp_path)
    try:
        print(f"[TTS-ES] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def generate_greek_tts(text):
    """Generate Greek TTS using espeak-ng."""
    import subprocess
    print(f"[TTS-EL] Generating (espeak-ng el): {text[:80]}")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            ['espeak-ng', '-v', 'el', '-s', '150', '-a', '180', '-w', tmp_path, text],
            check=True, capture_output=True
        )
        print(f"[TTS-EL] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    except subprocess.CalledProcessError as e:
        print(f"[TTS-EL] espeak-ng error: {e.stderr.decode()}")
        raise
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def generate_arabic_tts(text):
    """Generate Arabic TTS using espeak-ng."""
    import subprocess
    print(f"[TTS-AR] Generating (espeak-ng ar): {text[:80]}")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            ['espeak-ng', '-v', 'ar', '-s', '150', '-a', '180', '-w', tmp_path, text],
            check=True, capture_output=True
        )
        print(f"[TTS-AR] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    except subprocess.CalledProcessError as e:
        print(f"[TTS-AR] espeak-ng error: {e.stderr.decode()}")
        raise
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def generate_korean_tts(text):
    """Generate Korean TTS using espeak-ng."""
    import subprocess
    print(f"[TTS-KO] Generating (espeak-ng ko): {text[:80]}")
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            ['espeak-ng', '-v', 'ko', '-s', '150', '-a', '180', '-w', tmp_path, text],
            check=True, capture_output=True
        )
        print(f"[TTS-KO] Generated successfully")
        return send_file(tmp_path, mimetype='audio/wav')
    except subprocess.CalledProcessError as e:
        print(f"[TTS-KO] espeak-ng error: {e.stderr.decode()}")
        raise
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

KOKORO_PYTHON = os.environ.get('KOKORO_PYTHON', '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3')
KOKORO_SCRIPT = os.path.join(SCRIPT_DIR, 'kokoro-tts.py')
kokoro_process = None

def start_kokoro_sidecar():
    """Launch the Kokoro TTS sidecar on port 3003 using Python 3.12."""
    global kokoro_process
    import subprocess, atexit, signal
    if not os.path.isfile(KOKORO_PYTHON):
        print(f"[WARN] Python 3.12 not found at {KOKORO_PYTHON} — Kokoro disabled, fr/hi/ja/zh will use espeak-ng fallback")
        return
    if not os.path.isfile(KOKORO_SCRIPT):
        print(f"[WARN] kokoro-tts.py not found — Kokoro disabled")
        return
    print("[Kokoro] Starting sidecar (Python 3.12, port 3003)...")
    kokoro_process = subprocess.Popen(
        [KOKORO_PYTHON, KOKORO_SCRIPT],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    # Print sidecar output in a background thread
    import threading
    def stream_output():
        for line in kokoro_process.stdout:
            print(f"[Kokoro] {line.decode().rstrip()}")
    threading.Thread(target=stream_output, daemon=True).start()
    # Kill sidecar when main server exits
    def cleanup():
        if kokoro_process and kokoro_process.poll() is None:
            kokoro_process.terminate()
            kokoro_process.wait(timeout=5)
            print("[Kokoro] Sidecar stopped")
    atexit.register(cleanup)
    signal.signal(signal.SIGTERM, lambda *a: (cleanup(), exit(0)))

if __name__ == '__main__':
    start_kokoro_sidecar()
    print("\n[SPEAKER] TTS + STT Server")
    print("   Silero: uk, ru, en, de, es")
    print("   Kokoro (sidecar :3003): fr, hi, ja, zh")
    print("   espeak-ng: el, ar, ko")
    print(f"   STT: {'enabled' if stt_available else 'disabled (install mlx-whisper)'}")
    print("   Starting on http://localhost:3002\n")
    app.run(host='0.0.0.0', port=3002, debug=False)
