import type { Metadata } from "next";
import "./globals.css";
import { FinanceProvider } from "@/lib/store";
import Sidebar from "@/components/Sidebar";
import DemoBanner from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "Financeiro da Tita",
  description: "Painel financeiro pessoal — Tita Finance OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <FinanceProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <DemoBanner />
              <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
                <div className="mx-auto w-full max-w-6xl">{children}</div>
              </main>
            </div>
          </div>
        </FinanceProvider>
      </body>
    </html>
  );
}
