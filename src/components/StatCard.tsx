import type { LucideIcon } from "lucide-react";
import { classNames, formatBRL } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "bad" | "warn";
  hint?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "bg-canvas text-ink",
  good: "bg-good/10 text-good",
  bad: "bg-bad/10 text-bad",
  warn: "bg-warn/10 text-warn",
};

export default function StatCard({ label, value, icon: Icon, tone = "neutral", hint }: StatCardProps) {
  return (
    <div className="rounded-xl2 border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <div className={classNames("flex h-8 w-8 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
          <Icon size={16} strokeWidth={2.25} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{formatBRL(value)}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
