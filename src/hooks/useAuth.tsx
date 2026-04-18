import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserBootstrap } from "@/lib/auth";

type Role = "admin" | "gestor" | "comercial";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: Role[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const buildFallbackProfile = (authUser: User): Profile => ({
      id: authUser.id,
      name: typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name.trim().length > 0
        ? authUser.user_metadata.name.trim()
        : authUser.email?.split("@")[0] ?? "Usuário",
      email: authUser.email ?? "",
      avatar_url: typeof authUser.user_metadata?.avatar_url === "string" ? authUser.user_metadata.avatar_url : null,
    });

    const syncSession = async (sess: Session | null) => {
      if (!active) return;

      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user) {
        setProfile(null);
        setRoles([]);
        return;
      }

      try {
        const result = await ensureUserBootstrap({ data: { accessToken: sess.access_token } });
        if (!active) return;

        setProfile((result?.profile as Profile | null) ?? buildFallbackProfile(sess.user));
        setRoles(((result?.roles ?? []) as Role[]) || []);
      } catch {
        if (!active) return;

        const [{ data: p }, { data: r }] = await Promise.all([
          supabase.from("profiles").select("id,name,email,avatar_url").eq("id", sess.user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", sess.user.id),
        ]);

        if (!active) return;
        setProfile((p as Profile | null) ?? buildFallbackProfile(sess.user));
        setRoles((((r ?? []) as { role: Role }[]).map((x) => x.role)) || []);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      void syncSession(sess).finally(() => {
        if (active) setLoading(false);
      });
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      void syncSession(sess).finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(getAuthErrorMessage(error.message));
  };

  const signUp = async ({ name, email, password }: { name: string; email: string; password: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name: name.trim() },
      },
    });

    if (error) throw new Error(getAuthErrorMessage(error.message));

    return {
      requiresEmailConfirmation: !data.session,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isAdmin = roles.includes("admin");
  const isManager = isAdmin || roles.includes("gestor");

  return (
    <Ctx.Provider value={{ user, session, profile, roles, loading, signIn, signUp, signOut, isAdmin, isManager }}>
      {children}
    </Ctx.Provider>
  );
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (normalized.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar no CRM.";
  if (normalized.includes("user already registered") || normalized.includes("already been registered")) return "Já existe uma conta com este e-mail.";
  if (normalized.includes("password should be at least")) return "A senha precisa ter no mínimo 6 caracteres.";
  if (normalized.includes("failed to fetch") || normalized.includes("network")) return "Erro de conexão ao autenticar. Tente novamente.";

  return "Não foi possível concluir a autenticação agora. Tente novamente.";
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
