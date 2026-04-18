export const brl = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

export const formatPhone = (v: string) => {
  const d = (v ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3").trim();
};

export const initials = (name?: string | null) =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
