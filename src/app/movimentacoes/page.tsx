"use client";

import { useMemo, useState } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { useFinance } from "@/lib/store";
import MovimentacaoForm from "@/components/MovimentacaoForm";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { classNames, formatBRL, formatDateBR, todayISO } from "@/lib/format";
import type { TipoMovimentacao } from "@/lib/types";

const FILTRO_TIPOS: { value: TipoMovimentacao | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "despesa", label: "Despesas" },
  { value: "receita", label: "Receitas" },
];

export default function MovimentacoesPage() {
  const { movimentacoes, categorias, marcarPago, excluirMovimentacao } = useFinance();
  const [formAberto, setFormAberto] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimentacao | "todos">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const hoje = todayISO();

  const lista = useMemo(() => {
    return movimentacoes
      .filter((m) => filtroTipo === "todos" || m.tipo === filtroTipo)
      .filter((m) => filtroCategoria === "todas" || m.categoriaId === filtroCategoria)
      .sort((a, b) => b.dataCompra.localeCompare(a.dataCompra));
  }, [movimentacoes, filtroTipo, filtroCategoria]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Movimentações</h1>
          <p className="text-sm text-muted">Tudo nasce aqui — receita, despesa ou parcela.</p>
        </div>
        <button
          onClick={() => setFormAberto(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={16} /> Nova movimentação
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTRO_TIPOS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroTipo(f.value)}
            className={classNames(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              filtroTipo === f.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border text-muted"
            )}
          >
            {f.label}
          </button>
        ))}
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-border bg-surface shadow-card">
        {lista.length === 0 ? (
          <div className="p-5">
            <EmptyState text="Nenhuma movimentação encontrada com esses filtros." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Compra</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => {
                  const categoria = categoriaPorId.get(m.categoriaId);
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                      <td className="px-4 py-3 font-medium text-ink">{m.descricao}</td>
                      <td className="px-4 py-3 text-muted">{categoria?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{formatDateBR(m.dataCompra)}</td>
                      <td className="px-4 py-3 text-muted">{formatDateBR(m.dataVencimento)}</td>
                      <td
                        className={classNames(
                          "px-4 py-3 text-right font-medium",
                          m.tipo === "receita" ? "text-good" : "text-ink"
                        )}
                      >
                        {m.tipo === "receita" ? "+" : "-"}
                        {formatBRL(m.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} atrasado={m.dataVencimento < hoje} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {m.status !== "pago" && (
                            <button
                              onClick={() => marcarPago(m.id)}
                              title="Marcar como pago"
                              className="rounded-lg p-1.5 text-good hover:bg-good/10"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => excluirMovimentacao(m.id)}
                            title="Excluir"
                            className="rounded-lg p-1.5 text-bad hover:bg-bad/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formAberto && <MovimentacaoForm onClose={() => setFormAberto(false)} />}
    </div>
  );
}
