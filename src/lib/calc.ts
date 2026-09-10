// Toda a matemática do painel mora aqui, separada da UI, para poder ser
// testada e para as telas nunca "inventarem" um cálculo divergente.
//
// Princípio-chave: `movimentacoes.dataVencimento` já carrega a fatura/mês a
// que aquele lançamento pertence (decidido no momento do lançamento — ver
// `sugerirVencimentoCartao`). Isso evita ter que recalcular ciclos de fatura
// toda vez que agregamos números para o dashboard.

import type {
  Cartao,
  Categoria,
  Conta,
  FinanceState,
  Movimentacao,
  Orcamento,
} from "./types";
import { addDaysISO, isoFromParts, monthLabel, todayISO } from "./format";

function parts(iso: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return { ano, mes, dia };
}

function nextMonthOf(ano: number, mes: number): { ano: number; mes: number } {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

export function currentMonthYear(): { mes: number; ano: number } {
  const { mes, ano } = parts(todayISO());
  return { mes, ano };
}

export function inMonth(iso: string, mes: number, ano: number): boolean {
  const p = parts(iso);
  return p.mes === mes && p.ano === ano;
}

/**
 * Dado um cartão e a data de uma compra nova, decide em qual fatura
 * (dataVencimento) ela cai. É a "camada inteligente" mencionada no desenho
 * do produto: o usuário só escolhe a data da compra, o sistema resolve o
 * vencimento.
 */
export function sugerirVencimentoCartao(
  cartao: Cartao,
  dataCompraISO: string
): string {
  const { ano, mes, dia } = parts(dataCompraISO);
  const fechaNesteMes = dia <= cartao.diaFechamento;
  const fechamento = fechaNesteMes ? { ano, mes } : nextMonthOf(ano, mes);
  const vencimentoRolaProximoMes =
    cartao.diaVencimento <= cartao.diaFechamento;
  const venc = vencimentoRolaProximoMes
    ? nextMonthOf(fechamento.ano, fechamento.mes)
    : fechamento;
  return isoFromParts(venc.ano, venc.mes, cartao.diaVencimento);
}

/** Saldo de UMA conta: saldo inicial + tudo que já foi pago nela. */
export function saldoPorConta(conta: Conta, movimentacoes: Movimentacao[]): number {
  const movimentado = movimentacoes.reduce((s, m) => {
    if (m.contaId !== conta.id || m.status !== "pago") return s;
    if (m.tipo === "receita") return s + m.valor;
    if (m.tipo === "despesa") return s - m.valor;
    return s;
  }, 0);
  return conta.saldoInicial + movimentado;
}

/** Saldo consolidado das contas: saldo inicial + tudo que já foi pago via conta. */
export function saldoAtual(state: FinanceState): number {
  return state.contas.reduce((s, c) => s + saldoPorConta(c, state.movimentacoes), 0);
}

export function totalEntradasMes(
  state: FinanceState,
  mes: number,
  ano: number
): number {
  return state.movimentacoes
    .filter((m) => m.tipo === "receita" && inMonth(m.dataCompra, mes, ano))
    .reduce((s, m) => s + m.valor, 0);
}

export function totalGastosMes(
  state: FinanceState,
  mes: number,
  ano: number
): number {
  return state.movimentacoes
    .filter((m) => m.tipo === "despesa" && inMonth(m.dataCompra, mes, ano))
    .reduce((s, m) => s + m.valor, 0);
}

export interface ItemPendente {
  movimentacao: Movimentacao;
  atrasado: boolean;
}

/** Contas fixas/avulsas pendentes que saem de uma conta (não de cartão). */
export function contasAPagar(state: FinanceState): {
  total: number;
  itens: ItemPendente[];
} {
  const hoje = todayISO();
  const itens = state.movimentacoes
    .filter(
      (m) => m.tipo === "despesa" && m.contaId && m.status !== "pago"
    )
    .map((m) => ({ movimentacao: m, atrasado: m.dataVencimento < hoje }))
    .sort((a, b) =>
      a.movimentacao.dataVencimento.localeCompare(b.movimentacao.dataVencimento)
    );
  const total = itens.reduce((s, i) => s + i.movimentacao.valor, 0);
  return { total, itens };
}

interface FaturaAgrupada {
  vencimento: string;
  valor: number;
  paga: boolean;
}

function faturasDoCartao(
  cartao: Cartao,
  movimentacoes: Movimentacao[]
): FaturaAgrupada[] {
  const grupos = new Map<string, { valor: number; paga: boolean }>();
  for (const m of movimentacoes) {
    if (m.cartaoId !== cartao.id || m.tipo !== "despesa") continue;
    const atual = grupos.get(m.dataVencimento) ?? { valor: 0, paga: true };
    atual.valor += m.valor;
    if (m.status !== "pago") atual.paga = false;
    grupos.set(m.dataVencimento, atual);
  }
  return [...grupos.entries()]
    .map(([vencimento, v]) => ({ vencimento, ...v }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

function faturasNaoPagas(
  cartao: Cartao,
  movimentacoes: Movimentacao[]
): FaturaAgrupada[] {
  return faturasDoCartao(cartao, movimentacoes).filter((f) => !f.paga);
}

/** A próxima fatura em aberto (ainda não paga) de um cartão — a mais próxima de vencer. */
export function faturaAtualCartao(
  cartao: Cartao,
  movimentacoes: Movimentacao[]
): FaturaAgrupada | null {
  return faturasNaoPagas(cartao, movimentacoes)[0] ?? null;
}

/** As faturas em aberto seguintes à atual (a atual já aparece em `faturaAtualCartao`). */
export function proximasFaturasCartao(
  cartao: Cartao,
  movimentacoes: Movimentacao[],
  n = 3
): FaturaAgrupada[] {
  return faturasNaoPagas(cartao, movimentacoes).slice(1, 1 + n);
}

/** Limite disponível = limite total - tudo que está em faturas ainda não pagas. */
export function limiteDisponivelCartao(
  cartao: Cartao,
  movimentacoes: Movimentacao[]
): number {
  const usado = movimentacoes
    .filter(
      (m) =>
        m.cartaoId === cartao.id && m.tipo === "despesa" && m.status !== "pago"
    )
    .reduce((s, m) => s + m.valor, 0);
  return cartao.limite - usado;
}

/** Soma da próxima fatura em aberto de cada cartão — usado no cockpit e no "posso gastar quanto". */
export function totalFaturasAbertas(state: FinanceState): number {
  return state.cartoes.reduce((s, c) => {
    const f = faturaAtualCartao(c, state.movimentacoes);
    return s + (f?.valor ?? 0);
  }, 0);
}

export function totalReservaMetas(state: FinanceState): number {
  return state.metas.reduce((s, m) => s + m.valorAtual, 0);
}

/**
 * "Posso gastar quanto?" — a métrica mais importante do painel.
 * Saldo em conta não é dinheiro livre: parte já tem dono (contas a pagar,
 * fatura em aberto, reserva de metas).
 */
export function quantoPossoGastar(state: FinanceState): {
  saldo: number;
  contasNaoPagas: number;
  faturasAbertas: number;
  reservaMetas: number;
  disponivel: number;
} {
  const saldo = saldoAtual(state);
  const contasNaoPagas = contasAPagar(state).total;
  const faturasAbertas = totalFaturasAbertas(state);
  const reservaMetas = totalReservaMetas(state);
  const disponivel = saldo - contasNaoPagas - faturasAbertas - reservaMetas;
  return { saldo, contasNaoPagas, faturasAbertas, reservaMetas, disponivel };
}

export interface GastoCategoria {
  categoria: Categoria;
  valor: number;
}

export function gastosPorCategoria(
  state: FinanceState,
  mes: number,
  ano: number
): GastoCategoria[] {
  const porId = new Map<string, number>();
  for (const m of state.movimentacoes) {
    if (m.tipo !== "despesa" || !inMonth(m.dataCompra, mes, ano)) continue;
    porId.set(m.categoriaId, (porId.get(m.categoriaId) ?? 0) + m.valor);
  }
  return [...porId.entries()]
    .map(([categoriaId, valor]) => ({
      categoria: state.categorias.find((c) => c.id === categoriaId)!,
      valor,
    }))
    .filter((g) => g.categoria)
    .sort((a, b) => b.valor - a.valor);
}

export interface MesEvolucao {
  mes: number;
  ano: number;
  label: string;
  receitas: number;
  despesas: number;
}

export function evolucaoMensal(state: FinanceState, meses = 6): MesEvolucao[] {
  const hoje = parts(todayISO());
  const out: MesEvolucao[] = [];
  let { ano, mes } = hoje;
  const seq: Array<{ mes: number; ano: number }> = [];
  for (let i = 0; i < meses; i++) {
    seq.unshift({ mes, ano });
    mes -= 1;
    if (mes === 0) {
      mes = 12;
      ano -= 1;
    }
  }
  for (const p of seq) {
    out.push({
      mes: p.mes,
      ano: p.ano,
      label: monthLabel(p.mes).slice(0, 3),
      receitas: totalEntradasMes(state, p.mes, p.ano),
      despesas: totalGastosMes(state, p.mes, p.ano),
    });
  }
  return out;
}

export interface Vencimento {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  origem: "conta" | "cartao";
  atrasado: boolean;
}

export function proximosVencimentos(
  state: FinanceState,
  diasJanela = 45
): Vencimento[] {
  const hoje = todayISO();
  const limite = addDaysISO(hoje, diasJanela);
  return state.movimentacoes
    .filter(
      (m) =>
        m.tipo === "despesa" &&
        m.status !== "pago" &&
        m.dataVencimento <= limite
    )
    .map((m) => ({
      id: m.id,
      descricao: m.descricao,
      valor: m.valor,
      vencimento: m.dataVencimento,
      origem: m.cartaoId ? ("cartao" as const) : ("conta" as const),
      atrasado: m.dataVencimento < hoje,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export interface ProgressoOrcamento {
  orcamento: Orcamento;
  categoria: Categoria;
  gasto: number;
  pct: number;
}

export function progressoOrcamentos(
  state: FinanceState,
  mes: number,
  ano: number
): ProgressoOrcamento[] {
  const gastos = new Map(
    gastosPorCategoria(state, mes, ano).map((g) => [g.categoria.id, g.valor])
  );
  return state.orcamentos
    .filter((o) => o.mes === mes && o.ano === ano)
    .map((orcamento) => {
      const categoria = state.categorias.find(
        (c) => c.id === orcamento.categoriaId
      )!;
      const gasto = gastos.get(orcamento.categoriaId) ?? 0;
      const pct = orcamento.limite > 0 ? gasto / orcamento.limite : 0;
      return { orcamento, categoria, gasto, pct };
    })
    .filter((p) => p.categoria)
    .sort((a, b) => b.pct - a.pct);
}

export type Alerta = {
  tipo: "aviso" | "sucesso" | "info";
  texto: string;
};

/** Gera os alertas simples descritos no desenho do produto. Regras diretas, sem mágica. */
export function gerarAlertas(state: FinanceState): Alerta[] {
  const { mes, ano } = currentMonthYear();
  const alertas: Alerta[] = [];

  for (const p of progressoOrcamentos(state, mes, ano)) {
    if (p.pct >= 1) {
      alertas.push({
        tipo: "aviso",
        texto: `${p.categoria.nome} estourou o orçamento (${Math.round(p.pct * 100)}%).`,
      });
    } else if (p.pct >= 0.8) {
      alertas.push({
        tipo: "aviso",
        texto: `${p.categoria.nome} já consumiu ${Math.round(p.pct * 100)}% do orçamento.`,
      });
    }
  }

  const evolucao = evolucaoMensal(state, 2);
  if (evolucao.length === 2) {
    const [anterior, atual] = evolucao;
    const diffFaturas = atual.despesas - anterior.despesas;
    if (diffFaturas > 0) {
      alertas.push({
        tipo: "aviso",
        texto: `Seus gastos este mês já estão ${diffFaturas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} maiores que no mês passado.`,
      });
    } else if (diffFaturas < 0) {
      alertas.push({
        tipo: "sucesso",
        texto: `Você gastou ${Math.abs(diffFaturas).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} a menos que no mês passado.`,
      });
    }
  }

  const { disponivel } = quantoPossoGastar(state);
  alertas.push({
    tipo: "info",
    texto: `Mantendo o ritmo atual, você tem ${disponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} livres agora.`,
  });

  return alertas;
}
