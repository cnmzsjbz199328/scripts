@echo off
rem Double-click launcher for joycon-play.ps1 (BladeTrinity + Joy-Con 2). Arguments pass through.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0joycon-play.ps1" %*
if errorlevel 1 pause
