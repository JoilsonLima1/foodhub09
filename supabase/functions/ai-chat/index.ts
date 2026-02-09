import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatPlanInfo(plan: any): string {
  const price = plan.monthly_price === 0 ? "Grátis" : `R$ ${plan.monthly_price}/mês`;
  const users = plan.max_users === -1 ? "Ilimitados" : `Até ${plan.max_users}`;
  const products = plan.max_products === -1 ? "Ilimitados" : `Até ${plan.max_products}`;
  const orders = plan.max_orders_per_month === -1 ? "Ilimitados" : `Até ${plan.max_orders_per_month}`;

  const features: string[] = [];
  if (plan.feature_pos) features.push("PDV");
  if (plan.feature_kitchen_display) features.push("Painel Cozinha");
  if (plan.feature_delivery_management) features.push("Gestão de Entregas");
  if (plan.feature_stock_control) features.push("Controle de Estoque");
  if (plan.feature_reports_basic) features.push("Relatórios Básicos");
  if (plan.feature_reports_advanced) features.push("Relatórios Avançados");
  if (plan.feature_ai_forecast) features.push("Previsão com IA");
  if (plan.feature_multi_branch) features.push("Multi-unidades");
  if (plan.feature_api_access) features.push("Acesso API");
  if (plan.feature_white_label) features.push("White Label");
  if (plan.feature_priority_support) features.push("Suporte Prioritário");
  if (plan.feature_cmv_reports) features.push("Relatórios CMV");
  if (plan.feature_goal_notifications) features.push("Metas e Notificações");
  if (plan.feature_courier_app) features.push("App Entregador");
  if (plan.feature_public_menu) features.push("Cardápio Digital");

  return `- ${plan.name} (${price}): ${users} usuários, ${products} produtos, ${orders} pedidos/mês. Recursos: ${features.join(", ")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch real-time plan data from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("name, slug, monthly_price, currency, max_users, max_products, max_orders_per_month, description, feature_pos, feature_kitchen_display, feature_delivery_management, feature_stock_control, feature_reports_basic, feature_reports_advanced, feature_ai_forecast, feature_multi_branch, feature_api_access, feature_white_label, feature_priority_support, feature_cmv_reports, feature_goal_notifications, feature_courier_app, feature_public_menu")
      .eq("is_active", true)
      .order("display_order");

    const plansInfo = (plans || []).map(formatPlanInfo).join("\n");

    // Fetch branding info
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["company_name"]);

    const companyName = settings?.find(s => s.key === "company_name")?.value || "FoodHub09";

    const systemPrompt = `Você é o assistente virtual do ${companyName}, um sistema de gestão para restaurantes. Responda de forma amigável, clara e profissional.

INFORMAÇÕES DO SISTEMA:
- Sistema completo de gestão para restaurantes, pizzarias, lanchonetes, cafeterias e similares
- Funciona 100% na nuvem, acessível de qualquer dispositivo
- Principais recursos: PDV, gestão de pedidos, controle de estoque, dashboard de entregas, relatórios, previsão com IA
- Integração com iFood e outros marketplaces
- Suporte a impressoras térmicas, balanças e leitores de código de barras
- Cardápio digital com QR Code para mesas
- App exclusivo para entregadores

PLANOS ATUALIZADOS (dados em tempo real do sistema):
${plansInfo}

Todos os planos pagos incluem período de teste grátis.
O plano Grátis oferece acesso total a todas as funcionalidades por 30 dias, depois retorna aos limites básicos.

REGRAS:
- Responda apenas sobre o sistema e seus recursos
- Use SEMPRE os dados de planos acima (são dados em tempo real). NUNCA invente valores.
- Se não souber a resposta, sugira entrar em contato pelo WhatsApp
- Use emojis moderadamente para ser mais amigável
- Mantenha respostas concisas (máximo 3-4 frases)
- Sempre incentive a experimentar o teste grátis`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10)
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded", 
            message: "Muitas mensagens em pouco tempo. Por favor, aguarde alguns segundos e tente novamente." 
          }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required", 
            message: "Serviço temporariamente indisponível. Por favor, entre em contato pelo WhatsApp." 
          }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    return new Response(
      JSON.stringify({ message }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente ou entre em contato pelo WhatsApp."
      }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
