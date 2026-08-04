import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EvolutionSettingsInput = {
  baseUrl: string;
  apiKey?: string | null;
  instance: string;
};

export const getEvolutionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores");

    const { EVOLUTION_SETTINGS_KEY } = await import("@/lib/whatsapp.server");
    const { data } = await supabase
      .from("settings")
      .select("value, updated_at")
      .eq("key", EVOLUTION_SETTINGS_KEY)
      .maybeSingle();

    const v = (data?.value ?? {}) as any;
    return {
      baseUrl: (v.base_url as string) ?? process.env["EVOLUTION_API_URL"] ?? "",
      instance: (v.instance as string) ?? process.env["EVOLUTION_INSTANCE"] ?? "",
      hasApiKey: Boolean(v.api_key || process.env["EVOLUTION_API_KEY"]),
      apiKeyPreview: v.api_key ? `••••${String(v.api_key).slice(-4)}` : null,
      source: v.base_url ? ("manual" as const) : ("env" as const),
      updatedAt: (data?.updated_at as string) ?? null,
    };
  });

export const saveEvolutionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EvolutionSettingsInput) => {
    if (!input?.baseUrl?.trim()) throw new Error("URL da Evolution obrigatória");
    if (!input?.instance?.trim()) throw new Error("Instância obrigatória");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores");

    const { EVOLUTION_SETTINGS_KEY } = await import("@/lib/whatsapp.server");
    const { data: current } = await supabase
      .from("settings")
      .select("value")
      .eq("key", EVOLUTION_SETTINGS_KEY)
      .maybeSingle();

    const previousKey = (current?.value as any)?.api_key ?? null;
    const apiKey = data.apiKey?.trim() ? data.apiKey.trim() : previousKey;
    if (!apiKey) throw new Error("Informe a API Key da Evolution");

    const value = {
      base_url: data.baseUrl.trim().replace(/\/+$/, ""),
      api_key: apiKey,
      instance: data.instance.trim(),
    };

    const { error } = await supabase
      .from("settings")
      .upsert({ key: EVOLUTION_SETTINGS_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const testEvolutionConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores");

    const { checkEvolutionInstance } = await import("@/lib/whatsapp.server");
    return await checkEvolutionInstance(supabase);
  });
