import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { runBillingReminders } from "@/lib/billing.server";

export const Route = createFileRoute("/api/public/hooks/billing-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"] ?? import.meta.env.VITE_SUPABASE_URL;
        const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !key) return Response.json({ error: "config" }, { status: 500 });

        const apiKey = request.headers.get("apikey");
        if (!apiKey) return Response.json({ error: "unauthorized" }, { status: 401 });

        const supabase = createClient(url, key);

        let body: any = {};
        try { body = await request.json(); } catch { /* corpo vazio */ }

        try {
          const result = await runBillingReminders(supabase, {
            clientId: body?.clientId ?? null,
            force: body?.force === true,
          });
          return Response.json(result);
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "erro" }, { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run billing reminders" }),
    },
  },
});
