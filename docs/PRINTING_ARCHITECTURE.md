# FoodHub09 — Arquitetura Completa de Impressão

> Última atualização: 2026-03-12

---

## 📁 Lista Completa de Arquivos

| # | Caminho | Descrição |
|---|---------|-----------|
| 1 | `src/lib/thermalPrint.ts` | CSS térmico + `printReceiptHTML()` + `buildReceiptHTML()` (modo web) |
| 2 | `src/lib/localPrintApi.ts` | Cliente HTTP para API local Python (127.0.0.1:8765) |
| 3 | `src/components/pos/ReceiptDialog.tsx` | Dialog principal "Imprimir" — orquestra todos os modos |
| 4 | `src/components/pos/ReceiptPrint.tsx` | Componente React de preview do cupom (visual HTML) |
| 5 | `src/components/settings/PrinterSettings.tsx` | Tela de configuração de impressora (modo/papel/setores) |
| 6 | `src/components/settings/SectorCard.tsx` | Card de setor (caixa/cozinha/bar) com vinculação de impressoras |
| 7 | `src/components/settings/DefaultPrinterCallout.tsx` | Dica dismissível sobre impressora padrão |
| 8 | `src/components/settings/PrinterHelpModal.tsx` | Modal de ajuda |
| 9 | `src/hooks/useTenantPrintSettings.ts` | Hook: `print_mode`, `paper_width`, `printer_profile` (BD + cache) |
| 10 | `src/hooks/useDesktopPdvSettings.ts` | Hook: URLs de download do desktop |
| 11 | `src/hooks/usePrinterRoutes.ts` | Hook: setores (caixa/cozinha/bar) + impressoras vinculadas |
| 12 | `src/types/foodhub-desktop.d.ts` | Tipagem da bridge `window.foodhub` |
| 13 | `desktop-pdv/src/main.ts` | Electron main process — IPC handlers |
| 14 | `desktop-pdv/src/preload.ts` | Electron preload — expõe `window.foodhub` |
| 15 | `desktop-pdv/src/printer.ts` | Motor ESC/POS zero-dependency (winspool.Drv via PowerShell) |
| 16 | `desktop-pdv/src/config.ts` | Configuração local do Electron (%APPDATA%) |
| 17 | `desktop-pdv/src/updater.ts` | Auto-updater via GitHub Releases |
| 18 | `print-agent/src/index.ts` | Servidor Express do Print Agent Node.js (porta 8123) |
| 19 | `print-agent/src/config.ts` | Config do Print Agent (%ProgramData%) |
| 20 | `print-agent/src/print-engine.ts` | Motor ESC/POS via `node-thermal-printer` |
| 21 | `print-agent/src/routes/health.ts` | GET /health, /status, /ping, /diagnostic |
| 22 | `print-agent/src/routes/printers.ts` | GET /printers, POST /printers/default |
| 23 | `print-agent/src/routes/print.ts` | POST /print, POST /test-print |
| 24 | `supabase/functions/smartpos-jobs/index.ts` | Edge function: claim/ack de print_jobs |

---

## 1. MODO WEB (`print_mode: 'web'`)

### Fluxo
```
Clique "Imprimir"
  → handlePrint()
    → handleBrowserPrint()
      → buildReceiptHTML() — gera HTML do cupom
      → printReceiptHTML() — cria iframe oculto + window.print()
        → Diálogo de impressão do navegador
```

### Arquivos envolvidos
- `src/components/pos/ReceiptDialog.tsx` — `handleBrowserPrint()` (linhas 311-340)
- `src/lib/thermalPrint.ts` — `printReceiptHTML()` + `buildReceiptHTML()`
- `src/components/pos/ReceiptPrint.tsx` — componente visual de preview

### Como funciona
1. `buildReceiptHTML()` gera HTML com header, itens, totais, pagamento, footer
2. `printReceiptHTML()` cria um `<iframe>` invisível com CSS `@page { size: 58mm/80mm auto }`
3. Chama `iframe.contentWindow.print()` — **abre diálogo do navegador**
4. Remove iframe após 2 segundos

