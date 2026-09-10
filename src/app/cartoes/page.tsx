"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useFinance } from "@/lib/store";
import {
  faturaAtualCartao,
  limiteDisponivelCartao,
  proximasFaturasCartao,
} from "@/lib/calc";
import EmptyState from "@/components/EmptyState";
import { classNames, formatBRL, formatDateBR } from "@/lib/format";

export default function CartoesPage() {
  const { cartoes, movimentacoes, addCartao } = useFinance();
  const [formAberto, setFormAberto] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Cartões</h1>
          <p className="text-sm text-muted">Limite, fatura atual e o que ainda vem por aí.</p>
        </div>
        <button
          onClick={() => setFormAberto(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={16} /> Novo cartão
        </button>
      </header>

      {cartoes.length === 0 ? (
        <EmptyState text="Nenhum cartão cadastrado ainda." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cartoes.map((cartao) => {
            const disponivel = limiteDisponivelCartao(cartao, movimentacoes);
            const usadoPct = cartao.limite > 0 ? Math.min(100, Math.round(((cartao.limite - disponivel) / cartao.limite) * 100)) : 0;
            const faturaAtual = faturaAtualCartao(cartao, movimentacoes);
            const proximas = proximasFaturasCartao(cartao, movimentacoes, 3).filter(
              (f) => f.vencimento !== faturaAtual?.vencimento
            );

            return (
              <div key={cartao.id} className="rounded-xl2 border border-border bg-surface p-5 shadow-card">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="h-9 w-9 rounded-xl2"
                    style={{ background: cartao.cor || "#8B5CF6" }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink">{cartao.nome}</p>
                    <p className="text-xs text-muted">
                      Fecha dia {cartao.diaFechamento} · vence dia {cartao.diaVencimento}
                    </p>
                  </div>
                </div>

                <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                  <span>Limite usado</span>
                  <span>{formatBRL(cartao.limite - disponivel)} de {formatBRL(cartao.limite)}</span>
                </div>
                <div className="budget-bar" style={{ ["--pct" as string]: usadoPct }}>
                  <span style={{ background: usadoPct >= 90 ? "#E8607D" : usadoPct >= 70 ? "#EAA648" : "#8B5CF6" }} />
                </div>
                <p className={classNames("mt-1.5 text-xs font-medium", disponivel < 0 ? "text-bad" : "text-good")}>
                  {formatBRL(disponivel)} disponível
                </p>

                <div className="mt-4 rounded-xl bg-canvas p-3">
                  <p className="text-xs text-muted">Fatura atual</p>
                  {faturaAtual ? (
                    <>
                      <p className="text-lg font-semibold text-ink">{formatBRL(faturaAtual.valor)}</p>
                      <p className="text-xs text-muted">vence {formatDateBR(faturaAtual.vencimento)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">Sem fatura em aberto 🎉</p>
                  )}
                </div>

                {proximas.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-medium text-muted">Próximas faturas</p>
                    <ul className="space-y-1 text-xs">
                      {proximas.map((f) => (
                        <li key={f.vencimento} className="flex justify-between text-muted">
                          <span>{formatDateBR(f.vencimento)}</span>
                          <span className="font-medium text-ink">{formatBRL(f.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formAberto && (
        <NovoCartaoForm
          onClose={() => setFormAberto(false)}
          onSubmit={(dados) => {
            addCartao(dados);
            setFormAberto(false);
          }}
        />
      )}
    </div>
  );
}

function NovoCartaoForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (dados: { nome: string; limite: number; diaFechamento: number; diaVencimento: number; cor: string }) => void;
}) {
  const [nome, setNome] = useState("");
  const [limite, setLimite] = useState("");
  const [diaFechamento, setDiaFechamento] = useState("25");
  const [diaVencimento, setDiaVencimento] = useState("5");
  const [cor, setCor] = useState("#8B5CF6");

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Novo cartão</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim() || !limite) return;
            onSubmit({
              nome: nome.trim(),
              limite: Number(limite.replace(",", ".")) || 0,
              diaFechamento: Number(diaFechamento) || 1,
              diaVencimento: Number(diaVencimento) || 1,
              cor,
            });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" placeholder="Ex: Nubank" required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Limite</span>
            <input value={limite} onChange={(e) => setLimite(e.target.value)} inputMode="decimal" className="input" placeholder="0,00" required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Fechamento (dia)</span>
              <input type="number" min={1} max={28} value={diaFechamento} onChange={(e) => setDiaFechamento(e.target.value)} className="input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Vencimento (dia)</span>
              <input type="number" min={1} max={28} value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} className="input" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Cor</span>
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-full rounded-lg border border-border" />
          </label>
          <button type="submit" className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}
