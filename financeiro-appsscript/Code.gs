/**
 * FINANCEIRO DA TITA — Backend em Google Sheets + Apps Script
 * ---------------------------------------------------------
 * Este script é VINCULADO à planilha "Budget_TCO" (não cria uma nova nem
 * procura por nome — usa SpreadsheetApp.getActiveSpreadsheet(), ou seja,
 * qualquer planilha em que ele estiver colado).
 *
 * Como instalar:
 * 1) Abra a planilha Budget_TCO no navegador.
 * 2) Menu Extensões > Apps Script.
 * 3) Apague o conteúdo padrão de Code.gs e cole este arquivo inteiro.
 * 4) Rode a função `setup` uma vez (▶ Executar, escolha "setup" no menu
 *    suspenso). Na primeira vez o Google vai pedir autorização — aceite.
 *    Isso cria todas as abas (Usuarios, Contas, Cartoes, Categorias,
 *    Movimentacoes, Recorrencias, Orcamentos, Metas) com cabeçalho e
 *    semeia a lista de categorias padrão. É seguro rodar de novo depois
 *    (não apaga dados que já existem).
 * 5) Implante como Web App: Implantar > Nova implantação > tipo "App da
 *    Web". Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 6) Copie a URL gerada (termina em /exec) e cole em
 *    NEXT_PUBLIC_SHEETS_API_URL no .env.local do Next.js (ou nas variáveis
 *    de ambiente do Vercel).
 *
 * Sempre que este arquivo for atualizado com abas/colunas novas, rode
 * `setup` de novo antes de usar — senão as ações que dependem das colunas
 * novas falham.
 */

const ABAS = {
  Usuarios: ["id", "nome"],
  Contas: ["id", "nome", "tipo", "saldo_inicial"],
  Cartoes: ["id", "nome", "limite", "dia_fechamento", "dia_vencimento", "cor"],
  Categorias: ["id", "nome", "tipo", "cor"],
  Movimentacoes: [
    "id", "conta_id", "cartao_id", "categoria_id", "descricao", "tipo", "valor",
    "forma_pagamento", "data_compra", "data_vencimento", "data_pagamento", "status",
    "parcela_grupo_id", "numero_parcela", "total_parcelas",
  ],
  Recorrencias: ["id", "descricao", "valor", "categoria_id", "dia_vencimento", "frequencia", "ativo", "tipo"],
  Orcamentos: ["id", "categoria_id", "mes", "ano", "limite"],
  Metas: ["id", "nome", "valor_meta", "valor_atual", "data_limite"],
};

// ── SETUP ─────────────────────────────────────────────────────────

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(ABAS).forEach((nomeAba) => {
    let aba = ss.getSheetByName(nomeAba);
    if (!aba) aba = ss.insertSheet(nomeAba);
    const cabecalho = ABAS[nomeAba];
    // Só escreve a linha 1 (cabeçalho) — nunca toca nas linhas de dados.
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
    aba.setFrozenRows(1);
  });

  // Remove a aba padrão "Página1"/"Sheet1" se ainda existir vazia.
  const padrao = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
  if (padrao && ss.getSheets().length > 1) ss.deleteSheet(padrao);

  semear(ss);

  Logger.log("Planilha pronta: " + ss.getUrl());
  return ss.getUrl();
}

function semear(ss) {
  if (linha_(ss, "Usuarios").length <= 1) {
    inserirLinha_(ss, "Usuarios", { id: "user-1", nome: "Tita" });
  }

  if (linha_(ss, "Categorias").length > 1) return; // já tem dados, não duplica

  inserirLinhas_(ss, "Categorias", [
    { id: "cat-salario", nome: "Salário", tipo: "receita" },
    { id: "cat-freela", nome: "Freelance", tipo: "receita" },
    { id: "cat-alimentacao", nome: "Alimentação", tipo: "despesa" },
    { id: "cat-delivery", nome: "Delivery", tipo: "despesa" },
    { id: "cat-transporte", nome: "Transporte", tipo: "despesa" },
    { id: "cat-moradia", nome: "Moradia", tipo: "despesa" },
    { id: "cat-assinaturas", nome: "Assinaturas", tipo: "despesa" },
    { id: "cat-saude", nome: "Saúde", tipo: "despesa" },
    { id: "cat-lazer", nome: "Lazer", tipo: "despesa" },
    { id: "cat-faculdade", nome: "Faculdade", tipo: "despesa" },
    { id: "cat-compras", nome: "Compras", tipo: "despesa" },
    { id: "cat-outros", nome: "Outros", tipo: "despesa" },
  ]);
}

