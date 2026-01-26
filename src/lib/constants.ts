// Order Status Labels
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Pago',
  confirmed: 'Confirmado',
  preparing: 'Em Preparo',
  ready: 'Pronto',
  out_for_delivery: 'Em Rota',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: 'warning',
  paid: 'info',
  confirmed: 'info',
  preparing: 'warning',
  ready: 'success',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'destructive',
};

// Order Origin Labels
export const ORDER_ORIGIN_LABELS: Record<string, string> = {
  online: 'Loja Online',
  pos: 'PDV/Balcão',
  whatsapp: 'WhatsApp',
  ifood: 'iFood',
  marketplace: 'Marketplace',
};

// Payment Method Labels
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  voucher: 'Voucher',
  mixed: 'Misto',
};

// Payment Status Labels
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

// Delivery Status Labels
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando Retirada',
  assigned: 'Atribuído',
  picked_up: 'Coletado',
  in_route: 'Em Rota',
  delivered: 'Entregue',
  failed: 'Falhou',
};

// User Role Labels
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Caixa',
  kitchen: 'Cozinha',
  stock: 'Estoque',
  delivery: 'Entregador',
};

// Payment Provider Labels
export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  stone_connect: 'Stone Connect',
  stone_tef: 'Stone TEF',
  stone_android: 'Stone Android SDK',
  cielo_lio: 'Cielo LIO',
  pagbank: 'PagBank',
  manual: 'Manual',
};

// Fraud Alert Labels
export const FRAUD_ALERT_LABELS: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  blocked: 'Bloqueado',
};

// Stock Movement Type Labels
export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  adjustment: 'Ajuste',
  reversal: 'Reversão',
  loss: 'Perda',
};

// Unit Labels
export const UNIT_LABELS: Record<string, string> = {
  kg: 'Quilograma (kg)',
  g: 'Grama (g)',
  ml: 'Mililitro (ml)',
  l: 'Litro (L)',
  un: 'Unidade (un)',
};

// Navigation Items
export const NAV_ITEMS = {
  admin: [
    { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/orders', label: 'Pedidos', icon: 'ClipboardList' },
    { path: '/pos', label: 'PDV/Caixa', icon: 'Calculator' },
    { path: '/kitchen', label: 'Cozinha', icon: 'ChefHat' },
    { path: '/deliveries', label: 'Entregas', icon: 'Truck' },
    { path: '/products', label: 'Produtos', icon: 'Package' },
    { path: '/stock', label: 'Estoque', icon: 'Warehouse' },
    { path: '/reports', label: 'Relatórios', icon: 'BarChart3' },
    { path: '/settings', label: 'Configurações', icon: 'Settings' },
  ],
  manager: [
    { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/orders', label: 'Pedidos', icon: 'ClipboardList' },
    { path: '/products', label: 'Produtos', icon: 'Package' },
    { path: '/stock', label: 'Estoque', icon: 'Warehouse' },
    { path: '/reports', label: 'Relatórios', icon: 'BarChart3' },
    { path: '/settings', label: 'Configurações', icon: 'Settings' },
  ],
  cashier: [
    { path: '/pos', label: 'PDV/Caixa', icon: 'Calculator' },
    { path: '/orders', label: 'Pedidos', icon: 'ClipboardList' },
  ],
  kitchen: [
    { path: '/kitchen', label: 'Cozinha', icon: 'ChefHat' },
  ],
  stock: [
    { path: '/stock', label: 'Estoque', icon: 'Warehouse' },
    { path: '/products', label: 'Produtos', icon: 'Package' },
  ],
  delivery: [
    { path: '/deliveries', label: 'Minhas Entregas', icon: 'Truck' },
  ],
};
