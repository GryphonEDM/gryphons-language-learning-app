#!/bin/bash

echo "========================================"
echo "  Ukrainian, Russian & German Typing Game"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Install with: brew install node"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed!"
    echo "Install with: brew install python"
    exit 1
fi

echo "[1/6] Checking Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install Node.js dependencies"
        exit 1
    fi
    echo "Node.js dependencies installed successfully!"
else
    echo "Node.js dependencies already installed."
fi
echo ""

echo "[2/6] Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        exit 1
    fi
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

# Activate the venv
source .venv/bin/activate
echo "Virtual environment activated ($(python3 --version))"
echo ""

echo "[3/6] Checking Python TTS dependencies..."
if ! python3 -c "import flask" &> /dev/null; then
    echo "Installing Flask..."
    pip install flask flask-cors
else
    echo "Flask already installed."
fi

if ! python3 -c "import torch" &> /dev/null; then
    echo "Installing PyTorch (required for all TTS models)..."
    pip install torch
else
    echo "PyTorch already installed."
fi

if ! python3 -c "import flask_jwt_extended" &> /dev/null; then
    echo "Installing auth dependencies..."
    pip install flask-jwt-extended bcrypt
else
    echo "Auth dependencies already installed."
fi

if ! python3 -c "import num2words" &> /dev/null; then
    echo "Installing num2words..."
    pip install num2words
else
    echo "num2words already installed."
fi

if ! python3 -c "import requests" &> /dev/null; then
    echo "Installing requests..."
    pip install requests
else
    echo "requests already installed."
fi

if ! python3 -c "from silma_tts.api import SilmaTTS" &> /dev/null; then
    echo "Installing SILMA TTS (Arabic)..."
    pip install onnxruntime
    pip install catt-tashkeel --no-deps
    pip install silma-tts --no-deps
    pip install vocos cached_path ema_pytorch torchdiffeq x_transformers transformers_stream_generator unidecode pydub safetensors torchcodec matplotlib 'antlr4-python3-runtime==4.9.3'
    # Patch nemo_text_processing import (doesn't build on macOS)
    SILMA_UTILS=$(python3 -c "from importlib.resources import files; print(files('silma_tts').joinpath('infer/utils_infer.py'))" 2>/dev/null)
    if [ -n "$SILMA_UTILS" ] && grep -q "^from nemo_text_processing" "$SILMA_UTILS"; then
        sed -i '' 's/^from nemo_text_processing.text_normalization.normalize import Normalizer/try:\n    from nemo_text_processing.text_normalization.normalize import Normalizer\nexcept ImportError:\n    Normalizer = None/' "$SILMA_UTILS"
        # Also guard normalize_text function
        sed -i '' '/def normalize_text/,/return nemo_normalizer.normalize/{s/return nemo_normalizer.normalize/if nemo_normalizer is None:\n        return text\n    return nemo_normalizer.normalize/}' "$SILMA_UTILS"
        # Guard load_nemo_text_normalizer
        sed -i '' '/def load_nemo_text_normalizer/,/lang = detect/{s/lang = detect/if Normalizer is None:\n        return None\n    lang = detect/}' "$SILMA_UTILS"
    fi
else
    echo "SILMA TTS already installed."
fi
echo ""

echo "[4/6] Checking Whisper STT dependencies..."
# Detect platform and install the right Whisper backend
if [[ "$(uname)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
    # macOS Apple Silicon — use MLX Whisper
    if ! python3 -c "import mlx_whisper" &> /dev/null; then
        echo "Installing MLX Whisper (Apple Silicon optimized)..."
        pip install mlx-whisper
    else
        echo "MLX Whisper already installed."
    fi
else
    # Linux or Intel Mac — use faster-whisper
    if ! python3 -c "from faster_whisper import WhisperModel" &> /dev/null; then
        echo "Installing faster-whisper..."
        pip install faster-whisper
    else
        echo "faster-whisper already installed."
    fi
fi
echo ""

echo "[5/6] Starting Python TTS + STT Server..."
echo "Starting on http://localhost:3002"
python3 tts-server.py &
TTS_PID=$!

sleep 3
echo ""

echo "[6/6] Starting Vite Development Server..."
echo "Starting on http://localhost:5173"
npm run dev &
VITE_PID=$!

sleep 5
echo ""

echo ""
echo "========================================"
echo "  Application Started Successfully!"
echo "========================================"
echo ""
echo "  Web App:      http://localhost:5173"
echo "  TTS/STT:      http://localhost:3002"
echo "  LM Studio:    http://localhost:1234 (start separately)"
echo ""
echo "  For Chat Practice, start LM Studio"
echo "  with a model loaded on port 1234."
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "========================================"
echo ""

# Trap Ctrl+C to kill both background processes
trap "echo ''; echo 'Shutting down...'; kill $TTS_PID $VITE_PID 2>/dev/null; exit 0" INT TERM

# Wait for either process to exit
wait
