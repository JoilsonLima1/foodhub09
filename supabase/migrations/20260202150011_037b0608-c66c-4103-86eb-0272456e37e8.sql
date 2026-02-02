-- =====================================================
-- MODULARIZAÇÃO PARTE 2: Inserir novos módulos no catálogo
-- =====================================================

-- Inserir novos módulos (usando categorias existentes quando enum novo falhar)
INSERT INTO addon_modules (slug, name, description, category, icon, monthly_price, currency, display_order, features, is_active, implementation_status) VALUES

-- 1. PIX QR Waiter - Pagamento via QR Pix no app do garçom
('pix_qr_waiter', 'PIX QR Garçom', 'QR Pix no app do garçom para pagamentos rápidos via comanda', 'payment', 'QrCode', 9.90, 'BRL', 20, 
  '["QR Code Pix dinâmico por mesa/comanda", "Confirmação automática de pagamento", "Histórico de transações por garçom", "Integração com sistema de comandas"]'::jsonb, 
  true, 'ready'),

-- 2. Client App Basic - App/área do cliente básico
('client_app_basic', 'App Cliente Básico', 'Área do cliente com cadastro simples e acompanhamento de pedidos', 'digital_service', 'User', 0.00, 'BRL', 21, 
  '["Cadastro simplificado do cliente", "Acompanhamento de pedido em tempo real", "Histórico de pedidos", "Notificações push de status"]'::jsonb, 
  true, 'ready'),

-- 3. KYC Advanced - Verificação avançada de identidade
('kyc_advanced', 'Verificação Avançada (KYC)', 'Selfie + documento + CPF para funções sensíveis e prevenção de fraudes', 'access_control', 'Shield', 14.90, 'BRL', 22, 
  '["Captura de selfie", "Upload de documento com foto", "Validação de CPF", "Prevenção de fraudes", "Histórico de verificações"]'::jsonb, 
  true, 'ready'),

-- 4. Client Ordering - Cliente faz pedido pelo app
('client_ordering', 'Pedido pelo App', 'Permite que clientes façam pedidos diretamente pelo aplicativo/cardápio digital', 'digital_service', 'ShoppingCart', 19.90, 'BRL', 23, 
  '["Carrinho de compras digital", "Checkout integrado", "Personalização de itens", "Notas e observações", "Aprovação opcional do garçom"]'::jsonb, 
  true, 'ready'),

-- 5. Sub Tabs Split Bill - Subcomanda e divisão de conta
('sub_tabs_split_bill', 'Subcomanda & Divisão', 'Subcomandas para acompanhantes + divisão de conta + convites via QR', 'digital_service', 'Users', 24.90, 'BRL', 24, 
  '["Subcomandas por participante", "Convite via QR Code", "Divisão de conta flexível", "Pagamento individual", "Histórico por pessoa"]'::jsonb, 
  true, 'ready'),

-- 6. Exit QR Gate - Controle de saída
('exit_qr_gate', 'Controle de Saída (QR Gate)', 'QR de saída com liberação de porta vinculada à quitação', 'access_control', 'DoorOpen', 29.90, 'BRL', 25, 
  '["QR Code de saída único", "Validação de pagamento total", "Integração com catracas/portas", "Log de entradas e saídas", "Alertas de pendência"]'::jsonb, 
  true, 'ready'),

-- 7. Delivery Confirmation - Confirmação de entrega
('delivery_confirmation', 'Confirmação de Entrega', 'Confirmação de entrega por aproximação, QR Code ou NFC', 'logistics', 'MapPinCheck', 12.90, 'BRL', 26, 
  '["Confirmação por QR Code", "Confirmação por proximidade GPS", "Confirmação por NFC", "Foto do entregador", "Assinatura digital"]'::jsonb, 
  true, 'ready'),

-- 8. Call Waiter Close Bill - Chamar garçom e fechar conta
('call_waiter_close_bill', 'Chamar Garçom & Fechar Conta', 'Sistema de chamadas de serviço com escalonamento automático', 'digital_service', 'BellRing', 14.90, 'BRL', 27, 
  '["Botão de chamar garçom", "Solicitar fechamento de conta", "Escalonamento automático", "Tempo de resposta monitorado", "Notificações push para staff"]'::jsonb, 
  true, 'ready'),

-- 9. Waiter Commissions - Comissões de garçom
('waiter_commissions', 'Comissões de Garçom', 'Gestão de comissões, troca de garçom e métricas de desempenho', 'operations', 'Award', 19.90, 'BRL', 28, 
  '["Comissões por venda", "Troca de garçom autorizada", "Relatórios de desempenho", "Metas e rankings", "Histórico de atendimentos"]'::jsonb, 
  true, 'ready'),

-- 10. Tickets Cover - Ingressos e couvert
('tickets_cover', 'Ingressos & Couvert', 'Venda de ingressos, couvert artístico e controle de entrada via QR', 'access_control', 'Ticket', 34.90, 'BRL', 29, 
  '["Venda de ingressos online", "Couvert artístico", "QR Code de entrada", "Validação múltipla", "Relatórios de evento"]'::jsonb, 
  true, 'ready'),

-- Atualizar comandas e events_tickets se não existirem
('comandas', 'Comandas Digitais', 'Sistema completo de comandas com controle de mesa e pedidos', 'operations', 'Receipt', 24.90, 'BRL', 30, 
  '["Abertura de comanda digital", "Vinculação a mesas", "Pedidos por garçom", "Histórico de consumo", "Fechamento e pagamento"]'::jsonb, 
  true, 'ready'),

('events_tickets', 'Eventos & Ingressos', 'Gestão de eventos, venda de ingressos e controle de acesso', 'operations', 'CalendarDays', 39.90, 'BRL', 31, 
  '["Criação de eventos", "Venda de ingressos", "Validação de entrada", "Relatórios de vendas", "Controle de capacidade"]'::jsonb, 
  true, 'ready')

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  monthly_price = EXCLUDED.monthly_price,
  display_order = EXCLUDED.display_order,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  implementation_status = EXCLUDED.implementation_status,
  updated_at = now();