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
3. O Agent inicia automaticamente e fica no background
4. No PDV, vá em **Configurações → Impressora → Modo Agent**
5. Teste a conexão clicando em "Testar Conexão"

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

### GET /printers
Lista impressoras instaladas no Windows.
```json
{ "ok": true, "printers": [{ "name": "EPSON TM-T20X", "isDefault": true }] }
```

### POST /print/test
Imprime cupom de teste.
```json
{ "paperWidth": 80, "printerName": "EPSON TM-T20X" }
```

### POST /print/receipt
Imprime cupom real.
```json
{
  "paperWidth": 80,
  "printerName": "EPSON TM-T20X",
  "html": "<html>...</html>"
}
```

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
1. Verifique se o Agent está rodando (ícone na barra de tarefas)
2. Acesse `http://localhost:8123/health` no navegador
3. Se não responder, reinicie o Agent

### Impressão sai com layout errado
1. Verifique se a largura do papel está correta (58mm ou 80mm)
2. No Windows, abra **Impressoras e Scanners** → sua impressora → **Preferências** → confirme o tamanho do papel

### Agent não encontra a impressora
1. Acesse `http://localhost:8123/printers` para ver as impressoras detectadas
2. Use o nome exato da impressora no campo "Nome da Impressora" no PDV

### Firewall bloqueando
O instalador tenta abrir a porta 8123 automaticamente. Se necessário:
```powershell
netsh advfirewall firewall add rule name="FoodHub Print Agent" dir=in action=allow protocol=TCP localport=8123
```
