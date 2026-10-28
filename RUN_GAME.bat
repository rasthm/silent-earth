@echo off
title SILENT EARTH - Rika: The Lullaby of Ash ^& Bone
color 0E

echo =====================================================================
echo   SILENT EARTH -- Rika: The Lullaby of Ash ^& Bone
echo   2-Hour Gothic Dark Dungeon Odyssey (2D Action-Adventure)
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found on your system PATH!
    echo Please install Node.js from https://nodejs.org/ (version 18 or newer).
    pause
    exit /b 1
)

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)

echo [3/3] Launching Game Server on http://localhost:5173/ ...
echo.
echo ---------------------------------------------------------------------
echo   Opening browser in 2 seconds...
echo   Press [Ctrl + C] in this window to stop the server when done.
echo ---------------------------------------------------------------------
echo.

start "" "http://localhost:5173/"
call npx vite --port 5173 --host

pause
