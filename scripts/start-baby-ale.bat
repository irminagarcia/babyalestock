@echo off
chcp 65001 >nul
setlocal
title Baby Ale — stock

REM Ir a la carpeta del proyecto (este .bat está en scripts\)
cd /d "%~dp0.."
if errorlevel 1 (
  echo.
  echo ERROR: no se pudo abrir la carpeta del proyecto.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Baby Ale — control de stock
echo ============================================
echo.
echo Carpeta: %CD%
echo.
echo DEJAD ESTA VENTANA ABIERTA mientras useis la app.
echo Si la cerráis, la app se apaga.
echo.
echo En ESTE PC abrid el navegador en:
echo   http://127.0.0.1:43123
echo.
echo Desde el OTRO PC ^(misma Wi-Fi^), abrid:
echo   http://babyalestock:43123
echo ^(si no carga, probad http://babyalestock.local:43123^)
echo.
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: no se encuentra Node.js.
  echo Instala Node.js LTS 22 desde https://nodejs.org
  echo Cerrad y abrid de nuevo esta ventana después de instalar.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Primera vez: instalando dependencias ^(puede tardar^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR en npm install. Copiad el mensaje y pedid ayuda.
    echo.
    pause
    exit /b 1
  )
)

if not exist ".next\" (
  echo Compilando la app ^(solo la primera vez o tras actualizar^)...
  call npm run build
  if errorlevel 1 (
    echo.
    echo ERROR en npm run build. Copiad el mensaje y pedid ayuda.
    echo.
    pause
    exit /b 1
  )
)

echo Arrancando... ^(no cerréis esta ventana^)
echo.
call npm start
set EXITCODE=%ERRORLEVEL%

echo.
if not "%EXITCODE%"=="0" (
  echo La app se detuvo con un error ^(código %EXITCODE%^).
  echo Si no podéis entrar con admin / admin123, ejecutad en esta carpeta:
  echo   npm run reset-users
  echo y volved a abrir este acceso directo.
) else (
  echo La app se ha cerrado.
)
echo.
pause
exit /b %EXITCODE%
