# Partner Program Marketing

Sistema de vitrine pública e captação de parceiros.

## Páginas Públicas (Marketing)

| Rota | Descrição |
|------|-----------|
| `/parceiros` | Landing do programa de parceiros |
| `/parceiros/cadastrar` | Formulário de cadastro de parceiro |
| `/parceiros/:slug` | Perfil público do parceiro + form de lead |

## Páginas do App (Parceiro)

| Rota | Descrição |
|------|-----------|
| `/partner/leads` | Gestão de leads capturados |

## Database

### partner_leads
Leads capturados do perfil público do parceiro.

## RPCs

- `submit_partner_lead` - Submete lead (público)
- `get_public_partner_profile` - Busca perfil público
- `complete_partner_registration` - Finaliza registro
- `get_partner_leads` - Lista leads do parceiro
- `update_partner_lead_status` - Atualiza status do lead

## Fluxo de Cadastro

1. Visitante acessa `/parceiros`
2. Clica "Criar conta de parceiro"
3. Preenche form em `/parceiros/cadastrar`
4. Sistema cria auth user + partner
5. Redireciona para `/partner/onboarding`
