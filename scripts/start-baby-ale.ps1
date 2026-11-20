# Baby Ale — arranque diario (opcional; preferid el .bat en el escritorio)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "============================================"
Write-Host "  Baby Ale — control de stock"
Write-Host "============================================"
Write-Host ""
Write-Host "Carpeta: $ProjectRoot"
Write-Host ""
Write-Host "DEJAD ESTA VENTANA ABIERTA mientras useis la app."
Write-Host "Si la cerráis, la app se apaga."
Write-Host ""
Write-Host "En ESTE PC abrid el navegador en:"
Write-Host "  http://127.0.0.1:43123"
Write-Host ""
Write-Host "Desde el OTRO PC (misma Wi-Fi), abrid:"
Write-Host "  http://babyalestock:43123"
Write-Host "(si no carga, probad http://babyalestock.local:43123)"
Write-Host ""
Write-Host "============================================"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: no se encuentra Node.js."
  Write-Host "Instala Node.js LTS 22 desde https://nodejs.org"
  Read-Host "Pulsad Enter para cerrar"
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Primera vez: instalando dependencias (puede tardar)..."
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en npm install."
    Read-Host "Pulsad Enter para cerrar"
    exit 1
  }
}

if (-not (Test-Path ".next")) {
  Write-Host "Compilando la app (solo la primera vez o tras actualizar)..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en npm run build."
    Read-Host "Pulsad Enter para cerrar"
    exit 1
  }
}

Write-Host "Arrancando... (no cerréis esta ventana)"
Write-Host ""
npm start
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -ne 0) {
  Write-Host "La app se detuvo con un error (código $exitCode)."
  Write-Host "Si no podéis entrar con admin / admin123:"
  Write-Host "  npm run reset-users"
} else {
  Write-Host "La app se ha cerrado."
}
Read-Host "Pulsad Enter para cerrar"
exit $exitCode
