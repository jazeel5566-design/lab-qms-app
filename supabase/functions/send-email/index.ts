// supabase/functions/send-email/index.ts
//
// Generic, reusable email sender. Called directly from the app right when
// something happens — a task is assigned, an NC is assigned, a controlled
// document is published. Takes { to, subject, html } and sends it via Resend.
//
// Deliberately does NOT throw on missing "to" — a person with no email on
// file simply doesn't get notified, rather than the whole request failing.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Change this if you registered a different subdomain than notify.medlabqms.com
const FROM_ADDRESS = "Lab QMS <notify@notify.medlabqms.com>";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    if (!to) {
      // Not an error — this person just doesn't have a notification email on file.
      return new Response(JSON.stringify({ skipped: true, reason: "no recipient email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || !html) {
      return new Response(JSON.stringify({ error: "Missing subject or html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not set as a Supabase secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
