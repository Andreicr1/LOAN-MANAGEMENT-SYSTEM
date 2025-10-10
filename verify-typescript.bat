@echo off
echo =====================================
echo   Verificando Erros TypeScript
echo =====================================
echo.

REM Verificar se TypeScript está instalado globalmente
where tsc >nul 2>&1
if %errorlevel% neq 0 (
    echo TypeScript nao encontrado globalmente.
    echo Usando npx para executar...
    echo.
    npx --package typescript tsc --noEmit
) else (
    echo Executando verificacao TypeScript...
    echo.
    tsc --noEmit
)

if %errorlevel% equ 0 (
    echo.
    echo =====================================
    echo   SUCESSO: Nenhum erro TypeScript!
    echo =====================================
) else (
    echo.
    echo =====================================
    echo   ERRO: Foram encontrados erros TypeScript
    echo =====================================
)

echo.
pause
