
# Plano de Implementação

Este plano abrange três funcionalidades: **notificações por email quando metas são atingidas**, **dashboard específico para entregadores**, e **previsão de vendas com inteligência artificial**.

---

## 1. Notificações por Email para Metas Atingidas

### O que será feito
Quando uma meta de vendas (diária ou semanal) for atingida, o sistema enviará automaticamente um email de celebração para os gestores do restaurante.

### Componentes técnicos

**Edge Function: `send-goal-notification`**
- Recebe dados da meta atingida (tipo, valor, tenant)
- Busca emails dos usuários com role `admin` ou `manager` do tenant
- Envia email de parabéns usando Resend
- Registra o envio para evitar notificações duplicadas

**Nova tabela: `goal_notifications_sent`**
- Armazena registro de quais metas já tiveram notificação enviada
- Evita spam quando a meta é atingida múltiplas vezes no mesmo período

**Modificação no hook `useSalesGoals`**
- Detecta quando a meta passa de < 100% para >= 100%
- Chama a edge function para enviar notificação

---

## 2. Dashboard Específico para Entregadores

### O que será feito
Uma nova página acessível por entregadores mostrando apenas as entregas do dia atribuídas a eles, com ações simplificadas.

### Componentes

**Nova página: `/courier-dashboard`**
- Layout otimizado para mobile
- Mostra apenas entregas do dia do entregador logado
- Cards grandes com botões de ação rápida

**Componentes visuais**
- Resumo do dia: total de entregas, completadas, pendentes
- Lista de entregas com ações: "Coletei", "Em Rota", "Entregue"
- Mapa simplificado com endereços (usando links para Google Maps)

**Hook: `useCourierDeliveries`**
- Busca entregas filtradas pelo `courier_id` do usuário logado
- Atualização em tempo real via Supabase Realtime

---

## 3. Previsão de Vendas com IA

### O que será feito
Usar o histórico de vendas para prever o faturamento dos próximos dias usando Lovable AI.

### Componentes

**Edge Function: `sales-forecast`**
- Coleta histórico de vendas dos últimos 30-60 dias
- Usa Lovable AI (Gemini) para analisar padrões e gerar previsões
- Retorna previsão para os próximos 7 dias

**Componente: `SalesForecastCard`**
- Exibe gráfico de previsão vs realizado
- Mostra tendência (crescimento/queda)
- Indicadores de confiança da previsão

**Hook: `useSalesForecast`**
- Chama a edge function de previsão
- Cache dos resultados para não chamar IA repetidamente

---

## Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `supabase/functions/send-goal-notification/index.ts` | Edge function para envio de emails |
| `supabase/functions/sales-forecast/index.ts` | Edge function para previsão com IA |
| `src/pages/CourierDashboard.tsx` | Dashboard do entregador |
| `src/hooks/useCourierDeliveries.ts` | Hook para entregas do entregador |
| `src/hooks/useSalesForecast.ts` | Hook para previsão de vendas |
| `src/components/dashboard/SalesForecastCard.tsx` | Card de previsão de vendas |
| `src/components/courier/CourierDeliveryCard.tsx` | Card de entrega para courier |
| `src/components/courier/CourierStats.tsx` | Estatísticas do entregador |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/useSalesGoals.ts` | Adicionar detecção de meta atingida e chamada da edge function |
| `src/App.tsx` | Adicionar rota `/courier-dashboard` |
| `src/components/layout/AppSidebar.tsx` | Adicionar link para dashboard do entregador |
| `src/pages/Dashboard.tsx` | Adicionar card de previsão de vendas |
| `supabase/config.toml` | Registrar novas edge functions |

## Migração de Banco de Dados

```text
┌────────────────────────────────────────────┐
│ Tabela: goal_notifications_sent            │
├────────────────────────────────────────────┤
│ id (uuid) PK                               │
│ tenant_id (uuid) FK → tenants              │
│ goal_id (uuid) FK → sales_goals            │
│ notification_type (text) - 'achieved'      │
│ sent_at (timestamptz)                      │
│ recipients (jsonb) - lista de emails       │
└────────────────────────────────────────────┘
```

## Fluxo de Notificação de Meta

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  useSalesGoals   │────▶│  Edge Function   │────▶│     Resend       │
│  detecta meta    │     │  send-goal-      │     │     API          │
│  atingida        │     │  notification    │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                │
                                ▼
                         ┌──────────────────┐
                         │ Registra em      │
                         │ goal_notif_sent  │
                         └──────────────────┘
```

## Fluxo de Previsão de Vendas

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Dashboard       │────▶│  Edge Function   │────▶│   Lovable AI     │
│  carrega         │     │  sales-forecast  │     │   (Gemini)       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                │
                                ▼
                         ┌──────────────────┐
                         │ Retorna previsão │
                         │ 7 dias + análise │
                         └──────────────────┘
```

## Ordem de Implementação

1. **Configurar secret do Resend** (RESEND_API_KEY)
2. **Criar tabela de notificações enviadas**
3. **Implementar edge function de notificação**
4. **Modificar useSalesGoals para detectar metas**
5. **Criar dashboard do entregador**
6. **Implementar edge function de previsão**
7. **Criar componentes de previsão de vendas**
8. **Atualizar rotas e sidebar**

---

## 4. Integração com Balança e Leitor de Código de Barras

### O que foi implementado

**Sistema de Balança (Web Serial API)**
- Hook `useScale` para comunicação serial com balanças Toledo, Filizola, Urano e compatíveis
- Componente `ScaleDisplay` com configuração de baudrate, paridade, bits de dados/parada
- Leitura contínua de peso com indicador de estabilidade
- Botão de ativação no PDV para mostrar/ocultar painel da balança

**Sistema de Leitura de Código de Barras**
- Hook `useBarcodeScanner` com dois modos:
  - **Keyboard**: captura automática de leitores USB que emulam teclado
  - **Camera**: leitura via câmera usando Barcode Detection API
- Componente `BarcodeScanner` com tabs para modo automático/manual
- `QuickScanButton` para acesso rápido no toolbar
- Suporte a formatos: EAN-13, EAN-8, UPC-A, Code39, Code128, QR Code
- Busca automática de produto por SKU, ID ou nome

### Arquivos Criados
| Arquivo | Propósito |
|---------|-----------|
| `src/hooks/useScale.ts` | Hook para comunicação serial com balança |
| `src/hooks/useBarcodeScanner.ts` | Hook para leitura de código de barras |
| `src/components/pos/ScaleDisplay.tsx` | Componente de exibição da balança |
| `src/components/pos/BarcodeScanner.tsx` | Componente de scanner de código de barras |

### Arquivos Modificados
| Arquivo | Modificação |
|---------|-------------|
| `src/pages/POS.tsx` | Integração de balança e código de barras |
| `src/hooks/useProducts.ts` | Adicionado campo SKU para busca por código de barras |

---

## Resultado Final

- Gestores recebem email automático quando metas são batidas
- Entregadores têm dashboard dedicado no celular
- Dashboard principal mostra previsão de vendas inteligente para os próximos 7 dias
- PDV integra com balança serial e leitor de código de barras USB/câmera
