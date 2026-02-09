# PWA Install - Documentação Técnica

## Visão Geral

O sistema suporta instalação como PWA (Progressive Web App) com branding white-label por parceiro.

## Arquitetura

```
┌─────────────────┐     ┌──────────────────────┐
│ Marketing Domain │────▶│ InstallAppButton      │
│ (parceiro.com)   │     │ → link para app domain│
└─────────────────┘     └──────────────────────┘
                                   │
                                   ▼
┌─────────────────┐     ┌──────────────────────┐
│ App Domain       │────▶│ InstallAppButton      │
│ (app.parceiro)   │     │ → beforeinstallprompt │
│                  │     │ → iOS instructions    │
│ ┌──────────────┐ │     └──────────────────────┘
│ │ SW + Manifest│ │
│ └──────────────┘ │
└─────────────────┘
```

## Componentes

### Edge Function: `pwa-manifest`
- Rota: `GET /functions/v1/pwa-manifest?domain=app.parceiro.com`
- Retorna `application/manifest+json`
- Resolve branding do parceiro via `get_partner_by_domain` RPC
- Fallback: manifest padrão FoodHub09
- Cache: `max-age=3600`

### Hook: `usePWAManifest`
- Injeta `<link rel="manifest">` apontando para edge function
- Fallback: gera blob URL se edge function indisponível
- Injeta meta tags: `theme-color`, `apple-mobile-web-app-*`, `apple-touch-icon`

### Hook: `usePWAInstall`
- Gerencia `beforeinstallprompt` (Chrome/Android)
- Detecta plataforma (ios/android/desktop)
- Detecta modo standalone (já instalado)
- Telemetria: loga em `operational_logs` com `partner_id`

### Componente: `InstallAppButton`
- Android com prompt: botão "Instalar App" → prompt nativo
- iOS Safari: botão "Instalar App" → modal com instruções passo-a-passo
- Android sem prompt (fallback): modal com instruções Chrome
- Marketing domain: link para app domain do parceiro
- Sem app domain: fallback `/?partner=slug`
- Standalone: não renderiza

### Componente: `PWASetup`
- Conecta `usePWAManifest` ao `PublicPartnerContext`
- Inserido no `App.tsx` junto ao `PlatformSEOHead`

### Service Worker: `public/sw.js`
- Versionado (`SW_VERSION = 'v2'`)
- `skipWaiting` + `clients.claim` no activate
- Cache-first para assets estáticos (JS/CSS/imagens/fontes)
- Network-first para navegação
- **Nunca** cacheia: REST API, auth, edge functions, storage, realtime
- Push notifications preservadas
- Background sync preservado

## Ícones

| Arquivo | Tamanho | Uso |
|---------|---------|-----|
| `/pwa-icon-192.png` | 192×192 | Manifest + notificações |
| `/pwa-icon-512.png` | 512×512 | Manifest (splash screen) |
| apple-touch-icon | 180×180 | iOS (usa pwa-icon-192) |

Quando parceiro tem `logo_url` no branding, o manifest aponta para ela diretamente.

## Telemetria

Eventos logados em `operational_logs` (scope: `pwa`):

| Evento | Quando |
|--------|--------|
| `app_install_prompt_shown` | `beforeinstallprompt` disparado OU modal iOS aberto |
| `app_installed` | `appinstalled` event disparado |
| `app_install_dismissed` | Usuário recusou o prompt nativo |

Cada evento inclui `partner_id`, `platform`, `user_agent`, `timestamp` nos metadados.

## Checklist de Elegibilidade

### Chrome/Android (beforeinstallprompt)
- [ ] HTTPS (ou localhost)
- [ ] Manifest válido com: `name`, `short_name`, `start_url`, `display: standalone|fullscreen|minimal-ui`
- [ ] Ícone 192×192 no manifest
- [ ] Service Worker registrado com fetch handler
- [ ] Usuário não instalou o app ainda
- [ ] Usuário interagiu com o domínio (engagement heuristic)

### iOS Safari (Add to Home Screen)
- [ ] HTTPS
- [ ] `<meta name="apple-mobile-web-app-capable" content="yes">`
- [ ] `<link rel="apple-touch-icon">` (180×180 recomendado)
- [ ] Usuário deve fazer manualmente via Share → Add to Home Screen
- [ ] **Não há API programática** para disparar instalação

### Edge/Firefox
- [ ] Mesmos critérios do Chrome (com variações menores)
- [ ] Firefox: não suporta `beforeinstallprompt`, mostra ícone na barra de endereço

## Troubleshooting

### Manifest não carrega
1. Verificar se edge function `pwa-manifest` está deployed
2. Testar: `curl -I https://[SUPABASE_URL]/functions/v1/pwa-manifest?domain=app.parceiro.com`
3. Verificar CORS headers na resposta
4. Fallback blob URL deve funcionar automaticamente

### SW não registra
1. Verificar HTTPS
2. Verificar se `/sw.js` existe e retorna JavaScript válido
3. Verificar console por erros de parse
4. Verificar se scope está correto

### Botão não aparece
1. Desktop: botão não aparece por design (só mobile)
2. Standalone: botão não aparece (já instalado)
3. Chrome sem engagement: `beforeinstallprompt` não dispara
4. iOS: sempre mostra botão de instruções

### Cache desatualizado
1. SW versão é incrementada automaticamente via `SW_VERSION`
2. Caches antigos são deletados no `activate`
3. Para forçar: `navigator.serviceWorker.getRegistration().then(r => r?.update())`
