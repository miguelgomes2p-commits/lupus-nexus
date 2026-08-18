import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { descendantIds, type OrgArea, type OrgEmployee } from "@/lib/org";

export interface EmployeeDraft {
  id?: string;
  name: string;
  area_id: string | null;
  job_title: string;
  manager_id: string | null;
  email: string;
  phone: string;
  avatar_path: string;
  notes: string;
  hire_date: string;
}

export const emptyDraft = (managerId: string | null = null): EmployeeDraft => ({
  name: "",
  area_id: null,
  job_title: "",
  manager_id: managerId,
  email: "",
  phone: "",
  avatar_path: "",
  notes: "",
  hire_date: "",
});

export function toDraft(e: OrgEmployee): EmployeeDraft {
  return {
    id: e.id,
    name: e.name,
    area_id: e.area_id,
    job_title: e.job_title ?? "",
    manager_id: e.manager_id,
    email: e.email ?? "",
    phone: e.phone ?? "",
    avatar_path: e.avatar_path ?? "",
    notes: e.notes ?? "",
    hire_date: e.hire_date ?? "",
  };
}

const NONE = "__none__";

export function EmployeeFormDialog({
  open,
  onOpenChange,
  initial,
  areas,
  employees,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: EmployeeDraft;
  areas: OrgArea[];
  employees: OrgEmployee[];
  saving: boolean;
  onSubmit: (draft: EmployeeDraft) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<EmployeeDraft>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const blocked = draft.id ? descendantIds(employees, draft.id) : new Set<string>();
  const managerOptions = employees.filter((e) => !blocked.has(e.id));

  const submit = async () => {
    if (!draft.name.trim()) return toast.error("Informe o nome do funcionário.");
    if (!draft.area_id) return toast.error("Selecione a área.");
    if (draft.id && draft.manager_id && blocked.has(draft.manager_id)) {
      return toast.error("Hierarquia circular: esse superior está abaixo do funcionário.");
    }
    await onSubmit(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nome *</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Miguel Gomes" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Área *</Label>
              <Select value={draft.area_id ?? ""} onValueChange={(v) => setDraft({ ...draft, area_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {areas.filter((a) => a.is_active || a.id === draft.area_id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Cargo</Label>
              <Input value={draft.job_title} onChange={(e) => setDraft({ ...draft, job_title: e.target.value })} placeholder="Ex.: Gerente Comercial" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Superior direto</Label>
            <Select
              value={draft.manager_id ?? NONE}
              onValueChange={(v) => setDraft({ ...draft, manager_id: v === NONE ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Sem superior" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem superior (raiz)</SelectItem>
                {managerOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefone</Label>
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Data de entrada</Label>
              <Input type="date" value={draft.hire_date} onChange={(e) => setDraft({ ...draft, hire_date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Foto (URL)</Label>
              <Input value={draft.avatar_path} onChange={(e) => setDraft({ ...draft, avatar_path: e.target.value })} placeholder="opcional" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : draft.id ? "Salvar alterações" : "Adicionar funcionário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
