"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useFinance } from "@/lib/store";
import { currentMonthYear, gastosPorCategoria, progressoOrcamentos } from "@/lib/calc";
import BudgetBar from "@/components/BudgetBar";
import EmptyState from "@/components/EmptyState";
import { monthLabel } from "@/lib/format";

export default function OrcamentoPage() {
  const state = useFinance();
  const { categorias, setOrcamento } = state;
  const { mes, ano } = currentMonthYear();
  const [formAberto, setFormAberto] = useState(false);

  const progresso = useMemo(() => progressoOrcamentos(state, mes, ano), [state, mes, ano]);
  const semOrcamento = useMemo(() => {
    const comOrcamento = new Set(progresso.map((p) => p.categoria.id));
    const gastos = gastosPorCategoria(state, mes, ano);
    return gastos.filter((g) => !comOrcamento.has(g.categoria.id));
  }, [state, mes, ano, progresso]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Orçamento</h1>
          <p className="text-sm text-muted">
            {monthLabel(mes)} de {ano} — quanto você planejou gastar por categoria.
          </p>
        </div>
        <button
          onClick={() => setFormAberto(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={16} /> Definir orçamento
        </button>
      </header>

      <div className="rounded-xl2 border border-border bg-surface p-5 shadow-card">
        {progresso.length === 0 ? (
          <EmptyState text="Nenhum orçamento definido para este mês ainda." />
        ) : (
          <div className="space-y-5">
            {progresso.map((p) => (
              <BudgetBar key={p.orcamento.id} label={p.categoria.nome} gasto={p.gasto} limite={p.orcamento.limite} />
            ))}
          </div>
        )}
      </div>

      {semOrcamento.length > 0 && (
        <div className="rounded-xl2 border border-dashed border-border p-5">
          <p className="mb-2 text-sm font-medium text-ink">Gastos sem orçamento definido</p>
          <ul className="space-y-1 text-sm text-muted">
            {semOrcamento.map((g) => (
              <li key={g.categoria.id} className="flex justify-between">
                <span>{g.categoria.nome}</span>
                <span className="font-medium text-ink">
                  {g.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {formAberto && (
        <OrcamentoForm
          categorias={categorias.filter((c) => c.tipo === "despesa")}
          mes={mes}
          ano={ano}
          onClose={() => setFormAberto(false)}
          onSubmit={(dados) => {
            setOrcamento(dados);
            setFormAberto(false);
          }}
        />
      )}
    </div>
  );
}

function OrcamentoForm({
  categorias,
  mes,
  ano,
  onClose,
  onSubmit,
}: {
  categorias: { id: string; nome: string }[];
  mes: number;
  ano: number;
  onClose: () => void;
  onSubmit: (dados: { categoriaId: string; mes: number; ano: number; limite: number }) => void;
}) {
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [limite, setLimite] = useState("");

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Definir orçamento</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!categoriaId || !limite) return;
            onSubmit({ categoriaId, mes, ano, limite: Number(limite.replace(",", ".")) || 0 });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Categoria</span>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="input">
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Limite mensal</span>
            <input value={limite} onChange={(e) => setLimite(e.target.value)} inputMode="decimal" className="input" placeholder="0,00" required />
          </label>
          <button type="submit" className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}
