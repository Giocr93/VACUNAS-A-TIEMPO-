@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INICIAR_SERVIDOR.ps1"
if errorlevel 1 (
  echo.
  echo No fue posible iniciar Vacunas a Tiempo.
  pause
)
