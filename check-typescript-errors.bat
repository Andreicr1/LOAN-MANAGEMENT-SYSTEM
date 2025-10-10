@echo off
echo Verificando erros TypeScript...
echo.

REM Navegar para o diretório do projeto
cd /d "%~dp0"

REM Instalar TypeScript globalmente se necessário
where tsc >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando TypeScript globalmente...
    npm install -g typescript
)

REM Executar verificação TypeScript
echo Executando verificacao TypeScript...
echo.
call tsc --noEmit

if %errorlevel% equ 0 (
    echo.
    echo Nenhum erro TypeScript encontrado!
) else (
    echo.
    echo Erros TypeScript encontrados. Veja acima.
)

echo.
pause
