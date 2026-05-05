# SmartBoard 360 – PowerShell Launcher
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  SmartBoard 360 – Intelligent Digital Notice Board' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

$ROOT = 'C:\Users\rosha\Music\DNB'
$BACKEND = Join-Path $ROOT 'backend'
$FRONTEND = Join-Path $ROOT 'frontend'
$VENV_PYTHON = Join-Path $ROOT '.venv\Scripts\python.exe'

if (Test-Path $VENV_PYTHON) {
    $PYTHON = $VENV_PYTHON
} else {
    $PYTHON = 'python'
}

function Setup {
    Write-Host ''
    Write-Host '[SETUP] Installing Python backend packages...' -ForegroundColor Yellow
    & $PYTHON -m pip install -r (Join-Path $BACKEND 'requirements.txt')

    Write-Host ''
    Write-Host '[SETUP] Running database migrations...' -ForegroundColor Yellow
    & $PYTHON (Join-Path $BACKEND 'manage.py') makemigrations accounts notices reminders
    & $PYTHON (Join-Path $BACKEND 'manage.py') migrate

    Write-Host ''
    Write-Host '[SETUP] Seeding database (60 notices + demo users)...' -ForegroundColor Yellow
    & $PYTHON (Join-Path $BACKEND 'seed_data.py')

    Write-Host ''
    Write-Host '[SETUP] Installing frontend packages...' -ForegroundColor Yellow
    Push-Location $FRONTEND
    npm install
    Pop-Location

    Write-Host ''
    Write-Host 'Setup complete. Run again and choose option 3 to start.' -ForegroundColor Green
}

function StartBackend {
    Write-Host ''
    Write-Host '[BACKEND] Starting Django on http://localhost:8000' -ForegroundColor Green
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$BACKEND'; & '$PYTHON' 'manage.py' runserver 0.0.0.0:8000"
    ) -WindowStyle Normal
}

function StartFrontend {
    Write-Host ''
    Write-Host '[FRONTEND] Starting Vite on http://localhost:3000' -ForegroundColor Green
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$FRONTEND'; npm run dev"
    ) -WindowStyle Normal
}

Write-Host ''
Write-Host '[1] First-time setup'
Write-Host '[2] Start Backend only'
Write-Host '[3] Start Frontend only'
Write-Host '[4] Start BOTH (recommended)'
Write-Host '[5] Exit'
Write-Host ''

$choice = Read-Host 'Enter choice'

switch ($choice) {
    '1' { Setup }
    '2' { StartBackend }
    '3' { StartFrontend }
    '4' {
        StartBackend
        Start-Sleep 2
        StartFrontend
        Write-Host ''
        Write-Host 'Both servers starting!' -ForegroundColor Green
        Write-Host '  Frontend: http://localhost:3000' -ForegroundColor White
        Write-Host '  Backend:  http://localhost:8000/api/' -ForegroundColor White
        Write-Host '  Admin:    http://localhost:8000/admin/' -ForegroundColor White
    }
    '5' { exit }
    default { Write-Host 'Invalid choice' -ForegroundColor Red }
}
