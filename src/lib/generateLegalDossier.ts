import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

interface TenantDossierData {
  tenant: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    pix_split_enabled: boolean;
    commission_type: string | null;
    commission_value: number | null;
    commission_fixed: number | null;
  };
  acceptances: Array<{
    document_type: string;
    version: string;
    accepted_at: string;
    accepted_ip: string | null;
    accepted_user_id: string | null;
    document_id: string;
  }>;
  commissions: Array<{
    created_at: string;
    gross_amount: number;
    commission_amount: number;
    net_amount: number;
    commission_type: string;
    status: string;
  }>;
  legalDocuments: Array<{
    id: string;
    type: string;
    version: string;
    title: string;
    content: string;
  }>;
}

async function fetchDossierData(tenantId: string): Promise<TenantDossierData> {
  const [tenantRes, acceptancesRes, commissionsRes, docsRes] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, email, phone, created_at, pix_split_enabled, commission_type, commission_value, commission_fixed')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('tenant_legal_acceptance')
      .select('document_type, version, accepted_at, accepted_ip, accepted_user_id, document_id')
      .eq('tenant_id', tenantId)
      .order('accepted_at', { ascending: false }),
    supabase
      .from('platform_commissions')
      .select('created_at, gross_amount, commission_amount, net_amount, commission_type, status')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('legal_documents')
      .select('id, type, version, title, content')
      .eq('is_active', true),
  ]);

  if (tenantRes.error) throw tenantRes.error;

  return {
    tenant: tenantRes.data as any,
    acceptances: (acceptancesRes.data || []) as any[],
    commissions: (commissionsRes.data || []) as any[],
    legalDocuments: (docsRes.data || []) as any[],
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(title, 14, y);
  doc.setDrawColor(30, 58, 138);
  doc.line(14, y + 2, 196, y + 2);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  return y + 10;
}

function addKeyValue(doc: jsPDF, key: string, value: string, y: number): number {
  if (y > 272) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.text(`${key}:`, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value, 60, y);
  return y + 6;
}

