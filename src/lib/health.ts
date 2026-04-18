/**
 * LUPUS — Health Score & Sales Intelligence
 * Calcula saúde de leads e oportunidades, detecta estagnação e sugere próximas ações.
 */

export type HealthLevel = "critico" | "atencao" | "saudavel" | "excelente";

export interface HealthResult {
  score: number; // 0-100
  level: HealthLevel;
  label: string;
  reasons: string[];
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

interface LeadHealthInput {
  created_at?: string | null;
  last_interaction_at?: string | null;
  next_action_at?: string | null;
  temperature?: string | null;
  estimated_value?: number | null;
  status?: string | null;
}

interface OppHealthInput {
  created_at?: string | null;
  last_moved_at?: string | null;
  expected_close_date?: string | null;
  probability?: number | null;
  value?: number | null;
  status?: string | null;
}

const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
};

const daysUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.floor(ms / 86_400_000);
};

const buildResult = (score: number, reasons: string[]): HealthResult => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  let level: HealthLevel;
  let label: string;
  let color: string;
  let textColor: string;
  let bgColor: string;
  let borderColor: string;

  if (clamped >= 80) {
    level = "excelente";
    label = "Excelente";
    color = "oklch(0.72 0.18 150)";
    textColor = "text-[oklch(0.78_0.18_150)]";
    bgColor = "bg-[oklch(0.72_0.18_150)/0.12]";
    borderColor = "border-[oklch(0.72_0.18_150)/0.35]";
  } else if (clamped >= 60) {
    level = "saudavel";
    label = "Saudável";
    color = "oklch(0.68 0.16 240)";
    textColor = "text-[oklch(0.72_0.16_240)]";
    bgColor = "bg-[oklch(0.68_0.16_240)/0.12]";
    borderColor = "border-[oklch(0.68_0.16_240)/0.35]";
  } else if (clamped >= 35) {
    level = "atencao";
    label = "Atenção";
    color = "oklch(0.78 0.16 75)";
    textColor = "text-[oklch(0.82_0.16_75)]";
    bgColor = "bg-[oklch(0.78_0.16_75)/0.14]";
    borderColor = "border-[oklch(0.78_0.16_75)/0.4]";
  } else {
    level = "critico";
    label = "Crítico";
    color = "oklch(0.585 0.245 27)";
    textColor = "text-primary";
    bgColor = "bg-primary/15";
    borderColor = "border-primary/40";
  }

  return { score: clamped, level, label, color, textColor, bgColor, borderColor, reasons };
};

export function leadHealth(lead: LeadHealthInput): HealthResult {
  let score = 60;
  const reasons: string[] = [];

  const dSinceInteraction = daysSince(lead.last_interaction_at) ?? daysSince(lead.created_at);
  if (dSinceInteraction === null) {
    score -= 10;
    reasons.push("Sem registro de interação");
  } else if (dSinceInteraction <= 2) {
    score += 18;
    reasons.push("Interação recente");
  } else if (dSinceInteraction <= 7) {
    score += 6;
  } else if (dSinceInteraction <= 14) {
    score -= 8;
    reasons.push(`${dSinceInteraction}d sem interação`);
  } else if (dSinceInteraction <= 30) {
    score -= 22;
    reasons.push(`${dSinceInteraction}d sem interação`);
  } else {
    score -= 38;
    reasons.push("Lead frio há mais de 30d");
  }

  const dToAction = daysUntil(lead.next_action_at);
  if (dToAction === null) {
    score -= 6;
    reasons.push("Sem próxima ação agendada");
  } else if (dToAction < 0) {
    score -= 18;
    reasons.push(`Próxima ação atrasada (${Math.abs(dToAction)}d)`);
  } else if (dToAction <= 3) {
    score += 8;
  }

  switch (lead.temperature) {
    case "quente": score += 14; break;
    case "morno": score += 4; break;
    case "frio": score -= 6; break;
  }

  if (lead.estimated_value && lead.estimated_value >= 50_000) score += 6;

  if (lead.status === "ganho") score = 100;
  if (lead.status === "perdido" || lead.status === "descartado") score = 5;

  return buildResult(score, reasons);
}

export function opportunityHealth(opp: OppHealthInput): HealthResult {
  let score = 55;
  const reasons: string[] = [];

  const dSinceMove = daysSince(opp.last_moved_at) ?? daysSince(opp.created_at);
  if (dSinceMove === null) {
    score -= 5;
  } else if (dSinceMove <= 3) {
    score += 16;
    reasons.push("Movimentação recente");
  } else if (dSinceMove <= 7) {
    score += 4;
  } else if (dSinceMove <= 14) {
    score -= 10;
    reasons.push(`${dSinceMove}d sem movimentação`);
  } else if (dSinceMove <= 30) {
    score -= 24;
    reasons.push(`Estagnada há ${dSinceMove}d`);
  } else {
    score -= 40;
    reasons.push("Estagnada há mais de 30d");
  }

  const prob = opp.probability ?? 50;
  score += (prob - 50) * 0.35;
  if (prob >= 75) reasons.push(`Alta probabilidade (${prob}%)`);
  if (prob <= 25) reasons.push(`Baixa probabilidade (${prob}%)`);

  const dToClose = daysUntil(opp.expected_close_date);
  if (dToClose !== null) {
    if (dToClose < 0) {
      score -= 16;
      reasons.push(`Fechamento atrasado (${Math.abs(dToClose)}d)`);
    } else if (dToClose <= 7) {
      score += 8;
      reasons.push("Próxima do fechamento");
    }
  }

  if ((opp.value ?? 0) >= 100_000) score += 6;

  if (opp.status === "ganha") score = 100;
  if (opp.status === "perdida") score = 5;

  return buildResult(score, reasons);
}

export const isStagnant = (lastMovedAt?: string | null, threshold = 14): boolean => {
  const d = daysSince(lastMovedAt);
  return d !== null && d >= threshold;
};

export const ageInDays = (createdAt?: string | null): number => daysSince(createdAt) ?? 0;

export const formatRelative = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = daysSince(iso);
  if (d === null) return "—";
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 7) return `${d}d atrás`;
  if (d < 30) return `${Math.floor(d / 7)}sem atrás`;
  if (d < 365) return `${Math.floor(d / 30)}m atrás`;
  return `${Math.floor(d / 365)}a atrás`;
};

export const suggestNextAction = (
  lead: LeadHealthInput
): { label: string; urgent: boolean } => {
  const d = daysSince(lead.last_interaction_at) ?? daysSince(lead.created_at) ?? 0;
  if (lead.status === "novo") return { label: "Fazer primeiro contato", urgent: d > 1 };
  if (lead.status === "contatado") return { label: "Qualificar lead", urgent: d > 3 };
  if (lead.status === "qualificado") return { label: "Enviar proposta", urgent: d > 5 };
  if (lead.status === "proposta") return { label: "Follow-up de proposta", urgent: d > 4 };
  if (lead.status === "negociacao") return { label: "Avançar negociação", urgent: d > 7 };
  return { label: "Registrar interação", urgent: d > 7 };
};
