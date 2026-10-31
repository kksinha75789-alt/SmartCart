@echo off
title SmartCart - Advanced Smart Order Processing Platform
echo ===============================================================================
echo            SMARTCART - ADVANCED SMART ORDER PROCESSING PLATFORM
echo          Cloud Computing, Microservices & High-Concurrency Capstone
echo ===============================================================================
echo.
echo [1/3] Verifying Node.js runtime environment...
node.cmd -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Opening SmartCart directly in your default browser...
    start "" "%~dp0index.html"
    goto finish
)

echo [2/3] Starting SmartCart Microservices API Gateway on Port 3000...
start "SmartCart Backend Server" cmd /k "node.cmd server.js"

echo [3/3] Launching Web Application in browser...
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:3000"

:finish
echo.
echo ===============================================================================
echo  Application is running!
echo  - Web Application:         http://localhost:3000
echo  - System Health:           http://localhost:3000/api/system/health
echo  - Standalone File:         %~dp0index.html
echo  - Architecture Docs:       %~dp0docs\ARCHITECTURE.md
echo  - Postman Collection:      %~dp0docs\SmartCart_Postman_Collection.json
echo  - Automated Concurrency:   node.cmd test_concurrency.js
echo ===============================================================================
pause
