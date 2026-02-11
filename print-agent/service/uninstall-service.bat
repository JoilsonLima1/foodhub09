@echo off
:: FoodHub Print Agent — Desinstalar Serviço do Windows
:: Execute este script como ADMINISTRADOR

echo ==========================================
echo  FoodHub Print Agent — Desinstalacao
echo ==========================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Execute este script como Administrador!
    pause
    exit /b 1
)

cd /d "%~dp0"

echo [1/2] Parando servico...
FoodHubPrintAgentService.exe stop
timeout /t 3 /nobreak >nul

echo [2/2] Removendo servico...
FoodHubPrintAgentService.exe uninstall

echo.
echo ==========================================
echo  Servico removido com sucesso.
echo ==========================================
pause
