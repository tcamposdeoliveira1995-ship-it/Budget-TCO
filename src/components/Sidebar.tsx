"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  CalendarClock,
  Target,
} from "lucide-react";
import { classNames } from "@/lib/format";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/contas-fixas", label: "Contas e Parcelas", icon: CalendarClock },
  { href: "/orcamento", label: "Orçamento", icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: coluna fixa à esquerda */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl2 text-base"
            style={{ background: "linear-gradient(135deg, #F49AC2, #C6A8F0 55%, #8FCDF2)" }}
          >
            🦄
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Financeiro da Tita</p>
            <p className="text-xs text-muted">Tita Finance OS</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-muted hover:bg-canvas hover:text-ink"
                )}
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-5 py-4 text-xs text-muted">
          Feito pra saber, de verdade, quanto dá pra gastar. 💸✨
        </div>
      </aside>

      {/* Mobile: barra de navegação horizontal no topo */}
      <nav className="fixed inset-x-0 top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2 md:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                active ? "bg-brand-500 text-white" : "text-muted"
              )}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="h-12 md:hidden" />
    </>
  );
}
