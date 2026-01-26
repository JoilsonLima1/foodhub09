import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailySales {
  date: string;
  total: number;
  orderCount: number;
  dayOfWeek: number;
}

interface ForecastDay {
  date: string;
  predictedAmount: number;
  confidence: number;
  dayOfWeek: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar usuário autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenantId } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenantId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Buscando dados de vendas para tenant:", tenantId);

    // Buscar vendas dos últimos 60 dias
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("tenant_id", tenantId)
      .eq("status", "approved")
      .gte("paid_at", sixtyDaysAgo.toISOString())
      .order("paid_at", { ascending: true });

    if (paymentsError) {
      console.error("Erro ao buscar pagamentos:", paymentsError);
      throw paymentsError;
    }

    if (!payments || payments.length < 7) {
      return new Response(
        JSON.stringify({
          success: true,
          forecast: [],
          trend: "neutral",
          message: "Dados insuficientes para previsão (mínimo 7 dias)",
          historicalAverage: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Agrupar vendas por dia
    const salesByDay: Record<string, DailySales> = {};
    payments.forEach((p) => {
      const date = new Date(p.paid_at!).toISOString().split("T")[0];
      const dayOfWeek = new Date(p.paid_at!).getDay();
      if (!salesByDay[date]) {
        salesByDay[date] = { date, total: 0, orderCount: 0, dayOfWeek };
      }
      salesByDay[date].total += Number(p.amount);
      salesByDay[date].orderCount += 1;
    });

    const dailySales = Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date));

    console.log("Dias com vendas:", dailySales.length);

    // Preparar dados para IA
    const salesSummary = dailySales.map((d) => ({
      date: d.date,
      total: Math.round(d.total * 100) / 100,
      orders: d.orderCount,
      dayOfWeek: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.dayOfWeek],
    }));

    // Calcular médias por dia da semana
    const avgByDayOfWeek: Record<number, { total: number; count: number }> = {};
    dailySales.forEach((d) => {
      if (!avgByDayOfWeek[d.dayOfWeek]) {
        avgByDayOfWeek[d.dayOfWeek] = { total: 0, count: 0 };
      }
      avgByDayOfWeek[d.dayOfWeek].total += d.total;
      avgByDayOfWeek[d.dayOfWeek].count += 1;
    });

    const dayOfWeekAvg: Record<number, number> = {};
    Object.entries(avgByDayOfWeek).forEach(([dow, data]) => {
      dayOfWeekAvg[Number(dow)] = data.total / data.count;
    });

    // Chamar Lovable AI para análise e previsão
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const prompt = `Você é um analista de dados especializado em previsão de vendas para restaurantes.

Dados históricos de vendas (últimos ${dailySales.length} dias):
${JSON.stringify(salesSummary.slice(-30), null, 2)}

Médias por dia da semana:
${Object.entries(dayOfWeekAvg)
  .map(([dow, avg]) => `- ${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][Number(dow)]}: R$ ${avg.toFixed(2)}`)
  .join("\n")}

Analise os padrões e forneça:
1. Previsão de vendas para os próximos 7 dias
2. Tendência geral (crescimento, queda ou estável)
3. Breve análise do padrão identificado

Responda APENAS em formato JSON válido:
{
  "forecast": [
    {"date": "YYYY-MM-DD", "predictedAmount": numero, "confidence": 0.0-1.0, "dayOfWeek": "Seg"}
  ],
  "trend": "growing" | "declining" | "stable",
  "analysis": "breve análise em português",
  "weeklyPrediction": numero_total_semanal
}`;

    console.log("Chamando Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um analista de dados. Responda apenas com JSON válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro na API Lovable AI:", aiResponse.status, errorText);
      
      // Fallback: usar médias simples
      const forecast = generateSimpleForecast(dayOfWeekAvg);
      return new Response(
        JSON.stringify({
          success: true,
          forecast,
          trend: "stable",
          analysis: "Previsão baseada em médias históricas por dia da semana.",
          historicalAverage: dailySales.reduce((sum, d) => sum + d.total, 0) / dailySales.length,
          isSimpleForecast: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices?.[0]?.message?.content || "";

    // Limpar possíveis marcadores de código
    aiContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    console.log("Resposta da IA:", aiContent);

    let forecastResult;
    try {
      forecastResult = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("Erro ao parsear resposta da IA:", parseError);
      // Fallback
      const forecast = generateSimpleForecast(dayOfWeekAvg);
      return new Response(
        JSON.stringify({
          success: true,
          forecast,
          trend: "stable",
          analysis: "Previsão baseada em médias históricas.",
          historicalAverage: dailySales.reduce((sum, d) => sum + d.total, 0) / dailySales.length,
          isSimpleForecast: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salvar previsões no histórico para comparação futura
    const today = new Date().toISOString().split("T")[0];
    if (forecastResult.forecast && forecastResult.forecast.length > 0) {
      for (const f of forecastResult.forecast) {
        const { error: insertError } = await supabase
          .from("sales_forecast_history")
          .upsert({
            tenant_id: tenantId,
            forecast_date: today,
            target_date: f.date,
            predicted_amount: f.predictedAmount,
            confidence: f.confidence,
          }, {
            onConflict: 'tenant_id,forecast_date,target_date'
          });

        if (insertError) {
          console.warn("Erro ao salvar histórico de previsão:", insertError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecast: forecastResult.forecast || [],
        trend: forecastResult.trend || "stable",
        analysis: forecastResult.analysis || "",
        weeklyPrediction: forecastResult.weeklyPrediction || 0,
        historicalAverage: dailySales.reduce((sum, d) => sum + d.total, 0) / dailySales.length,
      }),
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

function generateSimpleForecast(dayOfWeekAvg: Record<number, number>): ForecastDay[] {
  const forecast: ForecastDay[] = [];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const today = new Date();

  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dow = futureDate.getDay();

    forecast.push({
      date: futureDate.toISOString().split("T")[0],
      predictedAmount: Math.round((dayOfWeekAvg[dow] || 0) * 100) / 100,
      confidence: 0.6,
      dayOfWeek: dayNames[dow],
    });
  }

  return forecast;
}
