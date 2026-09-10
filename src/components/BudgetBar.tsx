import { formatBRL } from "@/lib/format";

export default function BudgetBar({
  label,
  gasto,
  limite,
}: {
  label: string;
  gasto: number;
  limite: number;
}) {
  const pct = limite > 0 ? Math.round((gasto / limite) * 100) : 0;
  const cor = pct >= 100 ? "#dc2626" : pct >= 80 ? "#d97706" : "#0f9d8c";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">
          {formatBRL(gasto)} <span className="text-muted/70">/ {formatBRL(limite)}</span>
        </span>
      </div>
      <div className="budget-bar" style={{ ["--pct" as string]: Math.min(pct, 100) }}>
        <span style={{ background: cor }} />
      </div>
      <p className="mt-1 text-xs text-muted">{pct}% do orçamento</p>
    </div>
  );
}
