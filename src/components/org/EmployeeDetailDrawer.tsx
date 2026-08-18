import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { initialsOf, type OrgArea, type OrgEmployee } from "@/lib/org";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value?.trim() ? value : "—"}</span>
    </div>
  );
}

export function EmployeeDetailDrawer({
  employee,
  area,
  manager,
  subordinates,
  canManage,
  onOpenChange,
  onEdit,
  onAddSubordinate,
}: {
  employee: OrgEmployee | null;
  area?: OrgArea;
  manager?: OrgEmployee;
  subordinates: OrgEmployee[];
  canManage: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (e: OrgEmployee) => void;
  onAddSubordinate: (e: OrgEmployee) => void;
}) {
  return (
    <Sheet open={!!employee} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {employee && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {employee.avatar_path ? (
                    <img src={employee.avatar_path} alt={employee.name} className="h-full w-full object-cover" />
                  ) : (
                    initialsOf(employee.name)
                  )}
                </span>
                <span className="min-w-0 truncate">{employee.name}</span>
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 px-4 pb-6 sm:px-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{area?.name ?? "Sem área"}</Badge>
                <Badge variant={employee.is_active ? "default" : "destructive"}>
                  {employee.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <Row label="Cargo" value={employee.job_title} />
              <Row label="Superior direto" value={manager?.name ?? "—"} />
              <Row label="E-mail" value={employee.email} />
              <Row label="Telefone" value={employee.phone} />
              <Row label="Data de entrada" value={employee.hire_date} />
              <Row label="Subordinados" value={String(subordinates.length)} />
              {employee.notes && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Observações</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{employee.notes}</p>
                </div>
              )}

              {subordinates.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Equipe direta</div>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {subordinates.map((s) => (
                      <li key={s.id} className="rounded-md bg-muted/50 px-2.5 py-1.5">{s.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {canManage && (
                <div className="mt-6 flex gap-2">
                  <Button className="flex-1" onClick={() => onEdit(employee)}>Editar</Button>
                  <Button variant="outline" className="flex-1" onClick={() => onAddSubordinate(employee)}>
                    Adicionar subordinado
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
