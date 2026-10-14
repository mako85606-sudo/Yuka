@echo off
rem Loupe : met le code a jour depuis GitHub, puis lance le site sur http://localhost:3000.
rem Un double-clic suffit. Pour arreter le site : Ctrl+C dans cette fenetre, ou fermer la fenetre.
cd /d "%~dp0"

echo.
echo [1/3] Recuperation des nouveautes...
git pull
if errorlevel 1 (
  echo   Mise a jour impossible pour l instant : on lance la version deja presente.
)

echo.
echo [2/3] Installation, quelques secondes si rien n a change...
call npm install --no-fund --no-audit
if errorlevel 1 (
  echo.
  echo   L installation a echoue. Envoie une capture de cette fenetre.
  pause
  exit /b 1
)

echo.
echo [3/3] Lancement du site. Le navigateur va s ouvrir tout seul.
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
call npm run dev
pause
