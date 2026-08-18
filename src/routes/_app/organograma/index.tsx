import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Network, Plus, Search, Settings2, List, GitBranch } from "lucide-react";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { EmptyState } from "@/components/crm/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AREA_FIELDS, EMPLOYEE_FIELDS, buildTree, wouldCreateCycle, type OrgArea, type OrgEmployee } from "@/lib/org";
import { OrgChartCanvas } from "@/components/org/OrgChartCanvas";
import { OrganizationListView } from "@/components/org/OrganizationListView";
import { OrganizationAreaManager } from "@/components/org/OrganizationAreaManager";
import { EmployeeDetailDrawer } from "@/components/org/EmployeeDetailDrawer";
import { EmployeeFormDialog, emptyDraft, toDraft, type EmployeeDraft } from "@/components/org/EmployeeFormDialog";

export const Route = createFileRoute("/_app/organograma/")({
  component: OrganizationChartPage,
  head: () => ({
    meta: [
      { title: "Organograma da empresa | SCL Lupus" },
      { name: "description", content: "Monte e visualize a estrutura hierárquica da Lupus Assessoria: funcionários, áreas e quem responde a quem." },
      { property: "og:title", content: "Organograma da empresa | SCL Lupus" },
      { property: "og:description", content: "Estrutura organizacional editável com áreas, hierarquia e visualização em árvore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ALL = "__all__";

function OrganizationChartPage() {
  const { isManager } = useAuth();
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [areas, setAreas] = useState<OrgArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [view, setView] = useState<"chart" | "list">("chart");
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>(ALL);
  const [showInactive, setShowInactive] = useState(true);
  const [showJobTitle, setShowJobTitle] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<EmployeeDraft>(emptyDraft());
  const [areasOpen, setAreasOpen] = useState(false);
  const [detail, setDetail] = useState<OrgEmployee | null>(null);
  const [reparent, setReparent] = useState<{ dragged: OrgEmployee; target: OrgEmployee } | null>(null);
  const [deactivating, setDeactivating] = useState<OrgEmployee | null>(null);
  const [transferTo, setTransferTo] = useState<string>("__none__");

  const load = useCallback(async () => {
    const [emp, ar] = await Promise.all([
      supabase.from("organization_employees").select(EMPLOYEE_FIELDS).order("sort_order"),
      supabase.from("organization_areas").select(AREA_FIELDS).order("sort_order"),
    ]);
    if (emp.error) toast.error("Erro ao carregar funcionários.");
    setEmployees((emp.data ?? []) as OrgEmployee[]);
    setAreas((ar.data ?? []) as OrgArea[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("organograma")
      .on("postgres_changes", { event: "*", schema: "public", table: "organization_employees" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "organization_areas" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const visible = useMemo(
    () => employees.filter((e) => showInactive || e.is_active),
    [employees, showInactive],
  );
  const tree = useMemo(() => buildTree(visible), [visible]);

  const matchIds = useMemo(() => {
    const term = search.trim().toLowerCase();
    const ids = new Set<string>();
    for (const e of visible) {
      const areaName = areas.find((a) => a.id === e.area_id)?.name ?? "";
      const matchesSearch = !term || e.name.toLowerCase().includes(term) || (e.job_title ?? "").toLowerCase().includes(term);
      const matchesArea = areaFilter === ALL || e.area_id === areaFilter;
      if (matchesSearch && matchesArea && (term || areaFilter !== ALL)) ids.add(e.id);
      void areaName;
    }
    return ids;
  }, [search, areaFilter, visible, areas]);

  const dimmed = useMemo(() => {
    if (!search.trim() && areaFilter === ALL) return undefined;
    return new Set(visible.filter((e) => !matchIds.has(e.id)).map((e) => e.id));
  }, [matchIds, visible, search, areaFilter]);

  const highlightId = search.trim() ? ([...matchIds][0] ?? null) : null;

  const guard = async (fn: () => Promise<void>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try { await fn(); } finally { savingRef.current = false; setSaving(false); }
  };

  const submitEmployee = (d: EmployeeDraft) =>
    guard(async () => {
      const payload = {
        name: d.name.trim(),
        area_id: d.area_id,
        job_title: d.job_title.trim() || null,
        manager_id: d.manager_id,
        email: d.email.trim() || null,
        phone: d.phone.trim() || null,
        avatar_path: d.avatar_path.trim() || null,
        notes: d.notes.trim() || null,
        hire_date: d.hire_date || null,
      };
      if (d.id && wouldCreateCycle(employees, d.id, d.manager_id)) {
        toast.error("Hierarquia circular bloqueada.");
        return;
      }
      const res = d.id
        ? await supabase.from("organization_employees").update(payload).eq("id", d.id)
        : await supabase.from("organization_employees").insert({
            ...payload,
            sort_order: employees.filter((e) => e.manager_id === d.manager_id).length,
          });
      if (res.error) {
        toast.error(res.error.message.includes("circular") ? "Hierarquia circular bloqueada." : "Não foi possível salvar. Verifique suas permissões.");
        return;
      }
      toast.success(d.id ? "Funcionário atualizado." : "Funcionário adicionado.");
      setFormOpen(false);
      await load();
    });

  const confirmReparent = () =>
    guard(async () => {
      if (!reparent) return;
      const { dragged, target } = reparent;
      if (wouldCreateCycle(employees, dragged.id, target.id)) {
        toast.error("Hierarquia circular bloqueada.");
        setReparent(null);
        return;
      }
      const { error } = await supabase.from("organization_employees").update({ manager_id: target.id }).eq("id", dragged.id);
      if (error) toast.error("Não foi possível alterar o superior.");
      else toast.success(`${dragged.name} agora responde a ${target.name}.`);
      setReparent(null);
      await load();
    });

  const moveSibling = (e: OrgEmployee, dir: -1 | 1) =>
    guard(async () => {
      const siblings = employees
        .filter((x) => (x.manager_id ?? null) === (e.manager_id ?? null))
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR"));
      const idx = siblings.findIndex((x) => x.id === e.id);
      const swap = siblings[idx + dir];
      if (!swap) return;
      await supabase.from("organization_employees").update({ sort_order: swap.sort_order }).eq("id", e.id);
      await supabase.from("organization_employees").update({ sort_order: e.sort_order }).eq("id", swap.id);
      await load();
    });

  const toggleActive = (e: OrgEmployee) => {
    if (e.is_active) {
      setTransferTo("__none__");
      setDeactivating(e);
      return;
    }
    void guard(async () => {
      await supabase.from("organization_employees").update({ is_active: true }).eq("id", e.id);
      toast.success("Funcionário reativado.");
      await load();
    });
  };

  const confirmDeactivate = () =>
    guard(async () => {
      if (!deactivating) return;
      const subs = employees.filter((x) => x.manager_id === deactivating.id);
      if (subs.length > 0) {
        const newManager = transferTo === "__none__" ? null : transferTo;
        for (const s of subs) {
          await supabase.from("organization_employees").update({ manager_id: newManager }).eq("id", s.id);
        }
      }
      const { error } = await supabase.from("organization_employees").update({ is_active: false }).eq("id", deactivating.id);
      if (error) toast.error("Não foi possível desativar.");
      else toast.success("Funcionário desativado.");
      setDeactivating(null);
      await load();
    });

  const openNew = (managerId: string | null = null) => {
    setDraft(emptyDraft(managerId));
    setFormOpen(true);
  };
  const openEdit = (e: OrgEmployee) => {
    setDetail(null);
    setDraft(toDraft(e));
    setFormOpen(true);
  };

  if (loading) return <PageLoader label="Carregando organograma..." />;

  const deactivatingSubs = deactivating ? employees.filter((x) => x.manager_id === deactivating.id) : [];

  return (
    <div>
      <PageHeader
        title="Organograma"
        description="Estrutura hierárquica da empresa — funcionários, áreas e quem responde a quem."
        action={
          isManager && (
            <>
              <Button variant="outline" onClick={() => setAreasOpen(true)}>
                <Settings2 className="mr-1.5 h-4 w-4" /> Áreas
              </Button>
              <Button onClick={() => openNew(null)}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar funcionário
              </Button>
            </>
          )
        }
      />

      {employees.length === 0 ? (
        <EmptyState
          icon={Network}
          title="Monte a estrutura da sua empresa"
          description="Cadastre os funcionários e organize visualmente quem responde a quem."
          action={isManager ? <Button onClick={() => openNew(null)}><Plus className="mr-1.5 h-4 w-4" /> Adicionar primeiro funcionário</Button> : undefined}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar funcionário..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as áreas</SelectItem>
                {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowInactive((v) => !v)}>
                {showInactive ? "Ocultar inativos" : "Mostrar inativos"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowJobTitle((v) => !v)}>
                {showJobTitle ? "Ocultar cargo" : "Mostrar cargo"}
              </Button>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as "chart" | "list")}>
              <TabsList>
                <TabsTrigger value="chart"><GitBranch className="mr-1.5 h-4 w-4" /> Organograma</TabsTrigger>
                <TabsTrigger value="list"><List className="mr-1.5 h-4 w-4" /> Lista</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {view === "chart" ? (
            <OrgChartCanvas
              nodes={tree}
              areas={areas}
              canManage={isManager}
              highlightId={highlightId}
              dimmedIds={dimmed}
              showJobTitle={showJobTitle}
              onOpen={setDetail}
              onEdit={openEdit}
              onAddSubordinate={(e) => openNew(e.id)}
              onChangeManager={openEdit}
              onToggleActive={toggleActive}
              onMoveSibling={(e, d) => void moveSibling(e, d)}
              onRequestReparent={(dragged, target) => setReparent({ dragged, target })}
            />
          ) : (
            <OrganizationListView
              employees={[...visible].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
              areas={areas}
              canManage={isManager}
              onEdit={openEdit}
              onOpen={setDetail}
            />
          )}
        </>
      )}

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={draft}
        areas={areas}
        employees={employees}
        saving={saving}
        onSubmit={submitEmployee}
      />

      <OrganizationAreaManager
        open={areasOpen}
        onOpenChange={setAreasOpen}
        areas={areas}
        employees={employees}
        onChanged={load}
      />

      <EmployeeDetailDrawer
        employee={detail}
        area={areas.find((a) => a.id === detail?.area_id)}
        manager={employees.find((e) => e.id === detail?.manager_id)}
        subordinates={employees.filter((e) => e.manager_id === detail?.id)}
        canManage={isManager}
        onOpenChange={(v) => !v && setDetail(null)}
        onEdit={openEdit}
        onAddSubordinate={(e) => { setDetail(null); openNew(e.id); }}
      />

      <AlertDialog open={!!reparent} onOpenChange={(v) => !v && setReparent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar superior direto?</AlertDialogTitle>
            <AlertDialogDescription>
              Alterar superior direto de <strong>{reparent?.dragged.name}</strong> para <strong>{reparent?.target.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmReparent(); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deactivating} onOpenChange={(v) => !v && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {deactivating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivatingSubs.length > 0
                ? "Este funcionário possui subordinados. Escolha o que fazer com eles."
                : "O registro será mantido no histórico como inativo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deactivatingSubs.length > 0 && (
            <Select value={transferTo} onValueChange={setTransferTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Deixar temporariamente sem superior</SelectItem>
                {employees
                  .filter((e) => e.id !== deactivating?.id && !deactivatingSubs.some((s) => s.id === e.id))
                  .map((e) => <SelectItem key={e.id} value={e.id}>Transferir para {e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmDeactivate(); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