// ── HELPERS DE PLANILHA ──────────────────────────────────────────

function abaObrigatoria_(ss, nome) {
  const aba = ss.getSheetByName(nome);
  if (!aba) {
    throw new Error('Aba "' + nome + '" não existe. Rode a função setup() de novo no editor do Apps Script.');
  }
  return aba;
}

function linha_(ss, nomeAba) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  return aba.getDataRange().getValues();
}

function abaComoObjetos_(ss, nomeAba) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  const valores = aba.getDataRange().getValues();
  if (valores.length === 0) return [];
  const cabecalho = valores[0];
  return valores.slice(1).map((linha) => {
    const obj = {};
    cabecalho.forEach((chave, i) => (obj[chave] = linha[i]));
    return obj;
  });
}

// Lê todas as abas de uma vez (uma leitura por aba, via SpreadsheetApp — a
// planilha aqui é pequena o suficiente pra não precisar de batchGet via API
// avançada como no Mamma Formula).
function lerTodasAsAbas_(ss) {
  const lote = {};
  Object.keys(ABAS).forEach((nome) => {
    lote[nome] = abaComoObjetos_(ss, nome);
  });
  return lote;
}

function inserirLinha_(ss, nomeAba, valoresPorCampo) {
  inserirLinhas_(ss, nomeAba, [valoresPorCampo]);
}

function inserirLinhas_(ss, nomeAba, lista) {
  if (!lista || !lista.length) return;
  const aba = abaObrigatoria_(ss, nomeAba);
  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const linhas = lista.map((valoresPorCampo) =>
    cabecalho.map((campo) => (valoresPorCampo[campo] === undefined ? "" : valoresPorCampo[campo]))
  );
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
}

function proximoId_(prefixo) {
  return prefixo + "-" + Utilities.getUuid().slice(0, 8);
}

function encontrarLinhaPorId_(aba, id) {
  const valores = aba.getDataRange().getValues();
  for (let i = 1; i < valores.length; i++) {
    if (valores[i][0] === id) return i + 1; // +1 porque getRange é 1-based
  }
  return -1;
}

function atualizarCamposPorId_(ss, nomeAba, id, dadosParciais) {
  const aba = abaObrigatoria_(ss, nomeAba);
  const linhaIdx = encontrarLinhaPorId_(aba, id);
  if (linhaIdx === -1) throw new Error("Registro não encontrado em " + nomeAba + ": " + id);
  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  Object.keys(dadosParciais).forEach((chave) => {
    const col = cabecalho.indexOf(chave);
    if (col === -1) return;
    aba.getRange(linhaIdx, col + 1).setValue(dadosParciais[chave]);
  });
}

function excluirLinhaPorId_(ss, nomeAba, id) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return;
  const linhaIdx = encontrarLinhaPorId_(aba, id);
  if (linhaIdx !== -1) aba.deleteRow(linhaIdx);
}

// yyyy-MM-dd sempre — o Sheets costuma converter texto de data em objeto
// Date sozinho quando a coluna "parece" uma data; isso normaliza os dois
// casos (Date real ou texto) pro mesmo formato ISO que o front-end espera.
function formatarData_(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(valor);
}

function paraBooleano_(valor) {
  return valor === true || valor === "true" || valor === "TRUE" || valor === 1 || valor === "1";
}

