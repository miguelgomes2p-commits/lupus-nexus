import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/crm/KpiCard";
import { EmptyState } from "@/components/crm/EmptyState";
import { StatusBadge } from "@/components/crm/StatusBadge";
import {
  Plus, Search, Users, Pencil, Trash2, Upload, Download, Loader2, RefreshCw,
  CheckCircle2, AlertCircle, DollarSign, UserCheck, UserX, CalendarClock,
} from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO, startOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/rh/")({ component: HRPage });

interface Employee {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  department: string | null;
  salary: number;
  hire_date: string;
  termination_date: string | null;
  status: "ativo" | "inativo";
  payment_day: number;
  pix_key: string | null;
  bank_notes: string | null;
  notes: string | null;
  cost_id: string | null;
}

interface Payroll {
  id: string;
  employee_id: string;
  reference_month: string;
  due_date: string;
  amount: number;
  status: "pendente_comprovante" | "pago" | "cancelado";
  receipt_file_path: string | null;
  receipt_file_name: string | null;
  paid_at: string | null;
}

const DEPARTMENTS = ["Comercial", "Operacional", "Financeiro", "Marketing", "TI", "Administrativo", "Diretoria"];

function HRPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [emp, pay] = await Promise.all([
      supabase.from("employees" as any).select("*").order("name"),
      supabase.from("payroll_payments" as any).select("*").order("reference_month", { ascending: false }),
    ]);
    if (emp.error) toast.error(emp.error.message);
    if (pay.error) toast.error(pay.error.message);
    setEmployees((emp.data ?? []) as unknown as Employee[]);
    setPayrolls((pay.data ?? []) as unknown as Payroll[]);
    setLoading(false);
  }

  const filtered = employees.filter((e) => {
    const s = search.toLowerCase();
    const matchSearch = !s || e.name.toLowerCase().includes(s) || e.position.toLowerCase().includes(s) || (e.department ?? "").toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const kpis = useMemo(() => {
    const active = employees.filter((e) => e.status === "ativo");
    const monthlyPayroll = active.reduce((a, e) => a + Number(e.salary), 0);
    const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
    const currentMonthPays = payrolls.filter((p) => p.reference_month === monthStart);
    const paid = currentMonthPays.filter((p) => p.status === "pago").reduce((a, p) => a + Number(p.amount), 0);
    const pending = currentMonthPays.filter((p) => p.status === "pendente_comprovante").reduce((a, p) => a + Number(p.amount), 0);
    return { totalActive: active.length, total: employees.length, monthlyPayroll, paid, pending };
  }, [employees, payrolls]);

  async function save(form: FormData) {
    const payload: any = {
      name: String(form.get("name")).trim(),
      cpf: String(form.get("cpf") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      position: String(form.get("position")).trim(),
      department: String(form.get("department") ?? "") || null,
      salary: Number(form.get("salary")),
      hire_date: String(form.get("hire_date")),
      termination_date: String(form.get("termination_date") ?? "") || null,
      status: String(form.get("status") ?? "ativo"),
      payment_day: Number(form.get("payment_day") ?? 5),
      pix_key: String(form.get("pix_key") ?? "").trim() || null,
      bank_notes: String(form.get("bank_notes") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
    };
    if (!payload.name || !payload.position || !payload.hire_date) {
      toast.error("Preencha nome, cargo e data de admissão.");
      return;
    }

    if (editing) {
      const { error } = await supabase.from("employees" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Colaborador atualizado");
    } else {
      const { error } = await supabase.from("employees" as any).insert({ ...payload, created_by: user?.id });
      if (error) return toast.error(error.message);
      toast.success("Colaborador cadastrado — custo fixo gerado automaticamente");
    }
    setOpen(false); setEditing(null); load();
  }

  async function remove(e: Employee) {
    const { error } = await supabase.from("employees" as any).delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Colaborador removido");
    load();
  }

  async function generatePayroll(e: Employee) {
    const refMonth = startOfMonth(new Date()).toISOString().slice(0, 10);
    const today = new Date();
    const day = Math.min(e.payment_day, 28);
    const due = new Date(today.getFullYear(), today.getMonth(), day).toISOString().slice(0, 10);
    const { error } = await supabase.from("payroll_payments" as any).insert({
      employee_id: e.id,
      reference_month: refMonth,
      due_date: due,
      amount: e.salary,
      status: "pendente_comprovante",
      created_by: user?.id,
    });
    if (error) {
      if (error.code === "23505") toast.warning("Folha do mês já existe para este colaborador");
      else toast.error(error.message);
    } else {
      toast.success("Folha gerada — aguardando comprovante");
      load();
    }
  }

  async function attachReceipt(pay: Payroll, file: File, employeeName: string) {
    setUploading(pay.id);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${pay.employee_id}/${pay.id}-${Date.now()}-${safe}`;
      const upload = await supabase.storage.from("payroll-receipts").upload(path, file);
      if (upload.error) throw upload.error;
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from("payroll_payments" as any).update({
        status: "pago",
        receipt_file_path: path,
        receipt_file_name: file.name,
        receipt_uploaded_at: nowIso,
        paid_at: nowIso.slice(0, 10),
      }).eq("id", pay.id);
      if (error) throw error;
      toast.success(`Comprovante anexado — ${employeeName} pago`);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao anexar comprovante");
    } finally {
      setUploading(null);
    }
  }

  async function downloadReceipt(pay: Payroll) {
    if (!pay.receipt_file_path) return;
    const { data, error } = await supabase.storage.from("payroll-receipts").createSignedUrl(pay.receipt_file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function revert(pay: Payroll) {
    if (!confirm("Reverter para pendente de comprovante?")) return;
    const { error } = await supabase.from("payroll_payments" as any).update({
      status: "pendente_comprovante", paid_at: null,
    }).eq("id", pay.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function removePayroll(pay: Payroll) {
    const { error } = await supabase.from("payroll_payments" as any).delete().eq("id", pay.id);
    if (error) return toast.error(error.message);
    toast.success("Pagamento removido");
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="RH — Recursos Humanos"
        description="SCL · Colaboradores, cargos e folha de pagamento"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4 mr-2" /> Novo colaborador
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Ativos" value={kpis.totalActive} icon={UserCheck} accent="success" />
        <KpiCard label="Total cadastrados" value={kpis.total} icon={Users} accent="info" />
        <KpiCard label="Folha mensal" value={brl(kpis.monthlyPayroll)} icon={DollarSign} accent="info" />
        <KpiCard label="Pago no mês" value={brl(kpis.paid)} icon={CheckCircle2} accent="success" />
        <KpiCard label="Pendente comprovante" value={brl(kpis.pending)} icon={AlertCircle} accent="warning" />
      </div>

      <Card className="p-3 glass border-border/50 flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, cargo, departamento..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum colaborador" description="Cadastre o primeiro colaborador para gerar automaticamente o custo fixo de folha." />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const empPays = payrolls.filter((p) => p.employee_id === e.id);
            const isOpen = expanded === e.id;
            return (
              <Card key={e.id} className="glass border-border/50 overflow-hidden">
                <div className="p-4 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{e.name}</h3>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-semibold ${
                        e.status === "ativo" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}>
                        {e.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {e.position}{e.department ? ` · ${e.department}` : ""}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                      <span>Admissão {format(parseISO(e.hire_date), "dd/MM/yyyy")}</span>
                      <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Paga todo dia {e.payment_day}</span>
                      {e.email && <span>{e.email}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Salário</div>
                    <div className="text-lg font-bold tabular-nums text-primary">{brl(Number(e.salary))}</div>
                  </div>
                  <div className="flex gap-1.5 w-full md:w-auto">
                    <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : e.id)}>
                      {isOpen ? "Ocultar folha" : `Folha (${empPays.length})`}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover {e.name}?</AlertDialogTitle>
                          <AlertDialogDescription>Isso remove o colaborador, o custo fixo vinculado e todos os pagamentos históricos.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(e)} className="bg-destructive">Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border/50 bg-background/30 p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Folha de pagamento</div>
                      <Button size="sm" variant="outline" onClick={() => generatePayroll(e)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Gerar folha do mês atual
                      </Button>
                    </div>
                    {empPays.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum pagamento gerado. Clique em "Gerar folha do mês atual".</p>
                    ) : (
                      <ul className="space-y-2">
                        {empPays.map((pay) => {
                          const isPending = pay.status === "pendente_comprovante";
                          return (
                            <li key={pay.id} className={`p-3 rounded-lg border ${isPending ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold capitalize flex items-center gap-2">
                                    {isPending ? <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                                    {format(parseISO(pay.reference_month), "MMMM 'de' yyyy", { locale: ptBR })}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    Vencimento {format(parseISO(pay.due_date), "dd/MM/yyyy")}
                                    {pay.paid_at && ` · Pago em ${format(parseISO(pay.paid_at), "dd/MM/yyyy")}`}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold tabular-nums">{brl(Number(pay.amount))}</div>
                                  <StatusBadge status={pay.status} size="xs" />
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {pay.receipt_file_path && (
                                  <Button size="sm" variant="outline" onClick={() => downloadReceipt(pay)}>
                                    <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar comprovante
                                  </Button>
                                )}
                                {isPending ? (
                                  <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold h-8 px-3 rounded-md gradient-primary text-primary-foreground shadow-glow">
                                    {uploading === pay.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                    Anexar comprovante (marca como pago)
                                    <input type="file" className="hidden" accept=".pdf,image/*"
                                      onChange={(ev) => { const f = ev.target.files?.[0]; if (f) attachReceipt(pay, f, e.name); ev.currentTarget.value = ""; }}
                                      disabled={uploading === pay.id} />
                                  </label>
                                ) : (
                                  <Button size="sm" variant="ghost" onClick={() => revert(pay)}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reverter
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remover pagamento?</AlertDialogTitle>
                                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => removePayroll(pay)} className="bg-destructive">Remover</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar colaborador" : "Novo colaborador"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo *</Label>
                <Input name="name" required defaultValue={editing?.name} />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo *</Label>
                <Input name="position" required defaultValue={editing?.position} placeholder="Ex.: Analista Comercial" />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select name="department" defaultValue={editing?.department ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Salário (R$) *</Label>
                <Input name="salary" type="number" step="0.01" required defaultValue={editing?.salary ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label>Dia de pagamento *</Label>
                <Input name="payment_day" type="number" min={1} max={28} required defaultValue={editing?.payment_day ?? 5} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de admissão *</Label>
                <Input name="hire_date" type="date" required defaultValue={editing?.hire_date ?? new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de desligamento</Label>
                <Input name="termination_date" type="date" defaultValue={editing?.termination_date ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "ativo"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input name="cpf" defaultValue={editing?.cpf ?? ""} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input name="phone" defaultValue={editing?.phone ?? ""} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Chave PIX</Label>
                <Input name="pix_key" defaultValue={editing?.pix_key ?? ""} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Dados bancários / observações</Label>
                <textarea name="bank_notes" rows={2} defaultValue={editing?.bank_notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Anotações</Label>
                <textarea name="notes" rows={3} defaultValue={editing?.notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" />
              </div>
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-[11px] text-muted-foreground">
              {editing
                ? "Alterações no salário sincronizam automaticamente o custo fixo vinculado."
                : "Ao cadastrar, um custo fixo mensal (categoria Folha) será gerado automaticamente para este colaborador."}
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">
              {editing ? "Salvar alterações" : "Cadastrar colaborador"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
