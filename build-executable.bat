@echo off
echo =====================================
echo   Loan Management System Builder
echo =====================================
echo.

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    echo.
)

REM Instalar dependencias do Electron Forge se necessario
echo Verificando Electron Forge...
call npm list @electron-forge/cli >nul 2>&1
if errorlevel 1 (
    echo Instalando Electron Forge...
    call npm install --save-dev @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-zip fs-extra
    echo.
)

REM Limpar builds anteriores
echo Limpando builds anteriores...
if exist "dist" rmdir /s /q "dist" 2>nul
if exist "dist-electron" rmdir /s /q "dist-electron" 2>nul
if exist "out" rmdir /s /q "out" 2>nul
echo.

REM Compilar React
echo Compilando aplicacao React...
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao compilar React
    pause
    exit /b 1
)
echo.

REM Compilar TypeScript do Electron
echo Compilando arquivos Electron...
call npx tsc -p tsconfig.node.json
echo.

REM Copiar arquivos JS existentes
echo Copiando arquivos de servico e database JS (fallback)...
xcopy /y /q electron\services\*.js dist-electron\services\ >nul 2>&1
xcopy /y /q electron\database\*.js dist-electron\database\ >nul 2>&1
xcopy /y /q electron\utils\*.js dist-electron\utils\ >nul 2>&1
echo.

REM Criar executavel com Electron Forge
echo Criando executavel...
call npx electron-forge make --platform=win32
if errorlevel 1 (
    echo ERRO: Falha ao criar executavel
    pause
    exit /b 1
)

echo.
echo =====================================
echo   Build Concluido com Sucesso!
echo =====================================
echo.
echo Executavel criado em:
echo - Instalador: out\make\squirrel.windows\x64\LoanManagementSystemSetup.exe
echo - ZIP: out\make\zip\win32\x64\
echo - Aplicacao: out\Loan Management System-win32-x64\Loan Management System.exe
echo.
pause
