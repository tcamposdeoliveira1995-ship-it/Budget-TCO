"use client";

// Provider central de estado do Financeiro da Tita.
//
// Modo demonstração (sem NEXT_PUBLIC_SHEETS_API_URL): parte dos dados de
// src/lib/demo-data.ts e persiste as edições em localStorage, só pra não
// perder tudo a cada F5 — nada disso é salvo num servidor.
//
// Modo conectado: carrega tudo da planilha via Apps Script (sheetsClient) e
// cada ação de escrita manda a mudança pro backend antes de refletir na tela.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { fetchAll, isDemoMode, postAction } from "./sheetsClient";
import { demoState } from "./demo-data";
import { sugerirVencimentoCartao } from "./calc";
import { todayISO } from "./format";
import type {
  Cartao,
  Categoria,
  Conta,
  FinanceState,
  FormaPagamento,
  Movimentacao,
  Orcamento,
  Recorrencia,
  TipoMovimentacao,
} from "./types";

const STORAGE_KEY = "financeiro-tita-demo-state-v1";

function newId(prefixo: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefixo}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefixo}-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
}

function addMonthsToISO(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const total = mes - 1 + meses;
  const novoAno = ano + Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  const ultimoDia = new Date(novoAno, novoMes, 0).getDate();
  const mm = String(novoMes).padStart(2, "0");
  const dd = String(Math.min(dia, ultimoDia)).padStart(2, "0");
  return `${novoAno}-${mm}-${dd}`;
}

export interface NovaMovimentacaoInput {
  contaId?: string | null;
  cartaoId?: string | null;
  categoriaId: string;
  descricao: string;
  tipo: TipoMovimentacao;
  valor: number;
  formaPagamento: FormaPagamento;
  dataCompra: string;
  totalParcelas?: number;
  jaPago?: boolean;
}

interface FinanceContextValue extends FinanceState {
  loading: boolean;
  demoMode: boolean;
  addMovimentacao: (input: NovaMovimentacaoInput) => void;
  marcarPago: (id: string, dataPagamento?: string) => void;
  excluirMovimentacao: (id: string) => void;
  addCartao: (dados: Omit<Cartao, "id">) => void;
  addConta: (dados: Omit<Conta, "id">) => void;
  addRecorrencia: (dados: Omit<Recorrencia, "id">) => void;
  toggleRecorrencia: (id: string, ativo: boolean) => void;
  excluirRecorrencia: (id: string) => void;
  setOrcamento: (dados: { categoriaId: string; mes: number; ano: number; limite: number }) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(demoState);
  const [loading, setLoading] = useState(!isDemoMode);

