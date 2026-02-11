@echo off
:: FoodHub Print Agent — Instalar como Serviço do Windows
:: Execute este script como ADMINISTRADOR

echo ==========================================
echo  FoodHub Print Agent — Instalacao
echo ==========================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Execute este script como Administrador!
    echo Clique com botao direito e selecione "Executar como administrador".
    pause
    exit /b 1
)

cd /d "%~dp0"

echo [1/3] Instalando servico...
FoodHubPrintAgentService.exe install
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao instalar o servico.
    pause
    exit /b 1
)

echo [2/3] Iniciando servico...
FoodHubPrintAgentService.exe start
if %errorLevel% neq 0 (
    echo [AVISO] Servico instalado mas nao iniciou. Tente iniciar manualmente.
)

echo [3/3] Configurando inicio automatico...
sc config FoodHubPrintAgent start= delayed-auto >nul 2>&1

echo.
echo ==========================================
echo  Servico instalado e iniciado com sucesso!
echo  HTTPS: https://127.0.0.1:8123
echo  HTTP debug: http://127.0.0.1:8124
echo.
echo  IMPORTANTE: Execute install-cert.bat para
echo  instalar o certificado no navegador!
echo ==========================================
pause
