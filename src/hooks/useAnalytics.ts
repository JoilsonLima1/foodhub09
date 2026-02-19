import { supabase } from '@/integrations/supabase/client';

// UTM params stored on first visit for the session
const UTM_STORAGE_KEY = 'analytics_utm';
const SESSION_ID_KEY = 'analytics_session_id';

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  return sid;
}

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
}

function captureUTMParams(): UTMParams {
  const stored = localStorage.getItem(UTM_STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {
    utm_source:   params.get('utm_source')   || undefined,
    utm_medium:   params.get('utm_medium')   || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term:     params.get('utm_term')     || undefined,
    utm_content:  params.get('utm_content')  || undefined,
    referrer:     document.referrer          || undefined,
  };
  if (utm.utm_source || utm.referrer) {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }
  return utm;
}

export interface TrackEventPayload {
  event_name: string;
  tenant_id?: string | null;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  try {
    const utm = captureUTMParams();
    const session_id = getOrCreateSessionId();

    await (supabase.from('analytics_events' as any) as any).insert({
      event_name:   payload.event_name,
      tenant_id:    payload.tenant_id  ?? null,
      user_id:      payload.user_id    ?? null,
      session_id,
      user_agent:   navigator.userAgent || null,
      referrer:     utm.referrer        || null,
      utm_source:   utm.utm_source      || null,
      utm_medium:   utm.utm_medium      || null,
      utm_campaign: utm.utm_campaign    || null,
      utm_term:     utm.utm_term        || null,
      utm_content:  utm.utm_content     || null,
      metadata:     payload.metadata    ?? {},
    });
  } catch (err) {
    // Silently fail — analytics must never break the app
    console.warn('[analytics] trackEvent failed:', err);
  }
}
