# FoodHub09 — Arquitetura de Impressão (Simplificada)

> Última atualização: 2026-03-12

---

## 1. Visão Geral

O fluxo de impressão do Caixa (PDV) segue **3 modos mutuamente exclusivos**, configurados em `tenant_print_settings.print_mode`:

| Modo | Canal | Descrição |
|------|-------|-----------|
| `web` | `window.print()` | Diálogo do navegador (iframe oculto) |
| `desktop` | `window.foodhub.printReceipt()` | Impressão silenciosa via Electron (único canal direto) |
| `smartpos` | `print_jobs` table | Fila na nuvem → maquininha faz polling |

**Regra fundamental:** No modo `desktop`, NÃO existe fallback para `window.print()` nem para agentes externos.

---

## 2. Fluxo `handlePrint()` — ReceiptDialog.tsx

```
handlePrint() {
  1. Se print_mode === 'smartpos'
     → INSERT INTO print_jobs → fim

  2. Se print_mode === 'desktop'
     → Se window.foodhub.printReceipt existe
       → IPC → ESC/POS RAW → impressora padrão do Windows
       → fim
     → Senão
       → Mostra erro "App Desktop não detectado"
       → NÃO faz fallback para browser
       → fim

  3. Se print_mode === 'web'
     → buildReceiptHTML() → iframe → window.print()
     → Diálogo do navegador
}
```

---

## 3. Modo Desktop — Cadeia Completa

```
ReceiptDialog.tsx
  → window.foodhub.printReceipt({ lines, printerName: null, silent: true, useDefaultPrinter: true })
    → preload.ts (contextBridge)
      → main.ts (IPC handler)
        → printer.ts
          → buildEscPosBuffer(lines, paperWidth)
          → sendRawToPort(buffer) via winspool.Drv (PowerShell)
            → Impressora padrão do Windows
```

### Arquivos envolvidos
| Arquivo | Descrição |
|---------|-----------|
| `src/components/pos/ReceiptDialog.tsx` | Orquestra impressão, chama `window.foodhub` |
| `desktop-pdv/src/preload.ts` | Expõe `window.foodhub` via contextBridge |
| `desktop-pdv/src/main.ts` | IPC handlers Electron |
| `desktop-pdv/src/printer.ts` | Motor ESC/POS zero-dependency (winspool.Drv) |

### Estratégias de envio ESC/POS (em ordem)
1. **winspool.Drv** — PowerShell `.ps1` com DllImport
2. **Direct port** — `copy /b` para porta USB
3. **UNC share** — `\\localhost\PrinterName`

---

## 4. Modo Web

- `buildReceiptHTML()` gera HTML com CSS térmico (`@page { size: Xmm auto }`)
- `printReceiptHTML()` cria iframe invisível e chama `window.print()`
- Arquivos: `src/lib/thermalPrint.ts`, `src/components/pos/ReceiptPrint.tsx`

---

## 5. Modo SmartPOS

- INSERT em `print_jobs` com payload de linhas
- Edge function `smartpos-jobs` faz claim/ack atômico
- Maquininha faz polling e imprime

---

## 6. Configurações

### Hook `useTenantPrintSettings`
| Campo | Valores |
|-------|---------|
| `print_mode` | `'web'` \| `'desktop'` \| `'smartpos'` |
| `paper_width` | `'58'` \| `'80'` |
| `printer_profile` | `'GENERIC'` \| `'EPSON'` \| `'ELGIN'` \| etc. |

---

## 7. Tipos de Linha do Cupom

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

---

## 8. O que NÃO participa do fluxo do Caixa

| Componente | Status |
|-----------|--------|
| API Local Python (porta 8765) | **Removida** do fluxo principal |
| Print Agent Node.js (porta 8123) | **Não participa** do fluxo do Caixa |
| `src/lib/localPrintApi.ts` | Arquivo mantido mas **não importado** pelo ReceiptDialog |

Estes componentes podem ser usados para outros fins (ex: impressão de cozinha), mas o Caixa usa exclusivamente o Desktop PDV Electron.
