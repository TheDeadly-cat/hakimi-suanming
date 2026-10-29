@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-local-reading-021-candidate.ps1" -OpenSystemBrowser -NoDialogs
set "trialExit=%ERRORLEVEL%"
if not "%trialExit%"=="0" (
  echo The local trial could not start. No existing service or data was replaced.
  echo Please read LOCAL-READING-021-INSTALL.txt and the error above.
  pause
)
exit /b %trialExit%
