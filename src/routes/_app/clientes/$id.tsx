import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_app/clientes/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("clients").select("*").eq("id", id).maybeSingle().then(({ data }) => { setC(data); setLoading(false); });
  }, [id]);
  if (loading) return <PageLoader />;
  if (!c) return <div className="text-center py-12">Não encontrado.</div>;
  return (
    <div>
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Clientes</Link>
      <Card className="p-6 glass">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> {c.company_name}</h1>
        {c.trade_name && <p className="text-muted-foreground">{c.trade_name}</p>}
        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div><div className="text-xs text-muted-foreground uppercase">Contato</div>{c.contact_name ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground uppercase">CNPJ</div>{c.cnpj ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground uppercase">E-mail</div>{c.email ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground uppercase">Telefone</div>{c.phone ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground uppercase">Segmento</div>{c.segment ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground uppercase">Contrato</div><span className="text-primary font-bold text-lg">{brl(c.contract_value)}</span></div>
        </div>
        {c.notes && <p className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground">{c.notes}</p>}
      </Card>
    </div>
  );
}
