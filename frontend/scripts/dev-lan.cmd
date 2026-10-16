@echo off
REM Metro for a real phone over Wi-Fi (Expo Go), as opposed to dev-web.cmd which
REM only serves the browser build. --lan binds the LAN address instead of
REM localhost, so the phone can reach it; the API host lives in frontend/.env.
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
cd /d "%~dp0\.."
call node_modules\.bin\expo.cmd start --lan
