import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Activity as ActIcon } from "lucide-react";
import { EmptyState } from "@/components/crm/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/atividades/")({ component: ActPage });
function ActPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("activities").select("*, profiles(name), leads(name), opportunities(title), clients(company_name)").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Histórico de Atividades" description="Linha do tempo completa da operação comercial" />
      {items.length === 0 ? <EmptyState icon={ActIcon} title="Sem atividades registradas" /> : (
        <Card className="glass p-6">
          <ul className="space-y-4">
            {items.map((a) => (
              <li key={a.id} className="flex gap-3 items-start border-l-2 border-primary/40 pl-4 pb-4 last:pb-0 hover:border-primary transition-colors">
                <div className="flex-1">
                  <div className="text-sm">{a.description}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {a.profiles?.name && <span> · {a.profiles.name}</span>}
                    {a.leads?.name && <span> · Lead: {a.leads.name}</span>}
                    {a.opportunities?.title && <span> · Oportunidade: {a.opportunities.title}</span>}
                    {a.clients?.company_name && <span> · Cliente: {a.clients.company_name}</span>}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary shrink-0">{a.type.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
