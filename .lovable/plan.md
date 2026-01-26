

## 🍕 FoodHub - Sistema SaaS para Restaurantes

### Visão Geral
Sistema unificado para gerenciar pedidos online, vendas no balcão, estoque, entregas e pagamentos - tudo em um único painel com design profissional e corporativo.

---

### 📱 Módulo 1: Loja Online (E-commerce)
- **Catálogo** com categorias, produtos, variações (tamanhos P/M/G), sabores e adicionais
- **Carrinho e checkout** com opções de entrega ou retirada
- **Taxas de entrega** configuráveis por bairro/CEP
- **Cupons e promoções** com regras flexíveis
- **Acompanhamento de pedido** em tempo real para o cliente (status: Pago → Em preparo → Pronto → Em rota → Entregue)

---

### 💳 Módulo 2: PDV/Caixa
- **Abertura e fechamento de caixa** com relatório do turno
- **Venda rápida** com busca por produto e atalhos por categoria
- **Múltiplas formas de pagamento**: Dinheiro, Pix, Cartão (débito/crédito), Voucher, pagamento misto
- **Integração com maquininhas** (Stone prioritário) com 3 modos:
  - Integrado (tempo real via API)
  - Semi-integrado (referência + confirmação manual)
  - Manual com antifraude
- **Sangria e reforço** de caixa com registro

---

### 📦 Módulo 3: Estoque + Ficha Técnica
- **Cadastro de insumos** com unidades de medida (kg, g, ml, un)
- **Entrada de estoque** com fornecedor, custo e data
- **Ficha técnica** por produto: quais insumos e quantidades são usados
- **Baixa automática** ao confirmar pagamento (online ou presencial)
- **Reversão automática** quando pedido é cancelado antes do preparo
- **Alertas de estoque baixo** e sugestão de compra
- **Relatórios**: consumo por período, CMV estimado, itens mais vendidos

---

### 👨‍🍳 Módulo 4: Cozinha (Painel Operacional)
- **Kanban de pedidos**: Confirmado → Em preparo → Pronto
- **Ticket detalhado** com adicionais e observações do cliente
- **Tempo estimado** e priorização de pedidos
- **Som/alerta** para novos pedidos

---

### 🛵 Módulo 5: Entregas e Entregadores
- **Cadastro de entregadores** (internos e externos)
- **Atribuição de pedido** ao entregador
- **Status da entrega**: Aguardando retirada → Em rota → Entregue
- **Controle de taxa** de entrega por entregador

---

### 💬 Módulo 6: WhatsApp
- **Botão "Pedir no WhatsApp"** com mensagem pronta do carrinho
- **Registro de pedidos** originados do WhatsApp no sistema
- Preparado para futura integração com WhatsApp Business API (mensagens automáticas de status)

---

### 🔌 Módulo 7: Integrações de Marketplace
- **Lançamento manual de pedido iFood** em 2 cliques (selecionar itens e confirmar)
- Baixa automática do estoque e registro no caixa
- Estrutura preparada para futura integração via API do iFood

---

### 🔐 Módulo 8: Antifraude de Comprovantes
- **Validação de duplicidade** ao registrar pagamento de maquininha:
  - Bloqueia se NSU/DOC já existe nos últimos 90 dias
  - Alerta alto se autorização + valor + últimos 4 dígitos coincidem
  - Alerta médio se valor + cartão + horário são muito similares
- **Painel lateral** mostrando possíveis duplicidades enquanto digita
- **Ações**: Bloquear, solicitar Admin, ou permitir com justificativa
- **Notificações** ao administrador

---

### 👥 Módulo 9: Usuários e Permissões (RBAC)
- **Perfis disponíveis**:
  - **Admin**: acesso total
  - **Gerente**: relatórios, estoque, configurações
  - **Caixa**: PDV, abertura/fechamento de caixa
  - **Cozinha**: apenas painel de produção
  - **Estoque**: apenas gestão de insumos
  - **Entregador**: apenas suas entregas atribuídas
- **Auditoria completa**: registro de ações críticas (cancelamentos, estornos, override de antifraude)

---

### 📊 Dashboard Administrativo
- **Resumo de vendas** do dia/semana/mês
- **Pedidos em andamento** por status
- **Alertas**: estoque baixo, suspeitas de fraude
- **Gráficos**: vendas por período, produtos mais vendidos, formas de pagamento

---

### ⚙️ Payment Orchestrator (Configuração por Loja)
- **Gateway online**: ativar/desativar Pix e cartão online
- **Provedor presencial**: escolher entre Stone Connect, Stone TEF, Manual + Antifraude
- **Fallback automático**: se integração falhar, cai para modo manual com validações

---

### 🎨 Design e Interface
- Estilo **profissional e corporativo** (tons neutros, tipografia clara)
- **Mobile-first**: otimizado para uso em celular e tablet
- Interface **limpa e funcional** inspirada em sistemas ERP modernos
- **Dark mode** disponível

---

### 🗄️ Estrutura de Dados Principal
- Tenants (restaurantes) com isolamento multi-tenant
- Produtos, categorias, variações, adicionais, combos
- Insumos, fichas técnicas, movimentações de estoque
- Pedidos com histórico de status
- Pagamentos online e presenciais separados
- Registros de maquininha com validação antifraude
- Usuários, perfis, permissões e logs de auditoria

---

### 📦 Dados de Exemplo (Seed)
O sistema virá com dados de demonstração:
- 2 categorias (Pizzas e Bebidas)
- 10 produtos com variações
- 12 insumos cadastrados
- 8 fichas técnicas configuradas