// ── API: LEITURA (GET) ───────────────────────────────────────────

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const lote = lerTodasAsAbas_(ss);

    const usuarioRaw = lote.Usuarios[0];
    const usuario = usuarioRaw
      ? { id: usuarioRaw.id, nome: usuarioRaw.nome }
      : { id: "user-1", nome: "Você" };

    const contas = lote.Contas.map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      saldoInicial: Number(c.saldo_inicial) || 0,
    }));

    const cartoes = lote.Cartoes.map((c) => ({
      id: c.id,
      nome: c.nome,
      limite: Number(c.limite) || 0,
      diaFechamento: Number(c.dia_fechamento) || 1,
      diaVencimento: Number(c.dia_vencimento) || 1,
      cor: c.cor || "",
    }));

    const categorias = lote.Categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      cor: c.cor || "",
    }));

    const movimentacoes = lote.Movimentacoes.map((m) => ({
      id: m.id,
      contaId: m.conta_id || null,
      cartaoId: m.cartao_id || null,
      categoriaId: m.categoria_id,
      descricao: m.descricao,
      tipo: m.tipo,
      valor: Number(m.valor) || 0,
      formaPagamento: m.forma_pagamento,
      dataCompra: formatarData_(m.data_compra),
      dataVencimento: formatarData_(m.data_vencimento),
      dataPagamento: m.data_pagamento ? formatarData_(m.data_pagamento) : null,
      status: m.status,
      parcelaGrupoId: m.parcela_grupo_id || null,
      numeroParcela: m.numero_parcela ? Number(m.numero_parcela) : null,
      totalParcelas: m.total_parcelas ? Number(m.total_parcelas) : null,
    }));

    const recorrencias = lote.Recorrencias.map((r) => ({
      id: r.id,
      descricao: r.descricao,
      valor: Number(r.valor) || 0,
      categoriaId: r.categoria_id,
      diaVencimento: Number(r.dia_vencimento) || 1,
      frequencia: r.frequencia,
      ativo: paraBooleano_(r.ativo),
      tipo: r.tipo || "despesa",
    }));

    const orcamentos = lote.Orcamentos.map((o) => ({
      id: o.id,
      categoriaId: o.categoria_id,
      mes: Number(o.mes),
      ano: Number(o.ano),
      limite: Number(o.limite) || 0,
    }));

    const metas = lote.Metas.map((m) => ({
      id: m.id,
      nome: m.nome,
      valorMeta: Number(m.valor_meta) || 0,
      valorAtual: Number(m.valor_atual) || 0,
      dataLimite: m.data_limite ? formatarData_(m.data_limite) : null,
    }));

    const payload = { usuario, contas, cartoes, categorias, movimentacoes, recorrencias, orcamentos, metas };
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({ erro: String((erro && erro.message) || erro) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── API: ESCRITA (POST) ──────────────────────────────────────────

function doPost(e) {
  try {
    const corpo = JSON.parse(e.postData.contents);
    const acao = corpo.action;
    const dados = corpo.payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let resultado;

    switch (acao) {
      case "addMovimentacao":
        resultado = addMovimentacao_(ss, dados);
        break;
      case "updateMovimentacao":
        resultado = updateMovimentacao_(ss, dados);
        break;
      case "deleteMovimentacao":
        resultado = deleteMovimentacao_(ss, dados);
        break;
      case "addConta":
        resultado = addConta_(ss, dados);
        break;
      case "addCartao":
        resultado = addCartao_(ss, dados);
        break;
      case "addRecorrencia":
        resultado = addRecorrencia_(ss, dados);
        break;
      case "updateRecorrencia":
        resultado = updateRecorrencia_(ss, dados);
        break;
      case "deleteRecorrencia":
        resultado = deleteRecorrencia_(ss, dados);
        break;
      case "setOrcamento":
        resultado = setOrcamento_(ss, dados);
        break;
      default:
        return ContentService.createTextOutput(JSON.stringify({ erro: "Ação desconhecida: " + acao }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({ erro: String((erro && erro.message) || erro) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── MOVIMENTAÇÕES ───────────────────────────────────────────────
// Uma compra parcelada chega aqui já "explodida" em N itens (uma
// movimentação por parcela) — o front-end (src/lib/store.tsx) monta essa
// lista antes de mandar; o backend só grava cada linha como veio.

function addMovimentacao_(ss, dados) {
  const itens = (dados && dados.itens) || [dados];
  inserirLinhas_(
    ss,
    "Movimentacoes",
    itens.map((m) => ({
      id: m.id || proximoId_("mov"),
      conta_id: m.conta_id || "",
      cartao_id: m.cartao_id || "",
      categoria_id: m.categoria_id || "",
      descricao: m.descricao || "",
      tipo: m.tipo || "despesa",
      valor: Number(m.valor) || 0,
      forma_pagamento: m.forma_pagamento || "",
      data_compra: m.data_compra || "",
      data_vencimento: m.data_vencimento || "",
      data_pagamento: m.data_pagamento || "",
      status: m.status || "pendente",
      parcela_grupo_id: m.parcela_grupo_id || "",
      numero_parcela: m.numero_parcela || "",
      total_parcelas: m.total_parcelas || "",
    }))
  );
  return { ok: true, total: itens.length };
}

function updateMovimentacao_(ss, dados) {
  const id = dados.id;
  const campos = {};
  if (dados.status !== undefined) campos.status = dados.status;
  if (dados.data_pagamento !== undefined) campos.data_pagamento = dados.data_pagamento;
  atualizarCamposPorId_(ss, "Movimentacoes", id, campos);
  return { ok: true, id: id };
}

function deleteMovimentacao_(ss, dados) {
  excluirLinhaPorId_(ss, "Movimentacoes", dados.id);
  return { ok: true, id: dados.id };
}

// ── CONTAS / CARTÕES ────────────────────────────────────────────

function addConta_(ss, dados) {
  const id = dados.id || proximoId_("conta");
  inserirLinha_(ss, "Contas", {
    id: id,
    nome: dados.nome || "",
    tipo: dados.tipo || "corrente",
    saldo_inicial: Number(dados.saldo_inicial) || 0,
  });
  return { id: id };
}

function addCartao_(ss, dados) {
  const id = dados.id || proximoId_("cartao");
  inserirLinha_(ss, "Cartoes", {
    id: id,
    nome: dados.nome || "",
    limite: Number(dados.limite) || 0,
    dia_fechamento: Number(dados.dia_fechamento) || 1,
    dia_vencimento: Number(dados.dia_vencimento) || 1,
    cor: dados.cor || "",
  });
  return { id: id };
}

// ── RECORRÊNCIAS (contas fixas / assinaturas) ──────────────────

function addRecorrencia_(ss, dados) {
  const id = dados.id || proximoId_("rec");
  inserirLinha_(ss, "Recorrencias", {
    id: id,
    descricao: dados.descricao || "",
    valor: Number(dados.valor) || 0,
    categoria_id: dados.categoria_id || "",
    dia_vencimento: Number(dados.dia_vencimento) || 1,
    frequencia: dados.frequencia || "mensal",
    ativo: dados.ativo !== false,
    tipo: dados.tipo === "receita" ? "receita" : "despesa",
  });
  return { id: id };
}

function updateRecorrencia_(ss, dados) {
  atualizarCamposPorId_(ss, "Recorrencias", dados.id, { ativo: dados.ativo });
  return { ok: true, id: dados.id };
}

function deleteRecorrencia_(ss, dados) {
  excluirLinhaPorId_(ss, "Recorrencias", dados.id);
  return { ok: true, id: dados.id };
}

// ── ORÇAMENTOS ──────────────────────────────────────────────────
// Um por categoria/mês/ano — se já existe, atualiza o limite em vez de
// duplicar a linha.

function setOrcamento_(ss, dados) {
  const aba = abaObrigatoria_(ss, "Orcamentos");
  const valores = aba.getDataRange().getValues();
  const cabecalho = valores[0];
  const colCategoria = cabecalho.indexOf("categoria_id");
  const colMes = cabecalho.indexOf("mes");
  const colAno = cabecalho.indexOf("ano");
  const colLimite = cabecalho.indexOf("limite");

  for (let i = 1; i < valores.length; i++) {
    if (
      valores[i][colCategoria] === dados.categoria_id &&
      Number(valores[i][colMes]) === Number(dados.mes) &&
      Number(valores[i][colAno]) === Number(dados.ano)
    ) {
      aba.getRange(i + 1, colLimite + 1).setValue(Number(dados.limite) || 0);
      return { ok: true, atualizado: true };
    }
  }

  inserirLinha_(ss, "Orcamentos", {
    id: proximoId_("orc"),
    categoria_id: dados.categoria_id || "",
    mes: Number(dados.mes),
    ano: Number(dados.ano),
    limite: Number(dados.limite) || 0,
  });
  return { ok: true, atualizado: false };
}
