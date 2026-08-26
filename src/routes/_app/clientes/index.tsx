import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Eye, Pencil, Trash2, CalendarClock, AlertCircle, CheckCircle2, Send, Upload, Loader2, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CLIENT_STATUSES } from "@/lib/crm";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/crm/EmptyState";

import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import { sendTransactionalEmail } from "@/lib/email/send";
import { sendWhatsAppMessage, sendWhatsAppNfe } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_app/clientes/")({
  component: ClientsPage,
});

function ClientsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);


  useEffect(() => {
    load();
    const ch = supabase
      .channel("clients-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setItems(data ?? []); setLoading(false);
  }

  const filtered = items
    .filter((c) => !search || c.company_name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => statusFilter === "todos" || c.status === statusFilter);


  async function save(form: FormData) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await doSave(form);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function doSave(form: FormData) {
    const payload: any = {
      company_name: form.get("company_name"),
      trade_name: form.get("trade_name") || null,
      contact_name: form.get("contact_name") || null,
      email: form.get("email") || null,
      phone: form.get("phone") || null,
      whatsapp: form.get("whatsapp") || null,
      whatsapp_automation: form.get("whatsapp_automation") === "on",
      cnpj: form.get("cnpj") || null,
      segment: form.get("segment") || null,
      legal_representative: form.get("legal_representative") || null,
      company_size: form.get("company_size") || null,
      tax_regime: form.get("tax_regime") || null,
      address: form.get("address") || null,
      city: form.get("city") || null,
      state: form.get("state") || null,
      zip_code: form.get("zip_code") || null,
      industry: form.get("industry") || null,
      monthly_recurring_revenue: Number(form.get("monthly_recurring_revenue") || 0),
      contract_start_date: form.get("contract_start_date") || null,
      contract_end_date: form.get("contract_end_date") || null,
      onboarding_status: form.get("onboarding_status") || "em_andamento",
      document_notes: form.get("document_notes") || null,
      contract_value: Number(form.get("contract_value") || 0),
      billing_entity_id: form.get("billing_entity_id") || null,
      pix_key: form.get("pix_key") || null,
      status: form.get("status"),
      notes: form.get("notes") || null,
      owner_id: editing?.owner_id ?? user?.id,
    };
    if (editing) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Atualizado");
    } else {
      const { data, error } = await supabase.from("clients").insert(payload).select().single();
      if (error) return toast.error(error.message);
      void data;
      toast.success("Cliente criado");
      // TEST MODE: envia boas-vindas para destinatários fixos (mesmos dos lembretes)
      const TEST_RECIPIENTS = [
        "miguelgomes2p@gmail.com",
        "thiago.multi01@gmail.com",
        "lucasmonteiromurta@gmail.com",
      ];
      try {
        for (const recipient of TEST_RECIPIENTS) {
          await sendTransactionalEmail({
            templateName: "welcome_client",
            recipientEmail: recipient,
            templateData: {
              contact_name: payload.contact_name || payload.company_name,
              company_name: payload.company_name,
              contract_value: Number(payload.contract_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
              contract_start_date: payload.contract_start_date
                ? new Date(payload.contract_start_date + "T00:00:00").toLocaleDateString("pt-BR")
                : "",
            },
            idempotencyKey: `welcome_client-${data.id}-${recipient}`,
          });
        }
        toast.success("E-mail de boas-vindas enviado (modo teste)");
      } catch (e: any) {
        toast.error(`Cliente salvo, mas falhou envio: ${e?.message ?? "erro"}`);
      }
      // Boas-vindas por WhatsApp (Evolution API)
      try {
        const wa = await sendWhatsAppMessage({
          data: {
            templateKey: "wa_welcome_client",
            clientId: data.id,
            data: {
              contact_name: payload.contact_name || payload.company_name,
              company_name: payload.company_name,
            },
          },
        });
        if ((wa as any)?.ok) toast.success("WhatsApp de boas-vindas enviado");
        else if ((wa as any)?.skipped === "automation_disabled") {
          toast.info("Automação de WhatsApp desativada para este cliente");
        } else if ((wa as any)?.skipped === "evolution_not_configured") {
          toast.info("WhatsApp não configurado — mensagem não enviada");
        }
      } catch {
        /* falha de WhatsApp não bloqueia o cadastro */
      }
    }
    setOpen(false); setEditing(null); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Carteira ativa de clientes"
        action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Novo</Button>}
      />

      <PaymentSchedule clients={items} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-md" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (

        <EmptyState icon={Building2} title="Sem clientes" description="Cadastre clientes ou converta leads em clientes." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 sm:p-5 glass hover-lift">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{c.company_name}</h3>
                  {c.trade_name && <p className="text-xs text-muted-foreground">{c.trade_name}</p>}
                </div>
                <span className={cn("text-[10px] uppercase px-2 py-1 rounded font-semibold", c.status === "inativo" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
                  {c.status === "inativo" ? "Inativo" : "Ativo"}
                </span>

              </div>
              <div className="text-xs text-muted-foreground mt-3 space-y-0.5">
                {c.contact_name && <div>Contato: {c.contact_name}</div>}
                {c.email && <div>{c.email}</div>}
                {c.phone && <div>{c.phone}</div>}
                {c.city && <div>{[c.city, c.state].filter(Boolean).join("/")}</div>}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Contrato</div>
                  <div className="font-semibold text-primary">{brl(c.contract_value)}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => nav({ to: "/clientes/$id", params: { id: c.id } })}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) remove(c.id); }}><Trash2 className="h-4 w-4 text-primary" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar" : "Novo"} cliente</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
            <div className="space-y-1.5"><Label>Razão social *</Label><Input name="company_name" required defaultValue={editing?.company_name} /></div>
            <div className="space-y-1.5"><Label>Nome fantasia</Label><Input name="trade_name" defaultValue={editing?.trade_name ?? ""} /></div>
            <div className="space-y-1.5"><Label>Contato principal</Label><Input name="contact_name" defaultValue={editing?.contact_name ?? ""} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
                {!editing && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Send className="h-3 w-3" /> Um e-mail automático de boas-vindas será enviado (atualmente em modo teste para os destinatários internos).
                  </p>
                )}
              </div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input name="phone" defaultValue={editing?.phone ?? ""} /></div>
              <div className="space-y-1.5">
                <Label>WhatsApp (lembretes)</Label>
                <Input name="whatsapp" placeholder="(11) 99999-9999" defaultValue={editing?.whatsapp ?? ""} />
                <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1 cursor-pointer">
                  <input type="checkbox" name="whatsapp_automation" defaultChecked={!!editing?.whatsapp_automation} className="h-4 w-4 accent-primary cursor-pointer" />
                  Automação de WhatsApp ativa (lembretes e NFE)
                </label>
              </div>
              <div className="sm:col-span-2"><BillingFields editing={editing} /></div>
              <div className="space-y-1.5"><Label>CNPJ</Label><Input name="cnpj" defaultValue={editing?.cnpj ?? ""} /></div>
              <div className="space-y-1.5"><Label>Segmento</Label><Input name="segment" defaultValue={editing?.segment ?? ""} /></div>
              <div className="space-y-1.5"><Label>Setor/indústria</Label><Input name="industry" defaultValue={editing?.industry ?? ""} /></div>
              <div className="space-y-1.5"><Label>Responsável legal</Label><Input name="legal_representative" defaultValue={editing?.legal_representative ?? ""} /></div>
              <div className="space-y-1.5"><Label>Porte</Label><Input name="company_size" defaultValue={editing?.company_size ?? ""} /></div>
              <div className="space-y-1.5"><Label>Regime tributário</Label><Input name="tax_regime" defaultValue={editing?.tax_regime ?? ""} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Endereço</Label><Input name="address" defaultValue={editing?.address ?? ""} /></div>
              <div className="space-y-1.5"><Label>Cidade</Label><Input name="city" defaultValue={editing?.city ?? ""} /></div>
              <div className="space-y-1.5"><Label>Estado</Label><Input name="state" maxLength={2} defaultValue={editing?.state ?? ""} /></div>
              <div className="space-y-1.5"><Label>CEP</Label><Input name="zip_code" defaultValue={editing?.zip_code ?? ""} /></div>
              <div className="space-y-1.5"><Label>Contrato (R$)</Label><Input name="contract_value" type="number" step="0.01" defaultValue={editing?.contract_value ?? 0} /></div>
              <div className="space-y-1.5"><Label>Receita mensal</Label><Input name="monthly_recurring_revenue" type="number" step="0.01" defaultValue={editing?.monthly_recurring_revenue ?? 0} /></div>
              <div className="space-y-1.5"><Label>Início do contrato</Label><Input name="contract_start_date" type="date" defaultValue={editing?.contract_start_date ?? ""} /></div>
              <div className="space-y-1.5"><Label>Fim/renovação</Label><Input name="contract_end_date" type="date" defaultValue={editing?.contract_end_date ?? ""} /></div>
              <div className="space-y-1.5"><Label>Onboarding</Label><Input name="onboarding_status" defaultValue={editing?.onboarding_status ?? "em_andamento"} /></div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "ativo"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Observações de documentos</Label><textarea name="document_notes" rows={3} defaultValue={editing?.document_notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" /></div>
            <div className="space-y-1.5"><Label>Notas</Label><textarea name="notes" rows={3} defaultValue={editing?.notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" /></div>
            <Button type="submit" disabled={saving} className="w-full gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {saving ? "Salvando…" : editing ? "Salvar" : "Criar"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function computeNextPayment(startDateStr: string | null) {
  if (!startDateStr) return null;
  // Parse YYYY-MM-DD as local date to avoid UTC drift
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDateStr);
  if (!m) return null;
  const startYear = Number(m[1]);
  const startMonth = Number(m[2]) - 1;
  const startDay = Number(m[3]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDay = (y: number, mo: number) => new Date(y, mo + 1, 0).getDate();

  // If contract starts in the future, the first payment is the start date itself
  const startDate = new Date(startYear, startMonth, startDay);
  if (startDate > today) {
    const diffDays = Math.round((startDate.getTime() - today.getTime()) / 86400000);
    return { date: startDate, diffDays, day: startDay, isFirst: true };
  }

  let year = today.getFullYear();
  let month = today.getMonth();
  let payDay = Math.min(startDay, lastDay(year, month));
  let next = new Date(year, month, payDay);
  if (next < today) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    payDay = Math.min(startDay, lastDay(year, month));
    next = new Date(year, month, payDay);
  }
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86400000);
  return { date: next, diffDays, day: startDay, isFirst: false };
}

