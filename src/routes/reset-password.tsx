import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/lupus-logo.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery link auto-hydrates session on load
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // Wait briefly for hash-based auth flow
        const sub = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
        });
        setTimeout(() => setReady(true), 1500);
        return () => sub.data.subscription.unsubscribe();
      }
    });
  }, []);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada! Faça login novamente.");
      await supabase.auth.signOut();
      void nav({ to: "/login", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <img src={logo} alt="LUPUS" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie uma nova senha para acessar o CRM</p>
        </div>
        <Card className="glass p-8 shadow-elegant">
          {!ready ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} disabled={loading} />
              </div>
              <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold shadow-glow">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
