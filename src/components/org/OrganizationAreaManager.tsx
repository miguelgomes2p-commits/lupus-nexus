import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Archive, ArchiveRestore, Plus, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { OrgArea, OrgEmployee } from "@/lib/org";

export function OrganizationAreaManager({
  open,
  onOpenChange,
  areas,
  employees,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  areas: OrgArea[];
  employees: OrgEmployee[];
  onChanged: () => void | Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ error: unknown } | void>, okMsg: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res && "error" in res && res.error) throw res.error;
      toast.success(okMsg);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    if (!newName.trim()) return toast.error("Informe o nome da área.");
    void run(async () => {
      const max = Math.max(0, ...areas.map((a) => a.sort_order));
      const { error } = await supabase
        .from("organization_areas")
        .insert({ name: newName.trim(), sort_order: max + 1 });
      setNewName("");
      return { error };
    }, "Área criada.");
  };

  const rename = (a: OrgArea) => {
    const name = (drafts[a.id] ?? a.name).trim();
    if (!name) return toast.error("Nome inválido.");
    void run(async () => await supabase.from("organization_areas").update({ name }).eq("id", a.id), "Área atualizada.");
  };

  const move = (a: OrgArea, dir: -1 | 1) => {
    const ordered = [...areas].sort((x, y) => x.sort_order - y.sort_order);
    const idx = ordered.findIndex((x) => x.id === a.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    void run(async () => {
      const r1 = await supabase.from("organization_areas").update({ sort_order: swap.sort_order }).eq("id", a.id);
      if (r1.error) return { error: r1.error };
      return await supabase.from("organization_areas").update({ sort_order: a.sort_order }).eq("id", swap.id);
    }, "Ordem atualizada.");
  };

  const toggleArchive = (a: OrgArea) => {
    if (a.is_active && employees.some((e) => e.area_id === a.id)) {
      toast.info("Área com funcionários será apenas arquivada (nenhum dado é apagado).");
    }
    void run(
      async () => await supabase.from("organization_areas").update({ is_active: !a.is_active }).eq("id", a.id),
      a.is_active ? "Área arquivada." : "Área reativada.",
    );
  };

  const sorted = [...areas].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Áreas do organograma</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input placeholder="Nova área..." value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={create} disabled={busy}><Plus className="mr-1.5 h-4 w-4" /> Criar</Button>
        </div>

        <div className="mt-2 space-y-2">
          {sorted.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border p-2">
              <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.color ?? "hsl(var(--primary))" }} />
              <Input
                className="h-8"
                value={drafts[a.id] ?? a.name}
                onChange={(e) => setDrafts({ ...drafts, [a.id]: e.target.value })}
              />
              <span className="w-16 shrink-0 text-center text-xs text-muted-foreground">
                {employees.filter((e) => e.area_id === a.id).length} pess.
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Salvar nome" onClick={() => rename(a)}><Save className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Subir" onClick={() => move(a, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Descer" onClick={() => move(a, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Arquivar" onClick={() => toggleArchive(a)}>
                {a.is_active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
