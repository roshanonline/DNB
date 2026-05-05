@echo off
title SmartBoard 360 – Setup & Start
color 0A

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV_PYTHON=%ROOT%.venv\Scripts\python.exe"

if exist "%VENV_PYTHON%" (
	set "PYTHON=%VENV_PYTHON%"
) else (
	set "PYTHON=python"
)

echo ============================================================
echo   SmartBoard 360 – Intelligent Digital Notice Board
echo ============================================================
echo.

:MENU
echo  [1] First-time setup  (install dependencies + create DB)
echo  [2] Start Backend only
echo  [3] Start Frontend only
echo  [4] Start BOTH  (Backend + Frontend)
echo  [5] Exit
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" goto SETUP
if "%choice%"=="2" goto BACKEND
if "%choice%"=="3" goto FRONTEND
if "%choice%"=="4" goto BOTH
if "%choice%"=="5" exit
goto MENU

:SETUP
echo.
echo [SETUP] Installing Python backend dependencies...
pushd "%BACKEND%"
"%PYTHON%" -m pip install -r requirements.txt
echo.
echo [SETUP] Running database migrations...
"%PYTHON%" manage.py makemigrations accounts notices reminders
"%PYTHON%" manage.py migrate
echo.
echo [SETUP] Seeding database with 60 notices + demo users...
"%PYTHON%" seed_data.py
popd
echo.
echo [SETUP] Installing Node.js frontend dependencies...
npm install --prefix "%FRONTEND%"
echo.
echo ============================================================
echo   Setup complete!
echo   Run option 4 to start both servers.
echo ============================================================
pause
goto MENU

:BACKEND
echo.
echo [BACKEND] Starting Django server on http://localhost:8000
start "SmartBoard Backend" cmd /k "cd /d \"%BACKEND%\" && \"%PYTHON%\" manage.py runserver 0.0.0.0:8000"
goto MENU

:FRONTEND
echo.
echo [FRONTEND] Starting React (Vite) on http://localhost:3000
start "SmartBoard Frontend" cmd /k "cd /d \"%FRONTEND%\" && npm run dev"
goto MENU

:BOTH
echo.
echo [STARTING] Backend on :8000 and Frontend on :3000
start "SmartBoard Backend" cmd /k "cd /d \"%BACKEND%\" && \"%PYTHON%\" manage.py runserver 0.0.0.0:8000"
timeout /t 2 /nobreak >nul
start "SmartBoard Frontend" cmd /k "cd /d \"%FRONTEND%\" && npm run dev"
echo.
echo ============================================================
echo   Both servers started!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000/api/
echo   Admin:    http://localhost:8000/admin/
echo ============================================================
pause
goto MENU

