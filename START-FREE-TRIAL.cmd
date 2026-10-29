@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-local-trial-candidate.ps1" -OpenSystemBrowser -NoDialogs
set "trialExit=%ERRORLEVEL%"
if not "%trialExit%"=="0" (
  echo The local trial could not start. No existing service or data was replaced.
  echo Please read LOCAL-FREE-TRIAL-INSTALL.txt and the error above.
  pause
)
exit /b %trialExit%
