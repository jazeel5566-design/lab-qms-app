// supabase/functions/check-resend-status/index.ts
//
// Read-only status check — calls Resend's own API (using the already-stored
// RESEND_API_KEY secret) to report whether the sending domain is actually
// verified right now. This is diagnostic visibility only: it cannot change
// anything on Resend or Cloudflare, register a domain, or add DNS records —
// those remain real actions on real external accounts that this app has no
// business holding credentials for.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ configured: false, reason: "RESEND_API_KEY is not set as a Supabase secret" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ configured: false, reason: "Resend rejected the API key — it may be invalid or revoked", detail: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domains = (data?.data || []).map((d: any) => ({ name: d.name, status: d.status, region: d.region, createdAt: d.created_at }));
    return new Response(JSON.stringify({ configured: true, domains }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ configured: false, reason: String(e) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
