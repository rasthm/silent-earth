# SILENT EARTH - PowerShell Quick Launch Script
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host "  SILENT EARTH -- Rika: The Lullaby of Ash & Bone" -ForegroundColor Yellow
Write-Host "  2-Hour Gothic Dark Dungeon Odyssey (2D Action-Adventure)" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found on your system PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    pause
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies with npm install..." -ForegroundColor Cyan
    npm install
}

Write-Host "Starting Vite local server on http://localhost:5173/..." -ForegroundColor Green
Start-Process "http://localhost:5173/"
npx vite --port 5173 --host
