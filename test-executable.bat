@echo off
echo =====================================
echo   Testando Executavel
echo =====================================
echo.

set APP_PATH=out\Loan Management System-win32-x64\Loan Management System.exe

if exist "%APP_PATH%" (
    echo Executando aplicacao...
    echo.
    start "" "%APP_PATH%"
    echo Aplicacao iniciada!
) else (
    echo ERRO: Executavel nao encontrado!
    echo.
    echo Execute primeiro: build-executable.bat
    echo.
)

pause
