import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AuthGateScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <h1 className="text-xl font-semibold">{message}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Estamos preparando o seu acesso ao CRM.</p>
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      const redirect = typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : "/";

      void navigate({
        to: "/login",
        search: { redirect },
        replace: true,
      });
    }
  }, [loading, navigate, session]);

  if (loading) {
    return <AuthGateScreen message="Validando sua sessão..." />;
  }

  if (!session) {
    return <AuthGateScreen message="Redirecionando para a tela de acesso..." />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
