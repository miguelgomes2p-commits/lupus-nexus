import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrgArea, OrgEmployee } from "@/lib/org";

export function OrganizationListView({
  employees,
  areas,
  canManage,
  onEdit,
  onOpen,
}: {
  employees: OrgEmployee[];
  areas: OrgArea[];
  canManage: boolean;
  onEdit: (e: OrgEmployee) => void;
  onOpen: (e: OrgEmployee) => void;
}) {
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const byId = new Map(employees.map((e) => [e.id, e]));

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Superior</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.id} className="cursor-pointer" onClick={() => onOpen(e)}>
              <TableCell className="font-medium">{e.name}</TableCell>
              <TableCell>{e.area_id ? (areaById.get(e.area_id)?.name ?? "—") : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{e.job_title || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{e.manager_id ? (byId.get(e.manager_id)?.name ?? "—") : "—"}</TableCell>
              <TableCell>
                <Badge variant={e.is_active ? "default" : "destructive"}>{e.is_active ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}>Editar</Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
