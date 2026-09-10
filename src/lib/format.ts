const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number): string {
  return currencyFormatter.format(value ?? 0);
}

export function formatDateBR(iso?: string | null): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatDateShortBR(iso?: string | null): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  if (!month || !day) return iso;
  return `${day}/${month}`;
}

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function monthLabel(mes: number): string {
  return MONTH_LABELS[mes - 1] ?? "";
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Soma `dias` dias a uma data ISO (yyyy-mm-dd), preservando o fuso local. */
export function addDaysISO(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Monta uma data ISO a partir de ano/mês(1-12)/dia, ajustando dias que não existem no mês. */
export function isoFromParts(ano: number, mes: number, dia: number): string {
  // mes é 1-12; new Date(ano, mes, 0) dá o último dia de `mes` (0-indexed => mes atual)
  const lastDay = new Date(ano, mes, 0).getDate();
  const safeDay = Math.min(dia, lastDay);
  const mm = String(mes).padStart(2, "0");
  const dd = String(safeDay).padStart(2, "0");
  return `${ano}-${mm}-${dd}`;
}

export function classNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
