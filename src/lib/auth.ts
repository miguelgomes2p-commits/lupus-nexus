import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ensureUserBootstrapInput = z.object({
  accessToken: z.string().min(20).max(4096),
});

export const ensureUserBootstrap = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string }) => ensureUserBootstrapInput.parse(input))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error("Configuração de autenticação indisponível no servidor.");
    }

    const [{ createClient }, { supabaseAdmin }] = await Promise.all([
      import("@supabase/supabase-js"),
      import("@/integrations/supabase/client.server"),
    ]);

    const authClient = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: undefined,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(data.accessToken);

    if (authError || !user) {
      throw new Error("Não foi possível validar sua sessão atual.");
    }

    if (!user.email) {
      throw new Error("Sua conta não possui um e-mail válido.");
    }

    const resolvedName =
      typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
        ? user.user_metadata.name.trim()
        : user.email.split("@")[0];

    const avatarUrl =
      typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url.trim().length > 0
        ? user.user_metadata.avatar_url
        : null;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        name: resolvedName,
        email: user.email,
        avatar_url: avatarUrl,
        is_active: true,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      throw new Error("Não foi possível preparar o seu perfil de acesso.");
    }

    const { data: currentRoles, error: currentRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (currentRolesError) {
      throw new Error("Não foi possível carregar as permissões do usuário.");
    }

    if (!currentRoles || currentRoles.length === 0) {
      const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
        user_id: user.id,
        role: "comercial",
      });

      if (roleInsertError) {
        throw new Error("Não foi possível definir a permissão inicial do usuário.");
      }
    }

    const [{ data: profile }, { data: roles, error: rolesError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,name,email,avatar_url").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    if (rolesError) {
      throw new Error("Não foi possível sincronizar as permissões do usuário.");
    }

    return {
      profile,
      roles: (roles ?? []).map((item) => item.role),
    };
  });