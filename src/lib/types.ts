// Tipos centrais do Financeiro da Tita.
//
// Decisão de arquitetura: toda movimentação nasce de UMA fonte de verdade
// (a tabela `movimentacoes`). Um gasto parcelado gera várias `parcelas`
// ligadas a essa movimentação — nunca tabelas paralelas brigando entre si.
//
// Datas são sempre separadas: `dataCompra` (quando o gasto aconteceu),
// `dataVencimento` (quando precisa ser pago) e `dataPagamento` (quando foi
// efetivamente pago, se já foi). Nunca colapsar isso em um campo "data".

export type TipoConta = "corrente" | "poupanca" | "carteira" | "investimento";

export type TipoMovimentacao = "receita" | "despesa" | "transferencia";

export type FormaPagamento =
  | "dinheiro"
  | "debito"
  | "credito"
  | "pix"
  | "transferencia";

export type StatusMovimentacao = "pago" | "pendente" | "agendado";

export type Frequencia = "mensal" | "semanal" | "anual";

export interface Usuario {
  id: string;
  nome: string;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldoInicial: number;
}

export interface Cartao {
  id: string;
  nome: string;
  limite: number;
  diaFechamento: number; // 1-28
  diaVencimento: number; // 1-28
  cor?: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoMovimentacao;
  icone?: string;
  cor?: string;
}

export interface Movimentacao {
  id: string;
  contaId?: string | null;
  cartaoId?: string | null;
  categoriaId: string;
  descricao: string;
  tipo: TipoMovimentacao;
  valor: number;
  formaPagamento: FormaPagamento;
  dataCompra: string; // ISO date
  dataVencimento: string; // ISO date
  dataPagamento?: string | null; // ISO date
  status: StatusMovimentacao;
  // Uma compra parcelada vira N linhas de movimentação que compartilham o
  // mesmo parcelaGrupoId — cada parcela é uma linha própria, com sua própria
  // dataVencimento e status, exatamente como ela existe na fatura de verdade.
  parcelaGrupoId?: string | null;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
}

export interface Recorrencia {
  id: string;
  descricao: string;
  valor: number;
  categoriaId: string;
  diaVencimento: number;
  frequencia: Frequencia;
  ativo: boolean;
}

export interface Orcamento {
  id: string;
  categoriaId: string;
  mes: number; // 1-12
  ano: number;
  limite: number;
}

export interface Meta {
  id: string;
  nome: string;
  valorMeta: number;
  valorAtual: number;
  dataLimite?: string | null;
}

export interface FinanceState {
  usuario: Usuario;
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  movimentacoes: Movimentacao[];
  recorrencias: Recorrencia[];
  orcamentos: Orcamento[];
  metas: Meta[];
}
