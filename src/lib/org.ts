export interface OrgArea {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface OrgEmployee {
  id: string;
  name: string;
  area_id: string | null;
  job_title: string | null;
  manager_id: string | null;
  email: string | null;
  phone: string | null;
  avatar_path: string | null;
  crm_user_id: string | null;
  notes: string | null;
  hire_date: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface OrgNode {
  employee: OrgEmployee;
  children: OrgNode[];
  depth: number;
}

export const EMPLOYEE_FIELDS =
  "id,name,area_id,job_title,manager_id,email,phone,avatar_path,crm_user_id,notes,hire_date,is_active,sort_order";

export const AREA_FIELDS = "id,name,color,sort_order,is_active";

/** Builds the hierarchy. Orphan managers (filtered out / missing) become roots. */
export function buildTree(employees: OrgEmployee[]): OrgNode[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenOf = new Map<string | null, OrgEmployee[]>();

  for (const e of employees) {
    const key = e.manager_id && byId.has(e.manager_id) ? e.manager_id : null;
    const list = childrenOf.get(key) ?? [];
    list.push(e);
    childrenOf.set(key, list);
  }

  const sortFn = (a: OrgEmployee, b: OrgEmployee) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR");

  const build = (parentId: string | null, depth: number, seen: Set<string>): OrgNode[] =>
    (childrenOf.get(parentId) ?? [])
      .slice()
      .sort(sortFn)
      .filter((e) => !seen.has(e.id))
      .map((employee) => {
        seen.add(employee.id);
        return { employee, children: build(employee.id, depth + 1, seen), depth };
      });

  return build(null, 0, new Set());
}

/** All ids below `id` (inclusive of `id`) — used to block circular hierarchies. */
export function descendantIds(employees: OrgEmployee[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of employees) {
      if (e.manager_id && result.has(e.manager_id) && !result.has(e.id)) {
        result.add(e.id);
        changed = true;
      }
    }
  }
  return result;
}

export function wouldCreateCycle(employees: OrgEmployee[], employeeId: string, newManagerId: string | null) {
  if (!newManagerId) return false;
  if (newManagerId === employeeId) return true;
  return descendantIds(employees, employeeId).has(newManagerId);
}

export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function flattenTree(nodes: OrgNode[]): OrgNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}