export async function generateLegalDossier(tenantId: string): Promise<void> {
  const data = await fetchDossierData(tenantId);
  const doc = new jsPDF();
  const now = new Date();

  // ========== CAPA ==========
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DOSSIÊ JURÍDICO', 105, 25, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Documento Confidencial', 105, 35, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Emitido em: ${formatDate(now.toISOString())}`, 105, 48, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  let y = 75;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.tenant.name, 105, y, { align: 'center' });
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const coverInfo = [
    `E-mail: ${data.tenant.email || 'N/A'}`,
    `Telefone: ${data.tenant.phone || 'N/A'}`,
    `Split PIX: ${data.tenant.pix_split_enabled ? 'ATIVO' : 'INATIVO'}`,
    `Comissão: ${data.tenant.commission_value ?? 0}% + ${formatCurrency(data.tenant.commission_fixed ?? 0)} fixo`,
  ];
  coverInfo.forEach(line => {
    doc.text(line, 105, y, { align: 'center' });
    y += 7;
  });

  // ========== SEÇÃO 1 – IDENTIFICAÇÃO ==========
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, 'SEÇÃO 1 — IDENTIFICAÇÃO DO ESTABELECIMENTO', y);

  y = addKeyValue(doc, 'Nome', data.tenant.name, y);
  y = addKeyValue(doc, 'E-mail', data.tenant.email || 'N/A', y);
  y = addKeyValue(doc, 'Telefone', data.tenant.phone || 'N/A', y);
  y = addKeyValue(doc, 'Cadastro em', formatDate(data.tenant.created_at), y);
  y = addKeyValue(doc, 'ID Tenant', data.tenant.id, y);
  y = addKeyValue(doc, 'Split PIX', data.tenant.pix_split_enabled ? 'Ativo' : 'Inativo', y);

  // ========== SEÇÃO 2 – ACEITE JURÍDICO ==========
  y += 6;
  y = addSectionTitle(doc, 'SEÇÃO 2 — ACEITE JURÍDICO', y);

  if (data.acceptances.length === 0) {
    doc.text('Nenhum aceite jurídico registrado.', 14, y);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Documento', 'Versão', 'Data Aceite', 'IP', 'User ID', 'Doc ID']],
      body: data.acceptances.map(a => [
        a.document_type,
        a.version,
        formatDate(a.accepted_at),
        a.accepted_ip || 'N/A',
        a.accepted_user_id?.substring(0, 8) || 'N/A',
        a.document_id?.substring(0, 8) || 'N/A',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ========== SEÇÃO 3 – MODELO DE RETENÇÃO ==========
  y = addSectionTitle(doc, 'SEÇÃO 3 — MODELO DE RETENÇÃO', y);

  const commPercent = data.tenant.commission_value ?? 0;
  const commFixed = data.tenant.commission_fixed ?? 0;
  const exampleGross = 100;
  const exampleCommission = (exampleGross * commPercent) / 100 + commFixed;
  const exampleNet = exampleGross - exampleCommission;

  y = addKeyValue(doc, 'Valor Bruto (ex.)', formatCurrency(exampleGross), y);
  y = addKeyValue(doc, 'Comissão (%)', `${commPercent}%`, y);
  y = addKeyValue(doc, 'Comissão Fixa', formatCurrency(commFixed), y);
  y = addKeyValue(doc, 'Valor Líquido', formatCurrency(exampleNet), y);
  y += 4;

  const retentionText = 'O estabelecimento autorizou expressamente o modelo de divisão automática (split) no momento da liquidação, conforme versão contratual aceita. A Plataforma não recebe integralmente os valores — a divisão ocorre na origem pela instituição de pagamento.';
  const splitLines = doc.splitTextToSize(retentionText, 180);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(splitLines, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += splitLines.length * 5 + 8;

  // ========== SEÇÃO 4 – HISTÓRICO DE COMISSÕES ==========
  if (y > 240) { doc.addPage(); y = 20; }
  y = addSectionTitle(doc, 'SEÇÃO 4 — HISTÓRICO DE COMISSÕES', y);

  if (data.commissions.length === 0) {
    doc.text('Nenhuma comissão registrada.', 14, y);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Valor Bruto', 'Comissão', 'Líquido', 'Tipo', 'Status']],
      body: data.commissions.map(c => [
        formatDate(c.created_at),
        formatCurrency(c.gross_amount),
        formatCurrency(c.commission_amount),
        formatCurrency(c.net_amount),
        c.commission_type,
        c.status,
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ========== SEÇÃO 5 – CLÁUSULAS VIGENTES ==========
  if (y > 240) { doc.addPage(); y = 20; }
  y = addSectionTitle(doc, 'SEÇÃO 5 — CLÁUSULAS VIGENTES', y);

  if (data.legalDocuments.length === 0) {
    doc.text('Nenhum documento legal ativo.', 14, y);
    y += 8;
  } else {
    for (const legalDoc of data.legalDocuments) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${legalDoc.title} (v${legalDoc.version})`, 14, y);
      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      const contentLines = doc.splitTextToSize(legalDoc.content, 180);
      for (const line of contentLines) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 14, y);
        y += 4;
      }
      y += 6;
    }
  }

  // ========== SEÇÃO 6 – DECLARAÇÃO FINAL ==========
  if (y > 240) { doc.addPage(); y = 20; }
  y = addSectionTitle(doc, 'SEÇÃO 6 — DECLARAÇÃO FINAL', y);

  const finalText = 'Este dossiê comprova a autorização expressa e inequívoca do estabelecimento para aplicação do modelo de retenção automática via split, conforme aceite digital registrado com IP e usuário autenticado. A divisão de valores é realizada pela instituição de pagamento no momento da liquidação, não configurando custódia de valores pela Plataforma.';
  const finalLines = doc.splitTextToSize(finalText, 180);
  doc.setFontSize(9);
  doc.text(finalLines, 14, y);
  y += finalLines.length * 5 + 10;

  // Footer em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Dossiê Jurídico — ${data.tenant.name} — Página ${i}/${pageCount}`, 105, 290, { align: 'center' });
    doc.text(`Gerado em ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, 105, 294, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  const fileName = `dossie_juridico_${data.tenant.name.replace(/\s+/g, '_').toLowerCase()}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export async function generateDossierJSON(tenantId: string): Promise<{ acceptancesJson: string; commissionsJson: string }> {
  const data = await fetchDossierData(tenantId);

  return {
    acceptancesJson: JSON.stringify(data.acceptances, null, 2),
    commissionsJson: JSON.stringify(data.commissions, null, 2),
  };
}
