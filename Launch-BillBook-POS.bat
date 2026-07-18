@echo off
title Royal Fashion Mall - POS Billing System Launcher
echo ====================================================
echo Starting Royal Fashion Mall POS Full-Stack Tool...
echo 1. Node.js Business Logic & SQLite Database Backend
echo 2. React POS UI & Desktop Application Frame
echo ====================================================

cd /d "%~dp0"

:: Start Node.js Backend Server in background
start /b node backend/server.js

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

:: Launch Desktop App Window
cmd /c npm --prefix frontend run dev

pause
