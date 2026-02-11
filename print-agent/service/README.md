# FoodHub Print Agent — Guia Rápido

## Instalação (6 passos)

1. **Extraia** o ZIP em uma pasta fixa (ex: `C:\FoodHubPrintAgent`)
2. **Conecte** sua impressora térmica USB e instale o driver dela normalmente
3. **Clique com botão direito** em `install-service.bat` → **Executar como administrador**
4. Acesse o FoodHub pelo navegador e vá em **PDV → Configurações de Impressão**
5. Clique em **Testar Conexão** para verificar que o Agent está online
6. **Selecione sua impressora** na lista e clique em **Imprimir Teste**

## Desinstalar

- Execute `uninstall-service.bat` como administrador

## Solução de problemas

| Problema | Solução |
|----------|---------|
| Agent offline | Verifique se o serviço está rodando: `services.msc` → procure "FoodHub Print Agent" |
| Impressora não aparece | Verifique se o driver está instalado em Dispositivos e Impressoras do Windows |
| Erro de permissão | Execute os `.bat` como Administrador |

## Informações técnicas

- **Porta padrão:** 8123 (http://127.0.0.1:8123)
- **Logs:** `%ProgramData%\FoodHubPrintAgent\logs`
- **Config:** `%ProgramData%\FoodHubPrintAgent\config.json`
- **Modo:** ESC/POS RAW via spooler do Windows
