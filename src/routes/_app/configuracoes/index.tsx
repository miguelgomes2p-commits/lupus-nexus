import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Mail, UserCog, Receipt, Wallet, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes/")({ component: SettingsPage });

const links = [
  { to: "/emails-config", label: "Scripts de E-mail", desc: "Personalize os modelos de e-mails transacionais (boas-vindas, lembretes, NFE).", icon: Mail },
  { to: "/usuarios", label: "Usuários & permissões", desc: "Gerencie usuários e papéis (admin/gestor/comercial).", icon: UserCog },
  { to: "/fechamento", label: "Fechamento & Caixa", desc: "Consolidação automática mensal e movimentações manuais.", icon: FileBarChart },
  { to: "/clientes", label: "Faturas & NFE", desc: "As faturas são geradas por cliente ao anexar NFE (dentro do cliente).", icon: Receipt },
  { to: "/custos", label: "Custos", desc: "Cadastro de custos fixos e pontuais.", icon: Wallet },
];

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Configurações" description="Configurações operacionais do SCL — Sistema de Controle Lupus" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.to} to={l.to as any}>
              <Card className="p-5 glass hover-lift transition-all">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{l.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{l.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