function PaymentSchedule({ clients }: { clients: any[] }) {
  const [paidKeys, setPaidKeys] = useState<Set<string>>(new Set());

  async function loadInvoices() {
    const { data } = await (supabase as any)
      .from("client_invoices")
      .select("client_id, reference_month, status");
    const set = new Set<string>();
    for (const i of data ?? []) {
      if (i.status === "pago") set.add(`${i.client_id}|${String(i.reference_month).slice(0, 7)}`);
    }
    setPaidKeys(set);
  }

  useEffect(() => {
    loadInvoices();
    const ch = supabase
      .channel("clients-invoices")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_invoices" }, () => loadInvoices())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const activeClients = clients.filter((c) => c.status === "ativo");
  const missing = activeClients.filter((c) => !c.contract_start_date);

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const scheduled = activeClients
    .filter((c) => c.contract_start_date)
    .map((c) => {
      const value = Number(c.monthly_recurring_revenue || c.contract_value || 0);
      const next = computeNextPayment(c.contract_start_date);
      const paid = next ? paidKeys.has(`${c.id}|${monthKey(next.date)}`) : false;
      return { ...c, _value: value, _next: next, _paid: paid };
    })
    .filter((c) => c._next)
    .sort((a, b) => Number(a._paid) - Number(b._paid) || a._next!.diffDays - b._next!.diffDays);

  if (scheduled.length === 0 && missing.length === 0) return null;

  const totalNext30 = scheduled
    .filter((c) => !c._paid && c._next!.diffDays <= 30)
    .reduce((s, c) => s + c._value, 0);
  const totalWeek = scheduled
    .filter((c) => !c._paid && c._next!.diffDays <= 7)
    .reduce((s, c) => s + c._value, 0);

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  const tone = (days: number, paid: boolean) =>
    paid
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
      : days <= 3
      ? "bg-primary/15 text-primary border-primary/30"
      : days <= 7
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-muted/40 text-muted-foreground border-border/60";

  return (
    <Card className="p-4 sm:p-5 glass mb-6">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Próximas recorrências</h3>
            <p className="text-xs text-muted-foreground">Dia do pagamento = dia do "Início do contrato" de cada cliente</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Próx. 7 dias</div>
            <div className="text-sm font-bold font-display text-primary tabular-nums">{brl(totalWeek)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Próx. 30 dias</div>
            <div className="text-sm font-bold font-display tabular-nums">{brl(totalNext30)}</div>
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {missing.length} cliente(s) ativo(s) sem "Início do contrato" cadastrado — preencha para calcular a recorrência:{" "}
            <span className="text-foreground font-medium">
              {missing.map((c) => c.company_name).join(", ")}
            </span>
          </span>
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {scheduled.map((c) => {
            const days = c._next!.diffDays;
            const paid = c._paid;
            const Icon = paid ? CheckCircle2 : days <= 3 ? AlertCircle : CalendarClock;
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs ${tone(days, paid)}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{c.company_name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Dia {c._next!.day} · {fmt(c._next!.date)} ·{" "}
                      {paid ? "pago (NFE anexada)" : days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days}d`}
                      {c._next!.isFirst && " · 1ª cobrança"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="font-bold tabular-nums text-foreground">{brl(c._value)}</div>
                  <AttachNfeButton
                    clientId={c.id}
                    clientEmail={c.email}
                    contactName={c.contact_name}
                    companyName={c.company_name}
                    nextDate={c._next!.date}
                    defaultAmount={c._value}
                    onDone={loadInvoices}
                  />
                  <ForceReminderButton clientId={c.id} companyName={c.company_name} />
                  <ForceWhatsAppButton clientId={c.id} companyName={c.company_name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/**
 * Fatura alvo para lembretes: considera pendentes futuras e vencidas.
 * Se a recorrência do mês ainda não foi materializada, cria a fatura a partir
 * do início do contrato para o envio manual não depender da cor do card.
 */
async function ensureInvoiceForReminder(clientId: string) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data: pend } = await (supabase as any)
    .from("client_invoices")
    .select("id, due_date, reference_month, amount, status")
    .eq("client_id", clientId)
    .eq("status", "pendente_nfe")
    .order("due_date", { ascending: true });
  const target = (pend ?? []).find((i: any) => i.due_date >= todayStr) ?? pend?.[0];
  if (target) return target;

  const { data: any_ } = await (supabase as any)
    .from("client_invoices")
    .select("id, due_date, reference_month, amount, status")
    .eq("client_id", clientId)
    .order("due_date", { ascending: false })
    .limit(1);
  if (any_?.[0]) return any_[0];

  const { data: client, error: clientError } = await (supabase as any)
    .from("clients")
    .select("contract_start_date, monthly_recurring_revenue, contract_value")
    .eq("id", clientId)
    .maybeSingle();
  if (clientError) throw clientError;
  if (!client?.contract_start_date) return null;

  const contractStart = parseISO(client.contract_start_date);
  const referenceDate = now < contractStart ? contractStart : now;
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dueDay = Math.min(contractStart.getDate(), new Date(year, month + 1, 0).getDate());
  const dueDate = new Date(year, month, dueDay);
  const dueStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
  const referenceMonth = `${dueStr.slice(0, 7)}-01`;
  const amount = Number(client.monthly_recurring_revenue || client.contract_value || 0);
  if (amount <= 0) return null;

  const { data: created, error: createError } = await (supabase as any)
    .from("client_invoices")
    .upsert(
      { client_id: clientId, reference_month: referenceMonth, due_date: dueStr, amount, status: "pendente_nfe" },
      { onConflict: "client_id,reference_month", ignoreDuplicates: true },
    )
    .select("id, due_date, reference_month, amount, status")
    .maybeSingle();
  if (createError) throw createError;
  if (created) return created;

  const { data: existing, error: existingError } = await (supabase as any)
    .from("client_invoices")
    .select("id, due_date, reference_month, amount, status")
    .eq("client_id", clientId)
    .eq("reference_month", referenceMonth)
    .maybeSingle();
  if (existingError) throw existingError;
  return existing;
}

function ForceReminderButton({ clientId, companyName }: { clientId: string; companyName: string }) {
  const [sending, setSending] = useState(false);
  async function send() {
    setSending(true);
    try {
      const target = await ensureInvoiceForReminder(clientId);
      if (!target) {
        toast.warning(`Nenhuma fatura cadastrada para ${companyName}`);
        return;
      }
      const res = await fetch("/api/public/hooks/payment-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: target.id, template: "payment_reminder_due" }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Falha ao enviar");
      const r = json.results?.[0];
      if (r?.queued) toast.success(`Lembrete enviado para ${companyName}`);
      else if (r?.skipped) toast.warning(`Ignorado: ${r.reason}`);
      else toast.success("Processado");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar lembrete");
    } finally {
      setSending(false);
    }
  }
  return (
    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 hover:bg-primary/20"
      title="Enviar lembrete de pagamento agora" onClick={send} disabled={sending}>
      <Send className={`h-3.5 w-3.5 ${sending ? "animate-pulse" : ""}`} />
    </Button>
  );
}

function ForceWhatsAppButton({ clientId, companyName }: { clientId: string; companyName: string }) {
  const [sending, setSending] = useState(false);
  async function send() {
    setSending(true);
    try {
      const target = await ensureInvoiceForReminder(clientId);
      if (!target) {
        toast.warning(`Nenhuma fatura cadastrada para ${companyName}`);
        return;
      }
      const result: any = await sendWhatsAppMessage({
        data: {
          clientId,
          templateKey: "wa_payment_reminder_due",
          force: true,
          data: {
            due_date: format(parseISO(target.due_date), "dd/MM/yyyy"),
            amount: Number(target.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            reference_month: target.reference_month,
          },
        },
      });
      if (result?.ok) {
        toast.success(
          `WhatsApp enviado para ${companyName}` +
            (result?.director?.ok ? " · cópia no grupo Lupus Diretoria" : result?.director ? " · grupo da diretoria falhou" : ""),
        );
      }
      else if (result?.skipped === "instance_disconnected") {
        toast.error("Luna desconectada da Evolution. Reconecte a instância pelo QR Code e tente novamente.");
      } else {
        toast.warning(`Não enviado: ${result?.error || result?.skipped || "falha desconhecida"}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar WhatsApp");
    } finally {
      setSending(false);
    }
  }
  return (
    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 hover:bg-primary/20"
      title="Enviar lembrete por WhatsApp agora" onClick={send} disabled={sending}>
      <MessageCircle className={`h-3.5 w-3.5 ${sending ? "animate-pulse" : ""}`} />
    </Button>
  );
}


function AttachNfeButton({ clientId, clientEmail, contactName, companyName, nextDate, defaultAmount, onDone }: { clientId: string; clientEmail: string | null; contactName: string | null; companyName: string; nextDate?: Date; defaultAmount?: number; onDone?: () => void }) {
  const [uploading, setUploading] = useState(false);
  async function onFile(file: File) {
    setUploading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const wantedRef = nextDate
        ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`
        : todayStr.slice(0, 7);
      const { data: invs } = await (supabase as any)
        .from("client_invoices")
        .select("id, reference_month, due_date, amount")
        .eq("client_id", clientId)
        .eq("status", "pendente_nfe")
        .order("due_date", { ascending: true });
      let target: any =
        (invs ?? []).find((i: any) => String(i.reference_month).slice(0, 7) === wantedRef) ??
        (invs ?? []).find((i: any) => i.due_date >= todayStr) ??
        invs?.[0];

      // Se não há fatura pendente, cria uma para a próxima recorrência (ou hoje).
      if (!target) {
        const dueDate = nextDate ?? new Date();
        const dueStr = dueDate.toISOString().slice(0, 10);
        const refFirst = `${dueStr.slice(0, 7)}-01`;
        const amt = Number(defaultAmount || 0);
        if (!amt) { toast.error(`Cliente ${companyName} sem valor de recorrência cadastrado`); return; }

        const existing = await (supabase as any)
          .from("client_invoices")
          .select("id, reference_month, due_date, amount")
          .eq("client_id", clientId)
          .eq("reference_month", refFirst)
          .maybeSingle();

        if (existing.data?.id) {
          target = existing.data;
        } else {
          const ins = await (supabase as any)
            .from("client_invoices")
            .insert({ client_id: clientId, reference_month: refFirst, due_date: dueStr, amount: amt, status: "pendente_nfe" })
            .select("id, reference_month, due_date, amount")
            .single();
          if (ins.error) throw ins.error;
          target = ins.data;
        }
      }

      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${clientId}/nfe/${target.id}-${Date.now()}-${safe}`;
      const up = await supabase.storage.from("client-documents").upload(path, file, { upsert: false });
      if (up.error) throw up.error;

      const nowIso = new Date().toISOString();
      const { error: upErr } = await (supabase as any).from("client_invoices").update({
        status: "pago",
        nfe_file_path: path,
        nfe_file_name: file.name,
        nfe_uploaded_at: nowIso,
        paid_at: nowIso.slice(0, 10),
      }).eq("id", target.id);
      if (upErr) throw upErr;

      // TEMP: envia somente para miguelgomes2p@gmail.com para validação
      try {
        const signed = await supabase.storage.from("client-documents").createSignedUrl(path, 60 * 60 * 24 * 30);
        await sendTransactionalEmail({
          templateName: "nfe_attached",
          recipientEmail: "miguelgomes2p@gmail.com",
          templateData: {
            contact_name: contactName || companyName,
            company_name: companyName,
            reference_month: format(parseISO(target.reference_month), "MMMM 'de' yyyy", { locale: ptBR }),
            due_date: format(parseISO(target.due_date), "dd/MM/yyyy"),
            amount: Number(target.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            nfe_url: signed.data?.signedUrl ?? "",
            nfe_file_name: file.name,
          },
          idempotencyKey: `nfe_attached-${target.id}`,
        });
        await (supabase as any).from("client_invoices").update({ email_sent_at: nowIso }).eq("id", target.id);
        toast.success(`NFE anexada (${companyName}) — e-mail teste enviado`);
      } catch (e: any) {
        toast.warning(`NFE anexada, mas falhou envio: ${e?.message ?? "erro"}`);
      }

      // Envia a NFE também por WhatsApp (se a automação do cliente estiver ativa)
      try {
        const wa: any = await sendWhatsAppNfe({
          data: { clientId, filePath: path, fileName: file.name, invoiceId: target.id },
        });
        if (wa?.ok) toast.success(`NFE enviada por WhatsApp para ${companyName}`);
        else if (wa?.skipped === "automation_disabled") toast.info("WhatsApp: automação desativada para este cliente");
        else if (wa?.skipped === "invalid_phone") toast.info("WhatsApp: número não cadastrado");
        else if (wa?.skipped === "client_inactive") toast.info("WhatsApp: cliente inativo");
        else if (wa?.skipped === "evolution_not_configured") toast.warning("WhatsApp não configurado");
        else if (wa?.error) toast.warning(`WhatsApp falhou: ${String(wa.error).slice(0, 120)}`);
      } catch (e: any) {
        toast.warning(`WhatsApp falhou: ${e?.message ?? "erro"}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao anexar NFE");
    } finally {
      setUploading(false);
      onDone?.();
    }
  }
  return (
    <label className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-emerald-500/20 cursor-pointer" title="Anexar NFE da próxima fatura (marca como pago)">
      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      <input type="file" className="hidden" accept=".pdf,.xml,image/*" disabled={uploading}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
    </label>
  );
}

/** Seção "Cobrança": entidade (CNPJ + PIX) e PIX específico do cliente. */
function BillingFields({ editing }: { editing: any }) {
  const [entities, setEntities] = useState<any[]>([]);
  const [entityId, setEntityId] = useState<string>(editing?.billing_entity_id ?? "");

  useEffect(() => {
    (supabase as any)
      .from("billing_entities")
      .select("id, name, cnpj, pix_key, is_active")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: any) => setEntities(data ?? []));
  }, []);

  const entity = entities.find((e) => e.id === entityId);

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Cobrança</div>
      <input type="hidden" name="billing_entity_id" value={entityId} />
      <div className="space-y-1.5">
        <Label>Entidade de cobrança</Label>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger><SelectValue placeholder="Selecione o CNPJ que cobra este cliente" /></SelectTrigger>
          <SelectContent>
            {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}{e.cnpj ? ` · ${e.cnpj}` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        {entities.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Nenhuma entidade cadastrada — configure em Configurações → Financeiro.</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Chave PIX da entidade</Label>
        <Input value={entity?.pix_key ?? ""} readOnly placeholder="—" className="opacity-70" />
      </div>
      <div className="space-y-1.5">
        <Label>PIX específico deste cliente (opcional)</Label>
        <Input name="pix_key" defaultValue={editing?.pix_key ?? ""} placeholder="Deixe em branco para usar o PIX da entidade" />
      </div>
    </div>
  );
}
