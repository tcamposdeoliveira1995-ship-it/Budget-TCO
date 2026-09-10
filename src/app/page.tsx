"use client";

import { Wallet, TrendingDown, PiggyBank, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinance } from "@/lib/store";
import {
  currentMonthYear,
  evolucaoMensal,
  gastosPorCategoria,
  gerarAlertas,
  quantoPossoGastar,
  saldoAtual,
  totalGastosMes,
  contasAPagar,
  proximosVencimentos,
} from "@/lib/calc";
import StatCard from "@/components/StatCard";
import SectionCard from "@/components/SectionCard";
import EmptyState from "@/components/EmptyState";
import { classNames, formatBRL, formatDateShortBR } from "@/lib/format";

const CORES_CATEGORIA = ["#F49AC2", "#FFC98B", "#FCE28C", "#8FE0B0", "#8FCDF2", "#C6A8F0"];

export default function DashboardPage() {
  const state = useFinance();
  const { mes, ano } = currentMonthYear();

  const saldo = saldoAtual(state);
  const gastos = totalGastosMes(state, mes, ano);
  const { total: aPagar } = contasAPagar(state);
  const { disponivel, faturasAbertas, reservaMetas, contasNaoPagas } = quantoPossoGastar(state);
  const categorias = gastosPorCategoria(state, mes, ano).slice(0, 6);
  const evolucao = evolucaoMensal(state, 6);
  const vencimentos = proximosVencimentos(state, 30).slice(0, 6);
  const alertas = gerarAlertas(state);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-ink">Olá, {state.usuario.nome} 👋</h1>
        <p className="text-sm text-muted">Isso é tudo o que está acontecendo com seu dinheiro agora.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Saldo atual" value={saldo} icon={Wallet} tone="neutral" />
        <StatCard label="Gastos do mês" value={gastos} icon={TrendingDown} tone="bad" />
        <StatCard label="A pagar" value={aPagar} icon={AlertTriangle} tone="warn" />
        <StatCard
          label="Disponível"
          value={disponivel}
          icon={PiggyBank}
          tone={disponivel >= 0 ? "good" : "bad"}
        />
      </div>

      <SectionCard title="💸 Posso gastar quanto?">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <Linha label="Saldo atual" valor={saldo} />
          <Linha label="Contas a pagar" valor={-contasNaoPagas} />
          <Linha label="Faturas em aberto" valor={-faturasAbertas} />
          <Linha label="Reserva de metas" valor={-reservaMetas} />
          <div className="rounded-xl bg-brand-50 px-3 py-2">
            <p className="text-xs font-medium text-brand-700">Disponível de verdade</p>
            <p className={classNames("text-lg font-semibold", disponivel >= 0 ? "text-brand-700" : "text-bad")}>
              {formatBRL(disponivel)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">
          Saldo em conta não é dinheiro livre — parte já tem dono (contas a pagar, fatura em aberto, reserva de metas).
        </p>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Gastos por categoria (mês atual)">
          {categorias.length === 0 ? (
            <EmptyState text="Sem despesas lançadas neste mês ainda." />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorias}
                      dataKey="valor"
                      nameKey="categoria.nome"
                      innerRadius={44}
                      outerRadius={72}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {categorias.map((c, i) => (
                        <Cell key={c.categoria.id} fill={c.categoria.cor || CORES_CATEGORIA[i % CORES_CATEGORIA.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2 text-sm">
                {categorias.map((c, i) => (
                  <li key={c.categoria.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: c.categoria.cor || CORES_CATEGORIA[i % CORES_CATEGORIA.length] }}
                      />
                      {c.categoria.nome}
                    </span>
                    <span className="font-medium text-ink">{formatBRL(c.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Evolução mensal — receitas x despesas">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucao} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE0FA" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={0} tick={false} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="receitas" fill="#8FE0B0" radius={[4, 4, 0, 0]} name="Receitas" isAnimationActive={false} />
                <Bar dataKey="despesas" fill="#F49AC2" radius={[4, 4, 0, 0]} name="Despesas" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Próximos vencimentos">
          {vencimentos.length === 0 ? (
            <EmptyState text="Nada vencendo nos próximos 30 dias. 🎉" />
          ) : (
            <ul className="divide-y divide-border">
              {vencimentos.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink">{v.descricao}</p>
                    <p className="text-xs text-muted">
                      {v.origem === "cartao" ? "Cartão" : "Conta"} · vence {formatDateShortBR(v.vencimento)}
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

        <SectionCard title="Alertas">
          {alertas.length === 0 ? (
            <EmptyState text="Sem alertas por enquanto." />
          ) : (
            <ul className="space-y-2.5">
              {alertas.map((a, i) => {
                const Icon = a.tipo === "aviso" ? AlertTriangle : a.tipo === "sucesso" ? CheckCircle2 : Info;
                const cor =
                  a.tipo === "aviso" ? "text-warn" : a.tipo === "sucesso" ? "text-good" : "text-brand-600";
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Icon size={16} className={classNames("mt-0.5 shrink-0", cor)} />
                    <span className="text-ink">{a.texto}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className={classNames("font-medium", valor < 0 ? "text-bad" : "text-ink")}>{formatBRL(valor)}</p>
    </div>
  );
}
