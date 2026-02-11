# FoodHub Print Agent

Serviço local para impressão 1-clique em impressoras térmicas, sem diálogo do navegador.

## Como funciona

O FoodHub Print Agent roda em segundo plano no Windows e recebe comandos de impressão do PDV via HTTP local (porta 8123). Ele renderiza o cupom como PDF usando Chromium headless e envia silenciosamente para a impressora.

## Requisitos

- Windows 10+ (64-bit)
- Node.js 18+ (apenas para desenvolvimento)
- Impressora térmica configurada como impressora do Windows

## Instalação (Usuário Final)

1. Baixe o instalador `FoodHubPrintAgentSetup.exe`
2. Execute e siga as instruções
3. **Recomendado:** marque "Instalar como Serviço do Windows" para auto-start
4. O Agent inicia automaticamente e fica no background
5. No PDV, vá em **Configurações → Impressora → Modo Agent**
6. Clique em "Detectar" para listar impressoras
7. Teste a conexão clicando em "Testar"

## Modo Serviço do Windows (recomendado)

O instalador oferece a opção de instalar como **Serviço do Windows** usando WinSW. Isso garante:
- ✅ Início automático com o Windows
- ✅ Reinício automático em caso de falha
- ✅ Roda sem janela aberta
- ✅ Funciona mesmo sem login do usuário

### Gerenciar o serviço manualmente

```powershell
# Verificar status
sc query FoodHubPrintAgent

# Parar
net stop FoodHubPrintAgent

# Iniciar
net start FoodHubPrintAgent

# Remover o serviço (como admin)
cd "C:\Program Files\FoodHub Print Agent"
.\FoodHubPrintAgentService.exe stop
.\FoodHubPrintAgentService.exe uninstall
```

### Instalar como serviço manualmente (sem instalador)

```powershell
# Copie FoodHubPrintAgent.exe, FoodHubPrintAgentService.exe e FoodHubPrintAgentService.xml para a mesma pasta
cd "C:\Program Files\FoodHub Print Agent"
.\FoodHubPrintAgentService.exe install
.\FoodHubPrintAgentService.exe start
```

## Desenvolvimento Local

```bash
cd print-agent
npm install
npm run dev
```

O servidor inicia em `http://localhost:8123`.

## Endpoints

### GET /health
Status do agent.
```json
{ "ok": true, "version": "1.0.0", "port": 8123 }
```

### GET /ping
Verificação rápida de conectividade.
```json
{ "pong": true }
```

### GET /impressoras (ou /printers)
Lista impressoras instaladas no Windows.
```json
{ "ok": true, "impressoraPadrao": "EPSON TM-T20X", "impressoras": ["EPSON TM-T20X", "Microsoft Print to PDF"] }
```

### POST /test-print
Imprime cupom de teste.
```json
{ "nomeDaImpressora": "EPSON TM-T20X", "tipo": "caixa", "larguraDoPapel": 80 }
```

Erros guiados:
```json
{ "ok": false, "code": "PRINTER_NOT_FOUND", "message": "Impressora não encontrada..." }
```

### POST /imprimir/recibo (ou /print/receipt)
Imprime cupom real.
```json
{
  "larguraDoPapel": 80,
  "nomeDaImpressora": "EPSON TM-T20X",
  "html": "<html>...</html>"
}
```

## CORS e Private Network Access

O Agent aceita requisições de:
- `https://foodhub09.com.br`
- `https://*.lovable.app`
- `localhost` / `127.0.0.1`

E suporta **Private Network Access (PNA)** do Chrome 104+, respondendo com `Access-Control-Allow-Private-Network: true`.

## Build

```bash
npm run build          # Compila TypeScript
npm run pkg            # Gera executável Windows
```

## Build do Instalador

Requer [Inno Setup](https://jrsoftware.org/isinfo.php) instalado.

```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
```

O instalador é gerado em `dist/FoodHubPrintAgentSetup.exe`.

## Configuração

O Agent salva configurações em:
- **Windows:** `%ProgramData%\FoodHub\print-agent\config.json`

```json
{
  "port": 8123,
  "defaultPrinter": null
}
```

## Troubleshooting

### "Conexão recusada" no PDV
1. Verifique se o Agent está rodando: `sc query FoodHubPrintAgent`
2. Acesse `http://localhost:8123/health` no navegador
3. Se não responder, reinicie: `net stop FoodHubPrintAgent && net start FoodHubPrintAgent`

### Impressão sai com layout errado
1. Verifique se a largura do papel está correta (58mm ou 80mm)
2. No Windows, abra **Impressoras e Scanners** → sua impressora → **Preferências** → confirme o tamanho do papel

### Agent não encontra a impressora
1. Acesse `http://localhost:8123/impressoras` para ver as impressoras detectadas
2. Use o nome exato da impressora no campo "Nome da Impressora" no PDV

### Firewall bloqueando
O instalador tenta abrir a porta 8123 automaticamente. Se necessário:
```powershell
netsh advfirewall firewall add rule name="FoodHub Print Agent" dir=in action=allow protocol=TCP localport=8123
```
