"use client";

import { useMemo, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { useFinance } from "@/lib/store";
import { proximosVencimentos } from "@/lib/calc";
import EmptyState from "@/components/EmptyState";
import SectionCard from "@/components/SectionCard";
import { classNames, formatBRL, formatDateBR } from "@/lib/format";
import type { Frequencia } from "@/lib/types";

const FREQUENCIA_LABEL: Record<Frequencia, string> = {
  mensal: "Mensal",
  semanal: "Semanal",
  anual: "Anual",
};

export default function ContasFixasPage() {
  const state = useFinance();
  const { recorrencias, categorias, movimentacoes, toggleRecorrencia, excluirRecorrencia } = state;
  const [formAberto, setFormAberto] = useState(false);

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const vencimentos = useMemo(() => proximosVencimentos(state, 45), [state]);

  const parcelamentos = useMemo(() => {
    const grupos = new Map<string, typeof movimentacoes>();
    for (const m of movimentacoes) {
      if (!m.parcelaGrupoId) continue;
      const lista = grupos.get(m.parcelaGrupoId) ?? [];
      lista.push(m);
      grupos.set(m.parcelaGrupoId, lista);
    }
    return [...grupos.entries()].map(([grupoId, itens]) => {
      const ordenadas = [...itens].sort((a, b) => (a.numeroParcela ?? 0) - (b.numeroParcela ?? 0));
      const pagas = ordenadas.filter((m) => m.status === "pago").length;
      const proxima = ordenadas.find((m) => m.status !== "pago");
      return { grupoId, itens: ordenadas, pagas, total: ordenadas.length, proxima };
    });
  }, [movimentacoes]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-ink">Contas e Parcelas</h1>
        <p className="text-sm text-muted">Gastos fixos, assinaturas e o que está parcelado.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Gastos fixos e assinaturas"
          action={
            <button
              onClick={() => setFormAberto(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              <Plus size={14} /> Nova
            </button>
          }
        >
          {recorrencias.length === 0 ? (
            <EmptyState text="Nenhuma conta fixa cadastrada." />
          ) : (
            <ul className="divide-y divide-border">
              {recorrencias.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className={classNames("text-sm font-medium", r.ativo ? "text-ink" : "text-muted line-through")}>
                      {r.descricao}
                    </p>
                    <p className="text-xs text-muted">
                      {categoriaPorId.get(r.categoriaId)?.nome ?? "—"} · dia {r.diaVencimento} ·{" "}
                      {FREQUENCIA_LABEL[r.frequencia]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{formatBRL(r.valor)}</span>
                    <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={r.ativo}
                        onChange={(e) => toggleRecorrencia(r.id, e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-brand-500" />
                      <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                    </label>
                    <button
                      onClick={() => excluirRecorrencia(r.id)}
                      className="rounded-lg p-1.5 text-bad hover:bg-bad/10"
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Calendário financeiro (próximos 45 dias)">
          {vencimentos.length === 0 ? (
            <EmptyState text="Nada vencendo nos próximos 45 dias." />
          ) : (
            <ul className="divide-y divide-border">
              {vencimentos.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink">{v.descricao}</p>
                    <p className="text-xs text-muted">
                      {v.origem === "cartao" ? "Cartão" : "Conta"} · {formatDateBR(v.vencimento)}
                    </p>
                  </div>
                  <span className={classNames("font-medium", v.atrasado ? "text-bad" : "text-ink")}>
                    {formatBRL(v.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Parcelamentos em andamento">
        {parcelamentos.length === 0 ? (
          <EmptyState text="Nenhuma compra parcelada em aberto." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {parcelamentos.map((p) => {
              const nome = p.itens[0]?.descricao.replace(/\s*\(\d+\/\d+\)$/, "");
              const pct = Math.round((p.pagas / p.total) * 100);
              return (
                <div key={p.grupoId} className="rounded-xl border border-border p-4">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{nome}</span>
                    <span className="text-muted">
                      {p.pagas}/{p.total} pagas
                    </span>
                  </div>
                  <div className="budget-bar" style={{ ["--pct" as string]: pct }}>
                    <span style={{ background: "#8B5CF6" }} />
                  </div>
                  {p.proxima && (
                    <p className="mt-2 text-xs text-muted">
                      Próxima parcela: {formatBRL(p.proxima.valor)} em {formatDateBR(p.proxima.dataVencimento)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {formAberto && <NovaRecorrenciaForm onClose={() => setFormAberto(false)} />}
    </div>
  );
}

function NovaRecorrenciaForm({ onClose }: { onClose: () => void }) {
  const { categorias, addRecorrencia } = useFinance();
  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoriaId, setCategoriaId] = useState(despesas[0]?.id ?? "");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Nova conta fixa</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!descricao.trim() || !valor || !categoriaId) return;
            addRecorrencia({
              descricao: descricao.trim(),
              valor: Number(valor.replace(",", ".")) || 0,
              categoriaId,
              diaVencimento: Number(diaVencimento) || 1,
              frequencia,
              ativo: true,
            });
            onClose();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Descrição</span>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="input" placeholder="Ex: Aluguel" required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Valor</span>
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className="input" placeholder="0,00" required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Dia do vencimento</span>
              <input type="number" min={1} max={28} value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} className="input" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Categoria</span>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="input">
              {despesas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Frequência</span>
            <select value={frequencia} onChange={(e) => setFrequencia(e.target.value as Frequencia)} className="input">
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
              <option value="anual">Anual</option>
            </select>
          </label>
          <button type="submit" className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}
