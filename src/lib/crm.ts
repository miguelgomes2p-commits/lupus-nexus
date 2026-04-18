// Centralized type aliases for CRM entities
export type LeadStatus = "novo" | "contatado" | "qualificado" | "proposta" | "negociacao" | "ganho" | "perdido" | "descartado";
export type Temperature = "frio" | "morno" | "quente";
export type Priority = "baixa" | "media" | "alta" | "urgente";
export type OppStatus = "aberta" | "ganha" | "perdida";
export type TaskStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";
export type ClientStatus = "ativo" | "inativo" | "pausado";

export const LEAD_STATUSES: LeadStatus[] = ["novo","contatado","qualificado","proposta","negociacao","ganho","perdido","descartado"];
export const TEMPERATURES: Temperature[] = ["frio","morno","quente"];
export const PRIORITIES: Priority[] = ["baixa","media","alta","urgente"];
export const TASK_STATUSES: TaskStatus[] = ["pendente","em_andamento","concluida","cancelada"];
export const CLIENT_STATUSES: ClientStatus[] = ["ativo","inativo","pausado"];

export const tempColor: Record<Temperature, string> = {
  frio: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  morno: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  quente: "bg-primary/15 text-primary border-primary/30",
};

export const priorityColor: Record<Priority, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/15 text-info-foreground",
  alta: "bg-amber-500/15 text-amber-400",
  urgente: "bg-primary/20 text-primary",
};

export const statusColor: Record<LeadStatus, string> = {
  novo: "bg-blue-500/15 text-blue-400",
  contatado: "bg-cyan-500/15 text-cyan-400",
  qualificado: "bg-violet-500/15 text-violet-400",
  proposta: "bg-amber-500/15 text-amber-400",
  negociacao: "bg-orange-500/15 text-orange-400",
  ganho: "bg-emerald-500/15 text-emerald-400",
  perdido: "bg-primary/15 text-primary",
  descartado: "bg-muted text-muted-foreground",
};

export async function logActivity(
  supabase: any,
  type: string,
  description: string,
  refs: { lead_id?: string; opportunity_id?: string; client_id?: string },
  metadata: any = {}
) {
  const user = (await supabase.auth.getUser()).data.user;
  await supabase.from("activities").insert({
    type, description, user_id: user?.id ?? null,
    lead_id: refs.lead_id ?? null,
    opportunity_id: refs.opportunity_id ?? null,
    client_id: refs.client_id ?? null,
    metadata,
  });
}
