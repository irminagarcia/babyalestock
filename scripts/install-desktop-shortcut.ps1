# Crea un acceso directo en el Escritorio: "Baby Ale — Arrancar"
# Ejecutar UNA vez (clic derecho → Ejecutar con PowerShell), o:
#   powershell -ExecutionPolicy Bypass -File scripts\install-desktop-shortcut.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BatPath = Join-Path $PSScriptRoot "start-baby-ale.bat"

if (-not (Test-Path $BatPath)) {
  Write-Host "ERROR: no se encuentra $BatPath"
  Read-Host "Pulsad Enter para cerrar"
  exit 1
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Baby Ale — Arrancar.lnk"

$Wsh = New-Object -ComObject WScript.Shell
$Shortcut = $Wsh.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Arrancar Baby Ale stock (dejar la ventana abierta)"
$Shortcut.Save()

Write-Host ""
Write-Host "Listo. Acceso directo creado en el Escritorio:"
Write-Host "  $ShortcutPath"
Write-Host ""
Write-Host "Cada día: doble clic en «Baby Ale — Arrancar»."
Write-Host "Dejad la ventana negra abierta y abrid http://127.0.0.1:43123"
Write-Host ""
Read-Host "Pulsad Enter para cerrar"
