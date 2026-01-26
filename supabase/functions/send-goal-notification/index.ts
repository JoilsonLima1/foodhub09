import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoalNotificationRequest {
  goalId: string;
  goalType: "daily" | "weekly";
  targetAmount: number;
  achievedAmount: number;
  tenantId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { goalId, goalType, targetAmount, achievedAmount, tenantId }: GoalNotificationRequest = await req.json();

    console.log("Recebida solicitação de notificação:", { goalId, goalType, targetAmount, achievedAmount, tenantId });

    // Verificar se já foi enviada notificação para esta meta
    const { data: existingNotification } = await supabase
      .from("goal_notifications_sent")
      .select("id")
      .eq("goal_id", goalId)
      .eq("notification_type", "achieved")
      .single();

    if (existingNotification) {
      console.log("Notificação já enviada para esta meta");
      return new Response(
        JSON.stringify({ success: true, message: "Notificação já enviada anteriormente" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar informações do tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, email")
      .eq("id", tenantId)
      .single();

    // Buscar emails dos admins e managers do tenant
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .in("role", ["admin", "manager"]);

    if (!userRoles || userRoles.length === 0) {
      console.log("Nenhum admin ou manager encontrado");
      return new Response(
        JSON.stringify({ success: false, message: "Nenhum destinatário encontrado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar emails dos usuários via auth.users (usando service role)
    const userIds = userRoles.map(ur => ur.user_id);
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    const recipientEmails = authUsers?.users
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => u.email!)
      .filter(Boolean) || [];

    if (recipientEmails.length === 0) {
      console.log("Nenhum email de destinatário encontrado");
      return new Response(
        JSON.stringify({ success: false, message: "Nenhum email encontrado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Enviando email para:", recipientEmails);

    const goalTypeLabel = goalType === "daily" ? "DIÁRIA" : "SEMANAL";
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    // Enviar email
    const { error: emailError } = await resend.emails.send({
      from: "FoodHub09 <noreply@resend.dev>",
      to: recipientEmails,
      subject: `🎉 Meta ${goalTypeLabel} Atingida! - ${tenant?.name || "FoodHub09"}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .header .emoji { font-size: 60px; display: block; margin-bottom: 20px; }
            .content { padding: 40px 30px; }
            .stats { background: #f0fdf4; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center; }
            .stats .label { color: #059669; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .stats .value { color: #047857; font-size: 36px; font-weight: bold; margin: 10px 0; }
            .stats .target { color: #6b7280; font-size: 16px; }
            .message { color: #374151; line-height: 1.6; font-size: 16px; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="emoji">🎯</span>
              <h1>Meta ${goalTypeLabel} Atingida!</h1>
            </div>
            <div class="content">
              <p class="message">Parabéns! Sua equipe alcançou a meta de vendas ${goalType === "daily" ? "do dia" : "da semana"}!</p>
              
              <div class="stats">
                <div class="label">Valor Alcançado</div>
                <div class="value">${formatCurrency(achievedAmount)}</div>
                <div class="target">Meta: ${formatCurrency(targetAmount)}</div>
              </div>
              
              <p class="message">
                Esse é o resultado do trabalho duro de toda a equipe. Continue assim! 🚀
              </p>
            </div>
            <div class="footer">
              <p>${tenant?.name || "FoodHub09"} - Sistema de Gestão</p>
              <p>Este é um email automático, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Erro ao enviar email:", emailError);
      throw emailError;
    }

    // Registrar que a notificação foi enviada
    const { error: insertError } = await supabase
      .from("goal_notifications_sent")
      .insert({
        goal_id: goalId,
        tenant_id: tenantId,
        notification_type: "achieved",
        recipients: recipientEmails,
      });

    if (insertError) {
      console.error("Erro ao registrar notificação:", insertError);
    }

    console.log("Notificação enviada com sucesso!");

    return new Response(
      JSON.stringify({ success: true, message: "Notificação enviada com sucesso", recipients: recipientEmails }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na edge function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
