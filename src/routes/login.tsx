import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/lupus-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" && search.redirect.startsWith("/") ? search.redirect : "/",
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const { signIn, signUp, session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "info" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && session) {
      void nav({ to: search.redirect, replace: true });
    }
  }, [authLoading, nav, search.redirect, session]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    let shouldWaitForRedirect = false;

    try {
      if (mode === "signup") {
        const result = await signUp({ name, email, password });

        if (result.requiresEmailConfirmation) {
          setMode("signin");
          setPassword("");
          setFeedback({
            type: "info",
            message: `Conta criada com sucesso. Confirme o e-mail enviado para ${email.trim()} antes de entrar no CRM.`,
          });
          toast.success("Conta criada. Confirme seu e-mail para liberar o acesso.");
          return;
        }

        shouldWaitForRedirect = true;
        toast.success("Conta criada! Redirecionando…");
      } else {
        await signIn(email, password);
        shouldWaitForRedirect = true;
        toast.success("Bem-vindo de volta.");
      }

      if (!shouldWaitForRedirect) {
        setLoading(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao autenticar";
      setFeedback({ type: "error", message });
      toast.error(message);
      setLoading(false);
    } finally {
      if (!shouldWaitForRedirect) {
        setLoading(false);
      }
    }
  };

  if (authLoading || session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <h1 className="text-xl font-semibold">{session ? "Redirecionando para o CRM..." : "Verificando sua sessão..."}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aguarde um instante enquanto validamos seu acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <img src={logo} alt="SCL" className="h-20 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(225,6,0,0.4)]" />
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">SCL</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground mt-2">
            Sistema <span className="text-primary">·</span> Controle <span className="text-primary">·</span> Lupus
          </p>
        </div>

        <Card className="glass p-8 shadow-elegant">
          <div className="flex gap-1 mb-6 p-1 bg-muted/50 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "signin" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
              }`}
            >Entrar</button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "signup" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
              }`}
            >Criar conta</button>
          </div>

          <form onSubmit={handle} className="space-y-4">
            {feedback && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  feedback.type === "error"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-primary/30 bg-primary/10 text-primary"
                }`}
              >
                {feedback.message}
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" disabled={loading} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@lupus.com" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" disabled={loading} />
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold shadow-glow hover:scale-[1.02] transition-transform">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "signin" ? "Entrar no CRM" : "Criar minha conta")}
            </Button>

            {mode === "signin" && (
              <button
                type="button"
                onClick={async () => {
                  if (!email.trim()) {
                    toast.error("Informe seu e-mail acima para receber o link de redefinição.");
                    return;
                  }
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) throw error;
                    toast.success("Enviamos um link de redefinição para o seu e-mail.");
                    setFeedback({ type: "info", message: `Verifique a caixa de entrada de ${email.trim()}.` });
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Erro ao solicitar redefinição";
                    toast.error(message);
                  }
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueci minha senha
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os termos de uso da Lupus Assessoria.
          </p>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} LUPUS Assessoria · Performance · Estratégia · Crescimento
        </p>
      </div>
    </div>
  );
}
