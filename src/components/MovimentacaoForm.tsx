"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useFinance, sugerirCategoria, type NovaMovimentacaoInput } from "@/lib/store";
import { parseBRL, todayISO } from "@/lib/format";
import type { FormaPagamento, TipoMovimentacao } from "@/lib/types";

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
];

export default function MovimentacaoForm({ onClose }: { onClose: () => void }) {
  const { contas, cartoes, categorias, addMovimentacao, addConta, addRecorrencia } = useFinance();

  const [tipo, setTipo] = useState<TipoMovimentacao>("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [cartaoId, setCartaoId] = useState(cartoes[0]?.id ?? "");
  const [dataCompra, setDataCompra] = useState(todayISO());
  const [totalParcelas, setTotalParcelas] = useState("1");
  const [jaPago, setJaPago] = useState(false);
  const [repetirTodoMes, setRepetirTodoMes] = useState(false);
  const [sugestaoAplicada, setSugestaoAplicada] = useState(false);
  const [novaContaAberta, setNovaContaAberta] = useState(false);
  const [novaContaNome, setNovaContaNome] = useState("");

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const usaCartao = formaPagamento === "credito";
  const podeRepetir = !usaCartao || Math.max(1, Number(totalParcelas) || 1) === 1;

  // Se a conta selecionada some da lista (ex: acabou de trocar de tipo) ou
  // ainda não tem nenhuma, seleciona a primeira disponível automaticamente.
  useEffect(() => {
    if (!contaId && contas[0]) setContaId(contas[0].id);
  }, [contas, contaId]);

  // "Camada inteligente": ao digitar a descrição, sugere categoria + forma de
  // pagamento com base em palavras-chave — só na primeira vez que casa (não
  // sobrescreve se a pessoa já mexeu manualmente depois).
  useEffect(() => {
    if (sugestaoAplicada || tipo !== "despesa" || descricao.trim().length < 3) return;
    const sugestao = sugerirCategoria(descricao);
    if (sugestao) {
      setCategoriaId(sugestao.categoriaId);
      setFormaPagamento(sugestao.formaPagamento);
      setSugestaoAplicada(true);
    }
  }, [descricao, tipo, sugestaoAplicada]);

  useEffect(() => {
    if (!categoriaId && categoriasDoTipo[0]) setCategoriaId(categoriasDoTipo[0].id);
  }, [categoriasDoTipo, categoriaId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorNumerico = parseBRL(valor);
    if (!descricao.trim() || !valorNumerico || !categoriaId) return;

    const input: NovaMovimentacaoInput = {
      tipo,
      descricao: descricao.trim(),
      valor: valorNumerico,
      categoriaId,
      formaPagamento,
      dataCompra,
      contaId: usaCartao ? null : contaId || null,
      cartaoId: usaCartao ? cartaoId || null : null,
      totalParcelas: usaCartao ? Math.max(1, Number(totalParcelas) || 1) : 1,
      jaPago,
    };
    addMovimentacao(input);

    if (repetirTodoMes && podeRepetir) {
      const diaVencimento = Number(dataCompra.split("-")[2]) || 1;
      addRecorrencia({
        descricao: descricao.trim(),
        valor: valorNumerico,
        categoriaId,
        diaVencimento,
        frequencia: "mensal",
        ativo: true,
        tipo: tipo === "receita" ? "receita" : "despesa",
      });
    }

    onClose();
  }

  function criarConta() {
    if (!novaContaNome.trim()) return;
    addConta({ nome: novaContaNome.trim(), tipo: "corrente", saldoInicial: 0 });
    setNovaContaNome("");
    setNovaContaAberta(false);
    // A conta nova entra no fim da lista; o useEffect acima só preenche
    // contaId quando ele está vazio, então aqui é seguro assumir que ela
    // vai aparecer no <select> — quem usa escolhe se quiser trocar.
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Nova movimentação</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {(["despesa", "receita"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => {
                  setTipo(t);
                  setCategoriaId("");
                }}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                  tipo === t ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border text-muted"
                }`}
              >
                {t === "despesa" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          <Campo label="Descrição">
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Uber, iFood, Salário..."
              className="input"
              required
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Valor">
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="input"
                required
              />
            </Campo>
            <Campo label="Data da compra">
              <input
                type="date"
                value={dataCompra}
                onChange={(e) => setDataCompra(e.target.value)}
                className="input"
                required
              />
            </Campo>
          </div>

          <Campo label="Categoria">
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="input" required>
              {categoriasDoTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Forma de pagamento">
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
              className="input"
            >
              {FORMAS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Campo>

          {usaCartao ? (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Cartão">
                <select value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} className="input">
                  {cartoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Parcelas">
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={totalParcelas}
                  onChange={(e) => setTotalParcelas(e.target.value)}
                  className="input"
                />
                <p className="mt-1 text-xs text-muted">
                  1 = compra à vista ou assinatura. Só aumenta se for parcelado de verdade (ex: 10x no notebook).
                </p>
              </Campo>
            </div>
          ) : (
            <div>
              <Campo label="Conta">
                {contas.length > 0 ? (
                  <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="input">
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted">
                    Você ainda não tem nenhuma conta cadastrada.
                  </p>
                )}
              </Campo>

              {novaContaAberta ? (
                <div className="mt-2 flex gap-2">
                  <input
                    value={novaContaNome}
                    onChange={(e) => setNovaContaNome(e.target.value)}
                    placeholder="Ex: Nubank, Carteira..."
                    className="input"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={criarConta}
                    className="shrink-0 rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    Criar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNovaContaAberta(true)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <Plus size={12} /> Nova conta
                </button>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} />
            Já {tipo === "receita" ? "recebi" : "paguei"}
          </label>

          {podeRepetir && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={repetirTodoMes}
                onChange={(e) => setRepetirTodoMes(e.target.checked)}
              />
              🔁 Repetir todo mês (vira uma {tipo === "receita" ? "renda" : "conta"} fixa em
              &nbsp;<span className="font-medium">Contas e Parcelas</span>)
            </label>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
