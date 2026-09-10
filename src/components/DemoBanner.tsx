"use client";

import { Info } from "lucide-react";
import { useFinance } from "@/lib/store";

export default function DemoBanner() {
  const { demoMode } = useFinance();
  if (!demoMode) return null;

  return (
    <div className="flex items-center gap-2 bg-brand-50 px-4 py-2 text-xs text-brand-700 sm:px-6 lg:px-10">
      <Info size={14} className="shrink-0" />
      <span>
        Modo demonstração — dados de exemplo, nada salvo em servidor. Conecte a planilha em{" "}
        <code className="rounded bg-white/60 px-1 py-0.5">NEXT_PUBLIC_SHEETS_API_URL</code> pra usar de verdade.
      </span>
    </div>
  );
}
