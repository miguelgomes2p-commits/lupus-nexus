// ERP shared enums and helpers (post-CRM cleanup).
export type Priority = "baixa" | "media" | "alta" | "urgente";
export type TaskStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";
export type ClientStatus = "ativo" | "inativo" | "pausado";

export const PRIORITIES: Priority[] = ["baixa", "media", "alta", "urgente"];
export const TASK_STATUSES: TaskStatus[] = ["pendente", "em_andamento", "concluida", "cancelada"];
export const CLIENT_STATUSES: ClientStatus[] = ["ativo", "inativo", "pausado"];

export const priorityColor: Record<Priority, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/15 text-info-foreground",
  alta: "bg-amber-500/15 text-amber-400",
  urgente: "bg-primary/20 text-primary",
};

// Kept as no-op to avoid touching every legacy call site.
// The activity_log table is untouched by ERP flows; UI-facing timelines were removed.
export async function logActivity(
  _supabase: any,
  _type: string,
  _description: string,
  _refs: Record<string, any> = {},
  _metadata: any = {},
) {
  return;
}
