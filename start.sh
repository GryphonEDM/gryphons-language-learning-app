#!/bin/bash

echo "========================================"
echo "  Ukrainian & Russian Typing Game"
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
fi

if ! python3 -c "import ukrainian_tts" &> /dev/null; then
    echo "Installing Python TTS library and dependencies..."
    # Install sentencepiece first (espnet needs it, build can be picky)
    pip install sentencepiece
    # Install espnet and its dependencies
    pip install torch torchaudio espnet
    # Install the Ukrainian TTS library
    cd tts-repo
    pip install -e .
    cd ..

    if ! python3 -c "import ukrainian_tts" &> /dev/null; then
        echo "[WARNING] Ukrainian TTS library not fully installed."
        echo "You may need to install missing dependencies manually."
    fi
else
    echo "Python TTS library already installed."
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