  // Modo demonstração: recupera o que a pessoa editou na sessão anterior.
  useEffect(() => {
    if (!isDemoMode) return;
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) setState(JSON.parse(salvo));
    } catch {
      // localStorage indisponível (aba privada etc.) — segue com os dados padrão.
    }
  }, []);

  useEffect(() => {
    if (!isDemoMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sem espaço/sem acesso — não é crítico, só não persiste.
    }
  }, [state]);

  // Modo conectado: carrega da planilha.
  useEffect(() => {
    if (isDemoMode) return;
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const dados = (await fetchAll()) as Partial<FinanceState>;
        if (cancelado) return;
        setState((prev) => ({ ...prev, ...dados }));
      } catch (err) {
        console.error("Erro ao carregar da planilha, mantendo dados em branco:", err);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const addMovimentacao = useCallback((input: NovaMovimentacaoInput) => {
    const total = Math.max(1, input.totalParcelas ?? 1);
    const grupoId = total > 1 ? newId("parc") : null;
    const valorParcela = Math.round((input.valor / total) * 100) / 100;
    const status = input.jaPago ? "pago" : "pendente";
    const hoje = todayISO();

    const cartao = input.cartaoId
      ? state.cartoes.find((c) => c.id === input.cartaoId)
      : undefined;

    const primeiroVencimento = cartao
      ? sugerirVencimentoCartao(cartao, input.dataCompra)
      : input.dataCompra;

    const novas: Movimentacao[] = Array.from({ length: total }, (_, i) => {
      const numero = i + 1;
      const vencimento =
        i === 0 ? primeiroVencimento : addMonthsToISO(primeiroVencimento, i);
      return {
        id: newId("mov"),
        contaId: input.contaId || null,
        cartaoId: input.cartaoId || null,
        categoriaId: input.categoriaId,
        descricao: total > 1 ? `${input.descricao} (${numero}/${total})` : input.descricao,
        tipo: input.tipo,
        valor: numero === total ? input.valor - valorParcela * (total - 1) : valorParcela,
        formaPagamento: input.formaPagamento,
        dataCompra: input.dataCompra,
        dataVencimento: vencimento,
        dataPagamento: numero === 1 && input.jaPago ? hoje : null,
        status: numero === 1 ? status : "agendado",
        parcelaGrupoId: grupoId,
        numeroParcela: total > 1 ? numero : null,
        totalParcelas: total > 1 ? total : null,
      };
    });

    setState((prev) => ({ ...prev, movimentacoes: [...prev.movimentacoes, ...novas] }));

    if (!isDemoMode) {
      postAction("addMovimentacao", {
        itens: novas.map((m) => ({
          id: m.id,
          conta_id: m.contaId || "",
          cartao_id: m.cartaoId || "",
          categoria_id: m.categoriaId,
          descricao: m.descricao,
          tipo: m.tipo,
          valor: m.valor,
          forma_pagamento: m.formaPagamento,
          data_compra: m.dataCompra,
          data_vencimento: m.dataVencimento,
          data_pagamento: m.dataPagamento || "",
          status: m.status,
          parcela_grupo_id: m.parcelaGrupoId || "",
          numero_parcela: m.numeroParcela || "",
          total_parcelas: m.totalParcelas || "",
        })),
      }).catch((err) => console.error("Erro ao salvar movimentação na planilha:", err));
    }
  }, [state.cartoes]);

  const marcarPago = useCallback((id: string, dataPagamento?: string) => {
    const data = dataPagamento || todayISO();
    setState((prev) => ({
      ...prev,
      movimentacoes: prev.movimentacoes.map((m) =>
        m.id === id ? { ...m, status: "pago", dataPagamento: data } : m
      ),
    }));
    if (!isDemoMode) {
      postAction("updateMovimentacao", { id, status: "pago", data_pagamento: data }).catch((err) =>
        console.error("Erro ao marcar como pago na planilha:", err)
      );
    }
  }, []);

  const excluirMovimentacao = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      movimentacoes: prev.movimentacoes.filter((m) => m.id !== id),
    }));
    if (!isDemoMode) {
      postAction("deleteMovimentacao", { id }).catch((err) =>
        console.error("Erro ao excluir movimentação na planilha:", err)
      );
    }
  }, []);

  const addCartao = useCallback((dados: Omit<Cartao, "id">) => {
    const cartao: Cartao = { id: newId("cartao"), ...dados };
    setState((prev) => ({ ...prev, cartoes: [...prev.cartoes, cartao] }));
    if (!isDemoMode) {
      postAction("addCartao", {
        id: cartao.id,
        nome: cartao.nome,
        limite: cartao.limite,
        dia_fechamento: cartao.diaFechamento,
        dia_vencimento: cartao.diaVencimento,
        cor: cartao.cor || "",
      }).catch((err) => console.error("Erro ao salvar cartão na planilha:", err));
    }
  }, []);

  const addConta = useCallback((dados: Omit<Conta, "id">) => {
    const conta: Conta = { id: newId("conta"), ...dados };
    setState((prev) => ({ ...prev, contas: [...prev.contas, conta] }));
    if (!isDemoMode) {
      postAction("addConta", {
        id: conta.id,
        nome: conta.nome,
        tipo: conta.tipo,
        saldo_inicial: conta.saldoInicial,
      }).catch((err) => console.error("Erro ao salvar conta na planilha:", err));
    }
  }, []);

  const addRecorrencia = useCallback((dados: Omit<Recorrencia, "id">) => {
    const recorrencia: Recorrencia = { id: newId("rec"), ...dados };
    setState((prev) => ({ ...prev, recorrencias: [...prev.recorrencias, recorrencia] }));
    if (!isDemoMode) {
      postAction("addRecorrencia", {
        id: recorrencia.id,
        descricao: recorrencia.descricao,
        valor: recorrencia.valor,
        categoria_id: recorrencia.categoriaId,
        dia_vencimento: recorrencia.diaVencimento,
        frequencia: recorrencia.frequencia,
        ativo: recorrencia.ativo,
      }).catch((err) => console.error("Erro ao salvar recorrência na planilha:", err));
    }
  }, []);

  const toggleRecorrencia = useCallback((id: string, ativo: boolean) => {
    setState((prev) => ({
      ...prev,
      recorrencias: prev.recorrencias.map((r) => (r.id === id ? { ...r, ativo } : r)),
    }));
    if (!isDemoMode) {
      postAction("updateRecorrencia", { id, ativo }).catch((err) =>
        console.error("Erro ao atualizar recorrência na planilha:", err)
      );
    }
  }, []);

  const excluirRecorrencia = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      recorrencias: prev.recorrencias.filter((r) => r.id !== id),
    }));
    if (!isDemoMode) {
      postAction("deleteRecorrencia", { id }).catch((err) =>
        console.error("Erro ao excluir recorrência na planilha:", err)
      );
    }
  }, []);

  const setOrcamento = useCallback(
    (dados: { categoriaId: string; mes: number; ano: number; limite: number }) => {
      setState((prev) => {
        const existente = prev.orcamentos.find(
          (o) => o.categoriaId === dados.categoriaId && o.mes === dados.mes && o.ano === dados.ano
        );
        const orcamento: Orcamento = existente
          ? { ...existente, limite: dados.limite }
          : { id: newId("orc"), ...dados };
        const orcamentos = existente
          ? prev.orcamentos.map((o) => (o.id === orcamento.id ? orcamento : o))
          : [...prev.orcamentos, orcamento];
        return { ...prev, orcamentos };
      });
      if (!isDemoMode) {
        postAction("setOrcamento", {
          categoria_id: dados.categoriaId,
          mes: dados.mes,
          ano: dados.ano,
          limite: dados.limite,
        }).catch((err) => console.error("Erro ao salvar orçamento na planilha:", err));
      }
    },
    []
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      ...state,
      loading,
      demoMode: isDemoMode,
      addMovimentacao,
      marcarPago,
      excluirMovimentacao,
      addCartao,
      addConta,
      addRecorrencia,
      toggleRecorrencia,
      excluirRecorrencia,
      setOrcamento,
    }),
    [
      state,
      loading,
      addMovimentacao,
      marcarPago,
      excluirMovimentacao,
      addCartao,
      addConta,
      addRecorrencia,
      toggleRecorrencia,
      excluirRecorrencia,
      setOrcamento,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance precisa estar dentro de <FinanceProvider>");
  return ctx;
}

