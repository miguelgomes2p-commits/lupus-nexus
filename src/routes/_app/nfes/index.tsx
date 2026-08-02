import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileText, Search, Loader2, Receipt, Plus } from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_app/nfes/")({
  component: NfesPage,
});


interface Row {
  id: string;
  client_id: string;
  reference_month: string;
  due_date: string;
  paid_at: string | null;
  amount: number;
  status: "pendente_nfe" | "pago" | "cancelado" | "documento";
  nfe_file_path: string | null;
  nfe_file_name: string | null;
  nfe_uploaded_at: string | null;
  email_sent_at: string | null;
  origin: "fatura" | "documento";
  clients: { id: string; company_name: string; email: string | null } | null;
}

function monthKey(d: string) {
  return d.slice(0, 7);
}

const NFE_RE = /(nfe|nf-e|nota\s*fiscal|\bnf\b)/i;

function NfesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [inv, docs] = await Promise.all([
      (supabase as any)
        .from("client_invoices")
        .select("*, clients:client_id(id, company_name, email)")
        .not("nfe_file_path", "is", null)
        .order("nfe_uploaded_at", { ascending: false, nullsFirst: false })
        .order("reference_month", { ascending: false })
        .limit(2000),
      (supabase as any)
        .from("client_documents")
        .select("*, clients:client_id(id, company_name, email)")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    if (inv.error) toast.error(inv.error.message);
    if (docs.error) toast.error(docs.error.message);

    const invoiceRows: Row[] = (inv.data ?? []).map((r: any) => ({ ...r, origin: "fatura" as const }));
    const docRows: Row[] = (docs.data ?? [])
      .filter((d: any) => NFE_RE.test(`${d.category ?? ""} ${d.file_name ?? ""} ${d.description ?? ""}`))
      .map((d: any) => ({
        id: `doc-${d.id}`,
        client_id: d.client_id,
        reference_month: `${String(d.created_at).slice(0, 7)}-01`,
        due_date: String(d.created_at).slice(0, 10),
        paid_at: null,
        amount: 0,
        status: "documento" as const,
        nfe_file_path: d.file_path,
        nfe_file_name: d.file_name,
        nfe_uploaded_at: d.created_at,
        email_sent_at: null,
        origin: "documento" as const,
        clients: d.clients ?? null,
      }));

    const all = [...invoiceRows, ...docRows].sort((a, b) => {
      const da = a.nfe_uploaded_at ?? a.reference_month;
      const db = b.nfe_uploaded_at ?? b.reference_month;
      return db.localeCompare(da);
    });
    setRows(all);
    setLoading(false);
  }


  async function download(r: Row) {
    if (!r.nfe_file_path) return;
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(r.nfe_file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.clients && map.set(r.clients.id, r.clients.company_name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const months = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(monthKey(r.reference_month)));
    return Array.from(set).sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (clientFilter !== "all" && r.client_id !== clientFilter) return false;
      if (monthFilter !== "all" && monthKey(r.reference_month) !== monthFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        const hay = `${r.clients?.company_name ?? ""} ${r.nfe_file_name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, clientFilter, monthFilter, statusFilter, q]);

  const totals = useMemo(() => {
    const totalAmount = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
    return { count: filtered.length, totalAmount };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Receipt className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">NFEs Anexadas</h1>
          <p className="text-xs text-muted-foreground">Consulte todas as notas fiscais eletrônicas emitidas.</p>
        </div>
        <ManualNfeDialog onSaved={load} />
      </div>


      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Card className="p-3 glass"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total NFEs</div><div className="font-bold text-lg tabular-nums">{totals.count}</div></Card>
        <Card className="p-3 glass"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor filtrado</div><div className="font-bold text-lg tabular-nums">{brl(totals.totalAmount)}</div></Card>
        <Card className="p-3 glass col-span-2 sm:col-span-1"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Clientes distintos</div><div className="font-bold text-lg tabular-nums">{new Set(filtered.map(r => r.client_id)).size}</div></Card>
      </div>

      <Card className="p-3 sm:p-4 glass border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente ou arquivo" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos meses</SelectItem>
              {months.map((m) => <SelectItem key={m} value={m}>{format(parseISO(`${m}-01`), "MMMM 'de' yyyy", { locale: ptBR })}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente_nfe">Pendente NFE</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="documento">Anexo em documentos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="glass border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma NFE encontrada com os filtros aplicados.</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Referência</th>
                    <th className="text-left p-3">Arquivo</th>
                    <th className="text-left p-3">Anexado em</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="text-right p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="p-3 font-medium">{r.clients?.company_name ?? "—"}</td>
                      <td className="p-3 capitalize">{format(parseISO(r.reference_month), "MMM/yyyy", { locale: ptBR })}</td>
                      <td className="p-3 text-xs text-muted-foreground truncate max-w-[240px]">{r.nfe_file_name}</td>
                      <td className="p-3 text-xs">{r.nfe_uploaded_at ? format(parseISO(r.nfe_uploaded_at), "dd/MM/yyyy HH:mm") : "—"}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">{brl(Number(r.amount))}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => download(r)}>
                          <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <ul className="md:hidden divide-y divide-border/40">
              {filtered.map((r) => (
                <li key={r.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{r.clients?.company_name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{format(parseISO(r.reference_month), "MMMM 'de' yyyy", { locale: ptBR })}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1"><FileText className="h-3 w-3" /> <span className="truncate">{r.nfe_file_name}</span></div>
                      {r.nfe_uploaded_at && <div className="text-[10px] text-muted-foreground mt-0.5">Anexado {format(parseISO(r.nfe_uploaded_at), "dd/MM/yyyy HH:mm")}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold tabular-nums text-sm">{brl(Number(r.amount))}</div>
                      <Button size="sm" variant="outline" className="mt-1" onClick={() => download(r)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function ManualNfeDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [refMonth, setRefMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [dueDate, setDueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [paidAt, setPaidAt] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("clients")
        .select("id, company_name")
        .order("company_name");
      setClients(data ?? []);
    })();
  }, [open]);

  async function save() {
    if (!clientId) return toast.error("Selecione o cliente");
    if (!file) return toast.error("Selecione o arquivo da NFE");
    const amt = Number(String(amount).replace(",", "."));
    if (!amt || amt <= 0) return toast.error("Informe um valor válido");

    setSaving(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const tmpId = crypto.randomUUID();
      const path = `${clientId}/nfe/manual-${tmpId}-${safe}`;
      const up = await supabase.storage.from("client-documents").upload(path, file, { upsert: false });
      if (up.error) throw up.error;

      const nowIso = new Date().toISOString();
      const refFirst = `${refMonth}-01`;

      // Se já existe fatura desse cliente/mês, atualiza (marca como paga com a NFE anexada).
      const existing = await (supabase as any)
        .from("client_invoices")
        .select("id")
        .eq("client_id", clientId)
        .eq("reference_month", refFirst)
        .maybeSingle();

      const payload = {
        client_id: clientId,
        reference_month: refFirst,
        due_date: dueDate,
        paid_at: paidAt,
        amount: amt,
        status: "pago",
        nfe_file_path: path,
        nfe_file_name: file.name,
        nfe_uploaded_at: nowIso,
      };

      const { error } = existing.data?.id
        ? await (supabase as any).from("client_invoices").update(payload).eq("id", existing.data.id)
        : await (supabase as any).from("client_invoices").insert(payload);
      if (error) throw error;


      toast.success("NFE registrada no histórico");
      setOpen(false);
      setClientId(""); setAmount(""); setFile(null);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao registrar NFE");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary">
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar NFE manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar NFE manualmente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Mês de referência</Label>
              <Input type="month" value={refMonth} onChange={(e) => setRefMonth(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data de pagamento</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Arquivo da NFE</Label>
            <Input type="file" accept=".pdf,.xml,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Registro histórico: fatura será criada já como <b>paga</b> e não dispara e-mail.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar NFE"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

