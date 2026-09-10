// Cliente que fala com o Apps Script Web App publicado a partir de
// financeiro-appsscript/Code.gs. Enquanto a variável de ambiente não é
// configurada, isDemoMode fica true e as telas usam src/lib/demo-data.ts.
//
// Mesmo padrão usado no Mamma Formula (src/lib/sheetsClient.js lá) — dois
// sistemas, mesma receita de backend, pra não reinventar a cada projeto.

const API_URL = process.env.NEXT_PUBLIC_SHEETS_API_URL;

export const isDemoMode = !API_URL;

export async function fetchAll(): Promise<Record<string, unknown>> {
  const res = await fetch(API_URL as string, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar dados da planilha: " + res.status);
  return res.json();
}

// Content-Type "text/plain" de propósito: evita o preflight CORS (OPTIONS)
// que o Apps Script não trata. O Code.gs lê o corpo bruto com JSON.parse
// independente do content-type declarado.
export async function postAction(
  action: string,
  payload: unknown
): Promise<any> {
  const res = await fetch(API_URL as string, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error("Falha ao enviar dados para a planilha: " + res.status);
  const data = await res.json();
  if (data && data.erro) throw new Error(data.erro);
  return data;
}