export const CATEGORIA_SUGESTOES: Array<{ palavras: string[]; categoriaId: string; formaPagamento: FormaPagamento }> = [
  { palavras: ["uber", "99", "taxi", "ônibus", "onibus", "metro", "gasolina"], categoriaId: "cat-transporte", formaPagamento: "credito" },
  { palavras: ["ifood", "rappi", "delivery"], categoriaId: "cat-delivery", formaPagamento: "credito" },
  { palavras: ["mercado", "supermercado", "feira", "hortifruti"], categoriaId: "cat-alimentacao", formaPagamento: "debito" },
  { palavras: ["aluguel", "condomínio", "condominio", "luz", "água", "agua", "internet"], categoriaId: "cat-moradia", formaPagamento: "pix" },
  { palavras: ["netflix", "spotify", "amazon prime", "hbo", "disney"], categoriaId: "cat-assinaturas", formaPagamento: "credito" },
  { palavras: ["farmácia", "farmacia", "academia", "médico", "medico", "consulta"], categoriaId: "cat-saude", formaPagamento: "debito" },
  { palavras: ["cinema", "bar", "show", "viagem", "balada"], categoriaId: "cat-lazer", formaPagamento: "credito" },
  { palavras: ["faculdade", "mensalidade", "curso"], categoriaId: "cat-faculdade", formaPagamento: "pix" },
  { palavras: ["salário", "salario", "pagamento"], categoriaId: "cat-salario", formaPagamento: "transferencia" },
  { palavras: ["freela", "freelance", "bico"], categoriaId: "cat-freela", formaPagamento: "pix" },
];

/** A "camada inteligente" descrita no desenho do produto: sugere categoria
 * e forma de pagamento a partir do texto digitado na descrição. */
export function sugerirCategoria(descricao: string) {
  const texto = descricao.toLowerCase();
  for (const regra of CATEGORIA_SUGESTOES) {
    if (regra.palavras.some((p) => texto.includes(p))) {
      return { categoriaId: regra.categoriaId, formaPagamento: regra.formaPagamento };
    }
  }
  return null;
}
