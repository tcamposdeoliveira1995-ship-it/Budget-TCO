# Financeiro da Tita

Mini sistema financeiro pessoal — não só um dashboard bonitinho. Dashboard,
movimentações (o coração do sistema — tudo nasce ali), cartões, contas
fixas/parcelas e orçamento por categoria.

## Stack

- **Next.js** (App Router) + React + TypeScript
- **Tailwind CSS**
- **Google Sheets + Apps Script** como banco de dados e API
- **Recharts** para os gráficos, **lucide-react** para ícones

Mesmo padrão técnico do Mamma Formula (outro sistema da família Mamma Mia):
zero infraestrutura própria, a planilha é o banco de dados.

## Arquitetura

Tudo nasce em **Movimentações**: comprou um lanche, recebeu salário, pagou
faculdade — é tudo uma movimentação. Uma compra parcelada gera várias linhas
de movimentação (uma por parcela, todas com o mesmo `parcelaGrupoId`), em vez
de uma tabela de parcelas separada brigando com a de movimentações.

Datas são sempre três, nunca uma só: `dataCompra` (quando aconteceu),
`dataVencimento` (quando precisa ser pago — a fatura em que a compra cai) e
`dataPagamento` (quando foi pago de verdade, se já foi). Ver
`src/lib/calc.ts` para o raciocínio completo, incluindo o cálculo de
**"Posso gastar quanto?"**: saldo em conta menos contas a pagar, menos
fatura em aberto, menos reserva de metas.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

### Modo demonstração vs. conectado à planilha

Sem configurar a variável de ambiente, o sistema roda em **modo
demonstração**: usa os dados de exemplo em `src/lib/demo-data.ts` (um mês
inteiro de movimentações da Tita, com fatura em aberto, parcelamento de
notebook e um orçamento estourado só pra mostrar o alerta funcionando) e
persiste as edições em `localStorage` — tudo funciona no navegador, mas
nada é salvo de verdade.

Para conectar na planilha real (`Budget_TCO`):

1. Abra a planilha **Budget_TCO**
   (https://docs.google.com/spreadsheets/d/1kvUA7Z8oLHTr3ywTlYdFIohL0aib6IpNQEFAx4Y6R4w/edit).
2. Menu **Extensões > Apps Script**.
3. Apague o conteúdo padrão e cole o conteúdo de
   `financeiro-appsscript/Code.gs`.
4. Rode a função `setup` uma vez (▶ Executar, escolha `setup`) — cria as
   abas (Usuarios, Contas, Cartoes, Categorias, Movimentacoes,
   Recorrencias, Orcamentos, Metas) e semeia a lista padrão de categorias.
   Autorize o acesso quando o Google pedir.
5. Implante como **App da Web** (Implantar > Nova implantação):
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Copie a URL gerada (termina em `/exec`) e cole em `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   ```
   NEXT_PUBLIC_SHEETS_API_URL=https://script.google.com/macros/s/SEU_ID/exec
   ```

7. Reinicie `npm run dev`. A tela some o aviso de "modo demonstração" e
   passa a ler/escrever direto na planilha.

Depois de conectado, cadastre suas contas e cartões de verdade pela própria
tela de **Cartões** (contas ainda não têm tela própria no MVP — dá pra
adicionar direto na aba **Contas** da planilha por enquanto; entra no
Financeiro da Tita v2, junto com Metas e Configurações).

## Roteiro (o que veio primeiro, e o que vem depois)

**MVP (esta versão):** Dashboard, Movimentações, Cartões, Contas e
Parcelas, Orçamento.

**Depois:** Metas, Planejamento mensal completo, projeções, calendário
visual e a camada inteligente completa (sugestões de categoria hoje são
por palavra-chave em `src/lib/store.ts::sugerirCategoria` — dá pra evoluir
pra algo mais esperto sem mudar a arquitetura).

## Estrutura

```
src/
  app/                 páginas (App Router)
  components/          UI reutilizável
  lib/
    types.ts           os tipos centrais (Movimentacao, Conta, Cartao...)
    calc.ts            toda a matemática do painel, sem UI misturada
    store.tsx           estado global (Context) + modo demo/planilha
    sheetsClient.ts     fala com o Apps Script
    demo-data.ts        dados de exemplo do modo demonstração
    format.ts           formatação de moeda/data
financeiro-appsscript/
  Code.gs               backend (cole em Extensões > Apps Script)
```
