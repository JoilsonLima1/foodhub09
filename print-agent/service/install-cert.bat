@echo off
:: FoodHub Print Agent — Instalar Certificado no Windows
:: Execute este script como ADMINISTRADOR

echo ==========================================
echo  FoodHub Print Agent — Certificado HTTPS
echo ==========================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Execute este script como Administrador!
    echo Clique com botao direito e selecione "Executar como administrador".
    pause
    exit /b 1
)

set CERT_FILE=%ProgramData%\FoodHubPrintAgent\certs\agent.crt

if not exist "%CERT_FILE%" (
    echo.
    echo [ERRO] Certificado nao encontrado em:
    echo   %CERT_FILE%
    echo.
    echo Execute o Print Agent uma vez para gerar o certificado automaticamente.
    echo   FoodHubPrintAgent.exe
    echo.
    pause
    exit /b 1
)

echo.
echo [1/2] Instalando certificado no Trusted Root...
certutil -addstore -f "Root" "%CERT_FILE%"
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao instalar certificado.
    pause
    exit /b 1
)

echo.
echo [2/2] Certificado instalado com sucesso!
echo.
echo O browser agora confiara no Agent em:
echo   https://127.0.0.1:8123
echo   https://localhost:8123
echo.
echo ==========================================
echo  IMPORTANTE: Reinicie o navegador para
echo  que a mudanca tenha efeito!
echo ==========================================
pause
