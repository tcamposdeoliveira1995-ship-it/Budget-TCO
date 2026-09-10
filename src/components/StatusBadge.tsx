import { classNames } from "@/lib/format";
import type { StatusMovimentacao } from "@/lib/types";

const LABELS: Record<StatusMovimentacao, string> = {
  pago: "Pago",
  pendente: "Pendente",
  agendado: "Agendado",
};

const CLASSES: Record<StatusMovimentacao, string> = {
  pago: "bg-good/10 text-good",
  pendente: "bg-warn/10 text-warn",
  agendado: "bg-muted/10 text-muted",
};

export default function StatusBadge({
  status,
  atrasado,
}: {
  status: StatusMovimentacao;
  atrasado?: boolean;
}) {
  if (atrasado && status !== "pago") {
    return (
      <span className="rounded-full bg-bad/10 px-2 py-0.5 text-xs font-medium text-bad">
        Atrasado
      </span>
    );
  }
  return (
    <span className={classNames("rounded-full px-2 py-0.5 text-xs font-medium", CLASSES[status])}>
      {LABELS[status]}
    </span>
  );
}
