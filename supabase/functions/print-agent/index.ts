import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateToken(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) token += chars[b % chars.length];
  return token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // Get tenant_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) return json({ error: 'No tenant' }, 403);
  const tenantId = profile.tenant_id;

  try {
    // POST /print-agent/pair — generate pairing token
    if (path === 'pair' && req.method === 'POST') {
      const token = generateToken(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Create or update a pending agent entry
      const { data, error } = await supabase
        .from('tenant_print_agents')
        .upsert({
          tenant_id: tenantId,
          device_id: `pending_${token}`,
          device_name: 'Aguardando pareamento...',
          pairing_token: token,
          pairing_token_expires_at: expiresAt,
          status: 'pairing',
        }, { onConflict: 'tenant_id,device_id' })
        .select()
        .single();

      if (error) throw error;
      return json({ token, expires_at: expiresAt, agent_id: data.id });
    }

    // POST /print-agent/confirm — agent confirms pairing
    if (path === 'confirm' && req.method === 'POST') {
      const body = await req.json();
      const { token, device_id, device_name, agent_version } = body;

      if (!token || !device_id) return json({ error: 'Missing token or device_id' }, 400);

      // Find pending agent with this token
      const { data: agent, error: findError } = await supabase
        .from('tenant_print_agents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('pairing_token', token)
        .eq('status', 'pairing')
        .single();

      if (findError || !agent) return json({ error: 'Invalid or expired token' }, 404);

      // Check expiration
      if (new Date(agent.pairing_token_expires_at) < new Date()) {
        await supabase.from('tenant_print_agents').delete().eq('id', agent.id);
        return json({ error: 'Token expired' }, 410);
      }

      // Update with real device info
      const { data: updated, error: updateError } = await supabase
        .from('tenant_print_agents')
        .update({
          device_id,
          device_name: device_name || 'Print Agent',
          agent_version: agent_version || null,
          paired_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          status: 'online',
          pairing_token: null,
          pairing_token_expires_at: null,
        })
        .eq('id', agent.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return json({ success: true, agent: updated });
    }

    // GET /print-agent/agents — list agents for tenant
    if (path === 'agents' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('tenant_print_agents')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'pairing')
        .order('paired_at', { ascending: false });

      if (error) throw error;
      return json({ agents: data });
    }

    // DELETE /print-agent/agents?id=xxx — remove agent
    if (path === 'agents' && req.method === 'DELETE') {
      const agentId = url.searchParams.get('id');
      if (!agentId) return json({ error: 'Missing id' }, 400);

      const { error } = await supabase
        .from('tenant_print_agents')
        .delete()
        .eq('id', agentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return json({ success: true });
    }

    // POST /print-agent/heartbeat — agent reports online status
    if (path === 'heartbeat' && req.method === 'POST') {
      const body = await req.json();
      const { device_id, agent_version } = body;

      if (!device_id) return json({ error: 'Missing device_id' }, 400);

      const { error } = await supabase
        .from('tenant_print_agents')
        .update({
          last_seen_at: new Date().toISOString(),
          status: 'online',
          agent_version: agent_version || undefined,
        })
        .eq('tenant_id', tenantId)
        .eq('device_id', device_id);

      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error('print-agent error:', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
