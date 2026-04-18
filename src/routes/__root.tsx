import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-8xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LUPUS CRM — Inteligência Comercial" },
      { name: "description", content: "CRM premium da Lupus Assessoria. Pipeline, leads, oportunidades e performance comercial em um só lugar." },
      { name: "theme-color", content: "#E10600" },
      { property: "og:title", content: "LUPUS CRM — Inteligência Comercial" },
      { name: "twitter:title", content: "LUPUS CRM — Inteligência Comercial" },
      { property: "og:description", content: "CRM premium da Lupus Assessoria. Pipeline, leads, oportunidades e performance comercial em um só lugar." },
      { name: "twitter:description", content: "CRM premium da Lupus Assessoria. Pipeline, leads, oportunidades e performance comercial em um só lugar." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d7bf85f6-13d4-446b-92fb-29d8b876c055/id-preview-df6ad133--1669744a-5c0e-441b-8336-4b321e0db338.lovable.app-1776491589718.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d7bf85f6-13d4-446b-92fb-29d8b876c055/id-preview-df6ad133--1669744a-5c0e-441b-8336-4b321e0db338.lovable.app-1776491589718.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={150}>
        <Outlet />
        <Toaster richColors closeButton position="top-right" theme="dark" />
      </TooltipProvider>
    </AuthProvider>
  );
}