### CSS térmico (`thermalPrint.ts`)
- `@page { size: Xmm auto; margin: 0; }`
- Font: `Courier New`, monospace
- Font-size: 10px (58mm) ou 12px (80mm)
- Classes: `.receipt`, `.row`, `.separator`, `.cut-line`, `.total-row`

---

## 2. MODO DESKTOP (`print_mode: 'desktop'`)

### Fluxo
```
Clique "Imprimir"
  → handlePrint()
    → (tenta API local primeiro, se disponível)
    → handleDesktopPrint()
      → window.foodhub.printReceipt({ lines, printerName: null, silent: true, useDefaultPrinter: true })
        → IPC (Electron)
          → printer.ts → printReceipt()
            → buildEscPosBuffer() — constrói buffer ESC/POS manualmente
            → sendRawToPort()
              → Strategy 1: sendViaWinspool() — PowerShell .ps1 + winspool.Drv (DllImport)
              → Strategy 2: sendDirectToPort() — copy /b ou fs write
              → Strategy 3: UNC share \\localhost\printer
                → Impressora física
```

### 2.1 Preload (`desktop-pdv/src/preload.ts`)

Expõe `window.foodhub` via `contextBridge.exposeInMainWorld`:

| Método | Descrição |
|--------|-----------|
| `isDesktop()` | Retorna `true` |
| `getPrinters()` | Lista impressoras USB físicas via PnP + Win32_Printer |
| `getDefaultPrinter()` | Retorna nome da impressora padrão do Windows |
| `setDefaultPrinter(name)` | Salva no config local |
| `printReceipt(payload.(lines, printerName, paperWidth, silent, useDefaultPrinter))` | Imprime ESC/POS RAW |
| `printTest()` | Imprime cupom de teste |
| `getStatus()` | Diagnóstico: versão, impressoras, padrão |

### 2.2 Main Process (`desktop-pdv/src/main.ts`)

