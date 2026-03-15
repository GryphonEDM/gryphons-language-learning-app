@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Ukrainian ^& Russian Typing Game
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed!
    echo Please install Python from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [1/6] Checking Node.js dependencies...
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    echo Node.js dependencies installed successfully!
) else (
    echo Node.js dependencies already installed.
)
echo.

echo [2/6] Setting up Python virtual environment...
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

:: Activate the venv
call .venv\Scripts\activate.bat
echo Virtual environment activated.
echo.

echo [3/6] Checking Python TTS dependencies...
python -c "import flask" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing Flask...
    pip install flask flask-cors
)

python -c "import ukrainian_tts" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing Python TTS library and dependencies...
    pip install sentencepiece
    pip install torch torchaudio espnet
    cd tts-repo
    pip install -e .
    cd ..

    python -c "import ukrainian_tts" >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Ukrainian TTS library not fully installed.
        echo You may need to install missing dependencies manually.
    )
) else (
    echo Python TTS library already installed.
)
echo.

echo [4/6] Checking Whisper STT dependencies...
python -c "from faster_whisper import WhisperModel" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing faster-whisper...
    pip install faster-whisper
) else (
    echo faster-whisper already installed.
)
echo.

echo [5/6] Starting Python TTS + STT Server...
echo Starting on http://localhost:3002
start "TTS + STT Server" cmd /k "call .venv\Scripts\activate.bat && python tts-server.py"

:: Wait for TTS server to start
echo Waiting for TTS/STT server to initialize...
timeout /t 3 /nobreak >nul
echo.

echo [6/6] Starting Vite Development Server...
echo Starting on http://localhost:5173
start "Vite Dev Server" cmd /k "npm run dev"

:: Wait for Vite server to start
echo Waiting for Vite server to initialize...
timeout /t 5 /nobreak >nul
echo.

echo.
echo ========================================
echo   Application Started Successfully!
echo ========================================
echo.
echo   Web App:      http://localhost:5173
echo   TTS/STT:      http://localhost:3002
echo   LM Studio:    http://localhost:1234 (start separately)
echo.
echo   For Chat Practice, start LM Studio
echo   with a model loaded on port 1234.
echo.
echo   Two command windows have been opened:
echo   - TTS + STT Server
echo   - Vite Dev Server
echo.
echo   Close those windows to stop the servers.
echo   This window can be closed now.
echo ========================================
echo.
pause
