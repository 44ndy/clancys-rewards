@echo off
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
cd /d "%~dp0\.."
call node_modules\.bin\expo.cmd start --web