#### IPC Handler `foodhub:
`
```typescript
ipcMain.handle('foodhub:printReceipt', async (_event, payload) => {
  const shouldUseDefaultPrinter = payload.useDefaultPrinter === true || payload.printerName === null;
  const silent = payload.silent !== false; // default: true
  return await printReceipt(payload.lines, {
    printerName: shouldUseDefaultPrinter ? null : normalizedPrinterName,
    paperWidth: payload.paperWidth || 80,
    silent,
    useDefaultPrinter: shouldUseDefaultPrinter,
  });
});
```

#### IPC Handler `foodhub:getPrinters`
1. Verifica USB físico via `Get-PnpDevice` (USBPRINT + Status OK)
2. Se nenhum USB → retorna `[]`
3. Lista `Win32_Printer` apenas em portas USB
4. Filtra virtuais (PDF, XPS, OneNote, etc.)
5. Deduplica nomes

### 2.3 Motor ESC/POS (`desktop-pdv/src/printer.ts`)

**Zero dependencies.** Constrói buffers ESC/POS manualmente.

#### Constantes ESC/POS
```typescript
const CMD = {
  INIT: Buffer.from([0x1B, 0x40]),        // ESC @ — Initialize
  ALIGN_LEFT: Buffer.from([0x1B flatMap, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),
  BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
  CUT: Buffer.from([0x1D, 0x56, 0x00]),
  PARTIAL_CUT: Buffer.from([0x1D, 0x56, 0x01]),
  FEED: Buffer.from([0x0A]),
};
```

#### `printReceipt(lines, options)` (função principal)
1. Resolve impressora: nome dado OU `getWindowsDefaultPrinter()`
2. Busca porta: `getPrinterPort()` via PowerShell `Get-Printer`
3. Constrói buffer: `buildEscPosBuffer(lines, paperWidth)`
4. Envia: `sendRawToPort(buffer, printerName, portName, jobId)`

#### Estratégias de envio (em ordem)
1. **winspool.Drv** (Primária) — PowerShell script `.ps1` com DllImport do `winspool.Drv`:
   - `OpenPrinter` → `StartDocPrinter` → `WritePrinter` → `EndDocPrinter` → `ClosePrinter`
2. **Direct port** (Fallback 1) — `copy /b file "\\.\USBxxx"` ou `fs.writeFileSync`
3. **UNC share** (Fallback 2) — `copy /b file "\\localhost\PrinterName"`

### 2.4 Renderer (`ReceiptDialog.tsx`)

```typescript
const handleDesktopPrint = async () => {
  if (!window.foodhub?.printReceipt) {
    setShowDesktopFallback(true);
    return; // Mostra aviso, NÃO faz fallback para browser
  }
  const result = await window.foodhub.printReceipt({
    lines: buildReceiptLines(),
    printerName: null,       // usa padrão do sistema
    paperWidth: pw,
    silent: true,            // obrigatório
    useDefaultPrinter: true, // obrigatório
  });
};
```

---

## 3. API LOCAL — Python (porta 8765)

### Arquivo: `src/lib/localPrintApi.ts`

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Verifica se o agente está rodando |
| `/printers` | GET | Lista impressoras disponíveis |
| `/config` | GET | Configuração atual (impressora selecionada, etc.) |
| `/config/select-printer` | POST | Seleciona impressora |
| `/print/receipt` | POST | Imprime cupom |
| `/print/test` | POST | Página de teste |

### Payload do POST `/print/receipt`
```json
{
  "paper_width": 80,
  "use_saved_printer": true,
  "use_windows_default_if_missing": true,
  "lines": [
    { "type": "bold", "value": "PEDIDO #123", "align": "center" },
    { "type": "separator" },
    { "type": "pair", "left": "2x X-Burguer", "right": "R$ 51,80" },
    { "type": "cut" }
  ]
}
```

### Detecção
No `ReceiptDialog`, um `useEffect` chama `LocalPrintApi.checkHealth()` ao montar o componente. Se retorna `true`, a API local é priorizada sobre o Electron.

---

## 4. Print Agent Node.js (porta 8123)

### Arquivos: `print-agent/src/`

Servidor Express independente, roda como serviço Windows.

| Rota | Método | Descrição |
|------|--------|-----------|
| `/health` | GET | Health check + versão |
| `/status` | GET | Backward compat |
| `/ping` | GET | Pong |
| `/diagnostic` | GET | Diagnóstico completo |
| `/printers` | GET | Lista impressoras + padrão |
| `/impressoras` | GET | Alias PT-BR |
| `/printers/default` | POST | Salva impressora padrão |
| `/print` | POST | Imprime cupom ESC/POS |
| `/test-print` | POST | Cupom de teste |

### Motor: `print-engine.ts`
Usa `node-thermal-printer` (v4.4.2) com interface `printer:NomeDaImpressora` ou `printer:auto`.

### CORS / Private Network Access
Aceita origens: `foodhub09.com.br`, `*.lovable.app`, `localhost`, `127.0.0.1`.
Responde `Access-Control-Allow-Private-Network: true` para Chrome 104+.

### HTTPS
Gera certificado auto-assinado (`cert-manager.ts`). HTTPS na porta 8123, HTTP debug na 8124.

---

## 5. MODO SMARTPOS (`print_mode: 'smartpos'`)

### Fluxo
```
Clique "Imprimir"
  → handleSmartPosPrint()
    → INSERT INTO print_jobs (tenant_id, payload, priority, job_type: 'RECEIPT')
      → Maquininha faz polling via Edge Function
        → POST /claim → claim_print_jobs RPC (FOR UPDATE SKIP LOCKED)
        → Maquininha imprime
        → POST /{jobId}/ack → status: 'printed' | 'failed'
```

### Tabela `print_jobs`
Campos: `id`, `tenant_id`, `device_id`, `source`, `job_type`, `payload`, `status`, `priority`, `attempts`, `max_attempts`, `available_at`, `claimed_at`, `printed_at`, `last_error`

### Edge Function: `supabase/functions/smartpos-jobs/index.ts`
- Autenticação: HMAC-SHA256 via `SERVER_DEVICE_SECRET`
- `POST /claim` — reclama jobs pendentes (atômico)
- `POST /{jobId}/ack` — confirma impressão
- Backoff exponencial em falha: `2^attempts * 5000ms`
- Registra eventos em `device_events`

---

## 6. CONFIGURAÇÕES

### Hook `useTenantPrintSettings`
- Tabela: `tenant_print_settings`
- RPC: `get_or_create_tenant_print_settings`
- Cache: `localStorage` key `printSettings:{tenantId}`

| Campo | Valores | Descrição |
|-------|---------|-----------|
| `print_mode` | `'web'` \| `'desktop'` \| `'smartpos'` | Modo de impressão |
| `paper_width` | `'58'` \| `'80'` | Largura do papel em mm |
| `printer_profile` | `'GENERIC'` \| `'EPSON'` \| `'ELGIN'` \| `'BEMATECH'` \| `'DARUMA'` \| `'TOMATE'` | Perfil da impressora |
| `default_printer_name` | `string \| null` | Nome da impressora padrão |
| `kitchen_printer_name` | `string \| null` | Impressora da cozinha |
| `bar_printer_name` | `string \| null` | Impressora do bar |
| `agent_endpoint` | `string \| null` | Endpoint do agente local |

### Hook `usePrinterRoutes`
- Tabela: `printer_routes`
- Setores base (auto-criados, não removíveis): `caixa`, `cozinha`, `bar`
- Cada setor tem `printers: string[]` (múltiplas impressoras)
- `resolveRouteKey('caixa')` → retorna array de nomes

### Hook `useDesktopPdvSettings`
- Tabela: `system_settings`
- Campos: `desktop_pdv_windows_url`, `desktop_pdv_mac_url`, `desktop_pdv_default_port`

---

## 7. FLUXO COMPLETO — `handlePrint()`

```
handlePrint() {
  1. Se print_mode === 'smartpos'
     → INSERT INTO print_jobs → fim

  2. Se API local Python disponível (porta 8765)
     → POST /print/receipt
     → Se OK → fim
     → Se falha → continua

  3. Se window.foodhub.printReceipt existe (Electron)
     → IPC → ESC/POS RAW → impressora
     → fim

  4. Se print_mode === 'desktop' mas nenhum agente
     → Mostra aviso "Nenhum agente detectado"
     → NÃO faz fallback para browser
     → fim

  5. Se print_mode === 'web'
     → buildReceiptHTML() → iframe → window.print()
     → Diálogo do navegador
}
```

---

## 8. TIPOS DE LINHA DO CUPOM (`ReceiptLine`)

```typescript
interface ReceiptLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  left?: string;   // para type 'pair'
  right?: string;  // para type 'pair'
  lines?: number;  // para type 'feed'
}
```

Usado identicamente em:
- Frontend (ReceiptDialog)
- Electron (printer.ts)
- Print Agent Node (print-engine.ts)
- API Local Python (localPrintApi.ts)
- SmartPOS (print_jobs payload)

---

## 9. DIAGNÓSTICO

O botão "Diagnóstico" no `ReceiptDialog` verifica:
1. Modo atual (`print_mode`)
2. Desktop PDV conectado (`window.foodhub`)
3. Versão do app, impressoras detectadas, impressora padrão (via `getStatus()`)
4. API Local Python (via `checkHealth()` + `getConfig()`)

O `PrinterSettings` tem detecção de impressoras via bridge que lista USB reais e filtra virtuais.

---

## 10. NOTA SOBRE DOIS AGENTES

Existem **dois** agentes de impressão no projeto:

| Agente | Porta | Tecnologia | Motor |
|--------|-------|------------|-------|
| API Local Python | 8765 | Python (externo) | Desconhecido (integrado via HTTP) |
| Print Agent Node.js | 8123 | Node.js + Express | `node-thermal-printer` |

O `localPrintApi.ts` comunica com a API Python (8765).
O `print-agent/` é o agente Node.js (8123) que é instalado como serviço Windows.
O Electron Desktop (`desktop-pdv/`) tem seu próprio motor ESC/POS embutido (zero-dependency).
