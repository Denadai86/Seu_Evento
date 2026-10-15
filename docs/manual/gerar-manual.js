// gerar-manual.js — Manual do Usuário do Seu Evento
//
// COMO USAR
//   pnpm add -D -E docx@9.6.1        (só na primeira vez)
//   node docs/manual/gerar-manual.js  (gera Manual_Usuario_SeuEvento.docx ao lado deste arquivo)
//   node docs/manual/gerar-manual.js caminho/saida.docx
//
// COMO ATUALIZAR (resumo; o passo a passo está no README.md desta pasta)
//   1. Edite os textos no array `content` (mais abaixo). Cada capítulo começa em heading1(...).
//   2. Trocou de versão? Mude VERSAO_NUM e a data em VERSAO_DATA (aqui embaixo).
//   3. Rode o comando, abra o .docx no Word, confira e salve como PDF.
//   Regras: dentro dos textos use aspas curvas “assim” (as retas “quebram” o JavaScript);
//           as larguras de simpleTable DEVEM somar 9026 (o script avisa se não somarem).

const path = require("path");

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, LevelFormat, PageNumber, PageBreak,
} = require("docx");
const fs = require("fs");

const VERSAO_NUM = "2.0";
const VERSAO_DATA = "Outubro de 2026";
const VERSAO = `Versão ${VERSAO_NUM}  •  ${VERSAO_DATA}`;
const SAIDA = process.argv[2] || path.join(__dirname, "Manual_Usuario_SeuEvento.docx");

// ─────────────────────────────────────────────────────────────────────────────
// PALETA DE CORES
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  green: "1A7A4A", greenLight: "D1FAE5", greenMid: "4ADE80", dark: "0B0F14",
  slate800: "1E293B", slate700: "334155", slate400: "94A3B8", white: "FFFFFF",
  amber: "D97706", amberLight: "FEF3C7", red: "DC2626", redLight: "FEE2E2",
  blueLight: "EFF6FF", blue: "2563EB", gray100: "F3F4F6", gray200: "E5E7EB", gray600: "4B5563",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: C.gray200 };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const W = 9026; // largura útil da página A4 (DXA)

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, keepNext: true,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Arial", color: C.dark })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.green, space: 4 } },
  });
}
function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, keepNext: true,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: C.green })],
  });
}
function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3, keepNext: true,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: C.slate800 })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: C.slate800, ...opts })],
  });
}
function note(text, color = C.greenLight, borderColor = C.green) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: borderColor }, bottom: noBorder,
          left: { style: BorderStyle.SINGLE, size: 12, color: borderColor }, right: noBorder,
        },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        width: { size: W, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", color: C.slate800 })] })],
      })],
    })],
  });
}
const warningNote = (t) => note("Atenção: " + t, C.amberLight, C.amber);
const dangerNote = (t) => note("Cuidado: " + t, C.redLight, C.red);
const infoNote = (t) => note("Dica: " + t, C.blueLight, C.blue);
const okNote = (t) => note(t, C.greenLight, C.green);

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: C.slate800 })],
  });
}
// Cada lista numerada ganha uma "instância" própria: a contagem recomeça em 1.
let numberInstance = 0;
function numberedList(items) {
  numberInstance += 1;
  return items.map((text) => new Paragraph({
    numbering: { reference: "numbers", level: 0, instance: numberInstance },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: C.slate800 })],
  }));
}
const bullets = (items) => items.map((t) => bullet(t));
const space = (before = 160) => new Paragraph({ spacing: { before, after: 0 }, children: [new TextRun("")] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

function tableHeader(cells, widths) {
  return new TableRow({
    tableHeader: true, cantSplit: true,
    children: cells.map((text, i) => new TableCell({
      borders, shading: { fill: C.slate800, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      width: { size: widths[i], type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: "Arial", color: C.white })] })],
    })),
  });
}
function tableRow(cells, widths, shade = false) {
  return new TableRow({
    cantSplit: true,
    children: cells.map((text, i) => new TableCell({
      borders, shading: { fill: shade ? C.gray100 : C.white, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 150, right: 150 },
      width: { size: widths[i], type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20, font: "Arial", color: C.slate800 })] })],
    })),
  });
}
function simpleTable(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  if (total !== W) throw new Error(`Larguras de tabela somam ${total}, esperado ${W}: ${headers.join(" | ")}`);
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [tableHeader(headers, widths), ...rows.map((r, i) => tableRow(r, widths, i % 2 === 0))],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPA
// ─────────────────────────────────────────────────────────────────────────────
function makeCoverSection() {
  return {
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 2880, right: 1800, bottom: 1440, left: 1800 } } },
    headers: { default: new Header({ children: [] }) },
    footers: { default: new Footer({ children: [] }) },
    children: [
      new Table({
        width: { size: 8306, type: WidthType.DXA }, columnWidths: [8306],
        rows: [new TableRow({
          children: [new TableCell({
            borders: noBorders, shading: { fill: C.dark, type: ShadingType.CLEAR },
            margins: { top: 800, bottom: 800, left: 600, right: 600 },
            width: { size: 8306, type: WidthType.DXA },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
                children: [new TextRun({ text: "SEU EVENTO", bold: true, size: 72, font: "Arial", color: C.greenMid })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
                children: [new TextRun({ text: "Plataforma de Bingo Beneficente", size: 32, font: "Arial", color: C.slate400 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: "acaoleve.dev.br", size: 24, font: "Courier New", color: C.greenMid })] }),
            ],
          })],
        })],
      }),
      space(400),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "MANUAL DO USUÁRIO", bold: true, size: 40, font: "Arial", color: C.dark })] }),
      space(80),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Guia completo para organizadores, tesouraria, voluntários e fiscais", size: 24, font: "Arial", color: C.slate400 })] }),
      space(400),
      new Paragraph({ alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.gray200, space: 4 } }, spacing: { before: 200 },
        children: [new TextRun({ text: VERSAO, size: 20, font: "Arial", color: C.slate400 })] }),
      pageBreak(),
    ],
  };
}

function makeContentSection(children) {
  return {
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gray200, space: 2 } },
      children: [new TextRun({ text: `SEU EVENTO · Manual do Usuário · v${VERSAO_NUM}`, size: 18, font: "Arial", color: C.slate400 })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.gray200, space: 2 } },
      children: [
        new TextRun({ text: "Página ", size: 18, font: "Arial", color: C.slate400 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: C.slate400 }),
        new TextRun({ text: "  •  acaoleve.dev.br", size: 18, font: "Arial", color: C.slate400 }),
      ],
    })] }) },
    children,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEÚDO
// ─────────────────────────────────────────────────────────────────────────────
const content = [

  // ── SUMÁRIO E COMO USAR ───────────────────────────────────────────────────
  heading1("Sumário"),
  ...numberedList([
    "Visão Geral da Plataforma",
    "Primeiro Acesso",
    "Preparando o Evento (Administrador)",
    "Equipe e Permissões",
    "Tesouraria: Entregar, Devolver e Receber Cartelas",
    "PDV: a Tela do Voluntário",
    "Conduzindo o Sorteio ao Vivo (Palco e Telão)",
    "Fiscal: Conferindo um Bingo",
    "Painel de Resultados e Relatórios",
    "Encerrando o Evento",
    "Auditoria e Segurança",
    "Checklist do Evento",
    "Perguntas Frequentes e Solução de Problemas",
    "Referência Rápida",
  ]),
  space(),
  heading2("Qual capítulo é para mim?"),
  simpleTable(
    ["Você é…", "Leia principalmente"],
    [
      ["Administrador / organizador do evento", "Capítulos 3, 4, 5, 9, 10, 11 e 12"],
      ["Tesoureiro (quem entrega e recebe cartelas)", "Capítulos 5, 9 e 10"],
      ["Voluntário vendedor (caixa)", "Capítulos 2 e 6"],
      ["Locutor / operador do sorteio (permissão “Palco”)", "Capítulo 7"],
      ["Fiscal (confere os bingos)", "Capítulo 8"],
    ],
    [4200, 4826]
  ),
  pageBreak(),
  heading2(`O que mudou na versão ${VERSAO_NUM}`),
  simpleTable(
    ["Novidade", "Onde ver"],
    [
      ["Dois tipos de cartela (Quina e Cartela Cheia), cada um com preço próprio", "Cap. 3.4"],
      ["Fases de preço (pré-venda, perto do evento, no evento)", "Cap. 3.5"],
      ["Entrega de cartelas por quantidade, sem digitar códigos", "Cap. 5.2"],
      ["Acerto de “tudo o que ficou com o voluntário”, com prévia", "Cap. 5.4"],
      ["PDV: leitura de QR pela câmera, preço de cada cartela, desfazer venda, aviso de estoque baixo", "Cap. 6"],
      ["Pedidos de cartelas entre voluntários, pelo PDV", "Cap. 6.5"],
      ["Cartelas por ID e bloqueio de cartela perdida", "Cap. 5.7"],
      ["Painel de Resultados, ranking do administrador e extrato por voluntário", "Cap. 9"],
      ["Pedra patrocinada e relatório de exposição dos patrocinadores", "Cap. 7 e 9"],
      ["Log de auditoria", "Cap. 11"],
    ],
    [7000, 2026]
  ),
  space(),
  infoNote("Esta versão também corrige o manual anterior: o PIN do voluntário tem 6 dígitos (e não 4), o login não diferencia maiúsculas de minúsculas, e o PDV aceita Dinheiro e PIX (não há pagamento em cartão)."),
  pageBreak(),

  // ── 1. VISÃO GERAL ────────────────────────────────────────────────────────
  heading1("1. Visão Geral da Plataforma"),
  body("O Seu Evento é um sistema de bingo digital para organizações que realizam eventos beneficentes ou de arrecadação. Ele cuida das cartelas, da equipe de voluntários, do caixa, do sorteio ao vivo, do telão para projetor e dos relatórios, tudo pelo navegador, sem instalar nada."),
  heading2("1.1 Como funciona o acesso por subdomínio"),
  body("Cada organização cliente tem o seu próprio ambiente, isolado dos demais, em um endereço próprio:"),
  space(80),
  simpleTable(
    ["Organização", "Endereço de acesso", "Descrição"],
    [
      ["Ação Leve (plataforma)", "acaoleve.dev.br", "Site da plataforma e área do Super Admin"],
      ["Associação XYZ", "xyz.acaoleve.dev.br", "Painel do cliente XYZ"],
      ["Igreja ABC", "igabc.acaoleve.dev.br", "Painel do cliente ABC"],
    ],
    [2800, 3200, 3026]
  ),
  space(),
  heading2("1.2 Perfis de acesso"),
  simpleTable(
    ["Perfil", "Quem é", "O que pode fazer"],
    [
      ["Super Admin", "Equipe da plataforma", "Cadastrar clientes, acompanhar o uso e dar suporte"],
      ["Administrador (Org Admin)", "Dono do evento / organização", "Tudo do próprio evento: preços, cartelas, equipe, tesouraria, relatórios, sorteio"],
      ["Voluntário (Staff)", "Equipe do evento", "Só o que o administrador liberar: Vender (PDV), Palco ou Fiscal"],
    ],
    [2300, 2700, 4026]
  ),
  space(),
  body("As permissões do voluntário são definidas por evento:"),
  simpleTable(
    ["Permissão", "O que libera"],
    [
      ["Vender (PDV)", "Tela de vendas (caixa) e o botão Equipe, para pedir cartelas a colegas"],
      ["Palco", "Mesa do locutor: sortear as pedras, soltar o bingo no telão, encerrar a rodada"],
      ["Fiscal", "Tela de verificação: conferir a cartela de quem gritou bingo e avisar o locutor"],
    ],
    [2600, 6426]
  ),
  space(),
  heading2("1.3 Planos"),
  simpleTable(
    ["Plano", "Como funciona"],
    [
      ["Evento Único", "1 evento. O acesso continua por 7 dias depois da data do evento, para fechar o relatório."],
      ["3 Eventos", "Até 3 eventos em 12 meses. O painel mostra quantos eventos ainda restam."],
      ["Anual", "Eventos ilimitados por 12 meses."],
    ],
    [2600, 6426]
  ),
  space(),
  body("O pagamento e a liberação do acesso são combinados pelo WhatsApp. Há garantia de 7 dias com reembolso integral e, se nenhuma cartela tiver sido vendida no sistema, o prazo é de até 30 dias. Quando um plano com limite de eventos chega ao fim, a plataforma avisa na criação do evento; para renovar ou ampliar, fale com o suporte."),
  space(),
  heading2("1.4 Mapa das telas"),
  simpleTable(
    ["Tela", "Endereço (no seu subdomínio)", "Quem usa"],
    [
      ["Painel principal", "/dashboard", "Administrador"],
      ["Central de Voluntários", "/dashboard/equipe", "Administrador"],
      ["Centro de Comando do evento", "/dashboard/[evento]", "Administrador"],
      ["Tesouraria", "/dashboard/[evento]/tesouraria", "Administrador"],
      ["Painel de Resultados", "/dashboard/[evento]/resultados", "Administrador"],
      ["PDV (caixa)", "/vendas", "Voluntário com “Vender (PDV)”"],
      ["Mesa do locutor", "/live", "Administrador ou voluntário com “Palco”"],
      ["Telão", "/projector", "Projetor ou TV (ninguém precisa mexer)"],
      ["Verificador", "/verify", "Administrador ou voluntário com “Fiscal”"],
    ],
    [3000, 3700, 2326]
  ),
  space(),
  infoNote("A cartela digital para o participante (versão para ver no celular) ainda está em desenvolvimento e não faz parte deste manual."),
  pageBreak(),

  // ── 2. PRIMEIRO ACESSO ────────────────────────────────────────────────────
  heading1("2. Primeiro Acesso"),
  heading2("2.1 Como fazer login"),
  ...numberedList([
    "Abra o endereço do seu evento (por exemplo, igabc.acaoleve.dev.br) e entre na tela de login, em /entrar.",
    "No campo Identificação, digite o seu e-mail (administrador) ou o seu usuário (voluntário, por exemplo JOAO1234).",
    "No campo Código de Acesso, digite a sua senha (administrador) ou o seu PIN de 6 dígitos (voluntário).",
    "Toque em Entrar. O sistema reconhece o seu perfil e leva você para a tela certa.",
  ]),
  space(),
  simpleTable(
    ["Perfil", "Credencial", "Para onde vai"],
    [
      ["Administrador", "E-mail + senha", "Painel principal (/dashboard)"],
      ["Voluntário", "Usuário + PIN de 6 dígitos", "PDV (/vendas); o menu de baixo mostra as telas liberadas"],
    ],
    [2200, 3300, 3526]
  ),
  space(),
  infoNote("O login não diferencia maiúsculas de minúsculas: “joao1234” e “JOAO1234” funcionam igual."),
  space(),
  heading2("2.2 Proteção contra tentativas erradas"),
  body("Depois de várias tentativas erradas em pouco tempo, o sistema bloqueia o login por cerca de 15 minutos. Isso protege as contas contra quem tenta adivinhar senhas. O limite vale por conta e também por rede: se muitos voluntários errarem o PIN no mesmo Wi-Fi do salão, o bloqueio pode afetar mais de uma pessoa. Se isso acontecer, aguarde alguns minutos."),
  space(),
  heading2("2.3 Esqueci meu PIN"),
  body("Só o administrador pode gerar um novo PIN: Central de Voluntários, localizar a pessoa e tocar em Resetar PIN (capítulo 4). O PIN antigo deixa de funcionar na hora."),
  pageBreak(),

  // ── 3. PREPARANDO O EVENTO ────────────────────────────────────────────────
  heading1("3. Preparando o Evento (Administrador)"),
  body("Este capítulo é a ordem certa para deixar um evento pronto. Faça com antecedência: gerar e imprimir cartelas leva tempo."),
  heading2("3.1 Criando o evento"),
  ...numberedList([
    "No Painel principal, toque em + Novo Evento (na lista Meus Eventos).",
    "Digite o nome (por exemplo, Bingo de Natal 2026) e confirme.",
    "O evento nasce Inativo (em rascunho). Você configura tudo antes de ativá-lo.",
  ]),
  space(),
  infoNote("Se o seu plano tem limite de eventos, o painel mostra “N eventos restantes no plano”. Quando acabarem, o sistema avisa na hora de criar e orienta a falar com o suporte."),
  space(),
  heading2("3.2 O Centro de Comando"),
  body("Ao entrar no evento você vê o Centro de Comando, com o total em caixa e as cartelas pagas, e os blocos de configuração:"),
  simpleTable(
    ["Bloco", "Para que serve"],
    [
      ["Evento Ativo / Inativo", "Liga e desliga o evento (capítulo 3.10)"],
      ["Preços", "Preço padrão da cartela e da cartela cheia, e as Fases de Preço"],
      ["Fábrica de Cartelas", "Gerar e imprimir cartelas"],
      ["Gestão de Rodadas", "Patrocinadores e prêmios"],
      ["Central da Equipe", "Quem trabalha no evento e com qual permissão"],
      ["Tesouraria do Evento", "Entregar, recolher e receber cartelas"],
      ["Área de Testes e Links Operacionais", "Mesa Locutor, Abrir Telão, Verificador, Painel de Resultados, Relatórios e Fechar Caixa Definitivo"],
    ],
    [3200, 5826]
  ),
  space(),
  heading2("3.3 O assistente de 4 passos"),
  body("Em eventos novos, o assistente guia a preparação:"),
  ...numberedList([
    "Passo 1, Valor da Cartela: o preço da cartela de quina e, se houver rodada de cartela cheia, o da cartela cheia.",
    "Passo 2, Patrocinadores do Evento: cadastre as empresas apoiadoras.",
    "Passo 3, Premiações e Naming Rights: monte as rodadas e os prêmios.",
    "Passo 4, A Fábrica de Cartelas: gere o lote inicial de cartelas.",
  ]),
  space(),
  heading2("3.4 Tipos de cartela e preços"),
  body("Existem dois tipos de cartela, e eles não se misturam. Cada um tem o seu preço e só concorre a prêmios do mesmo tipo:"),
  simpleTable(
    ["", "Quina", "Cartela Cheia"],
    [
      ["Ganha quando…", "Uma linha inteira é sorteada (linha, coluna ou diagonal)", "Todos os números da cartela são sorteados"],
      ["Concorre a prêmio de…", "Só rodadas de Quina", "Só rodadas de Cartela Cheia"],
      ["Preço", "Preço da cartela", "Preço da cartela cheia (próprio, em geral maior)"],
      ["Na impressão", "Etiqueta “Quina”", "Etiqueta “Cartela Cheia” (fundo preto)"],
    ],
    [2400, 3300, 3326]
  ),
  space(),
  warningNote("Cartelas criadas em eventos antigos, antes dos tipos existirem, continuam valendo para os dois tipos de prêmio e custam o preço da quina. Em eventos novos, todas as cartelas têm tipo."),
  space(),
  body("Para gerar cartelas de Cartela Cheia, defina antes o preço dela. Sem preço, o sistema recusa: assim ninguém vende uma cartela cheia pelo preço da quina por engano."),
  space(),
  heading2("3.5 Fases de preço"),
  body("O preço da cartela costuma subir com o tempo: mais barato na pré-venda, mais caro perto do evento e no dia. Em Preços, na seção Fases de Preço, você cadastra cada fase com:"),
  ...bullets([
    "Nome (por exemplo, Pré-venda).",
    "Preço da Quina e, opcionalmente, o da Cheia (vazio usa o preço padrão da cartela cheia).",
    "Data e hora em que a fase começa (a primeira pode ficar sem data, valendo desde o início).",
  ]),
  space(),
  simpleTable(
    ["Exemplo de fases", "Quina", "Cheia", "Começa em"],
    [
      ["Pré-venda", "R$ 10,00", "R$ 15,00", "Desde o início"],
      ["Próximo ao evento", "R$ 15,00", "R$ 20,00", "20/10 às 08:00"],
      ["No evento", "R$ 20,00", "R$ 25,00", "25/10 às 08:00"],
    ],
    [3000, 1800, 1800, 2426]
  ),
  space(),
  ...bullets([
    "O preço muda sozinho na data de cada fase. A fase em vigor aparece com o selo “Vigente”.",
    "Só o administrador define preços. O PDV apenas aplica o preço da fase em vigor.",
    "Cartelas já vendidas nunca mudam de preço, nem se você apagar a fase.",
    "Sem nenhuma fase em vigor, vale o preço padrão do evento.",
    "Para corrigir uma fase, apague e crie de novo.",
  ]),
  space(),
  heading2("3.6 Chave PIX"),
  body("Em Chave PIX do Recebedor, informe a chave (CNPJ, e-mail, celular ou chave aleatória). Ela aparece no PDV para o comprador pagar por PIX. O sistema não confirma o pagamento sozinho (capítulo 6.2)."),
  space(),
  heading2("3.7 Patrocinadores e prêmios (Gestão de Rodadas)"),
  heading3("Patrocinadores"),
  ...bullets([
    "Informe o Nome da Empresa e envie o logo.",
    "Se a empresa fez uma doação, informe o valor em Doação R$ (opcional).",
    "O logo aparece no telão e nas cartelas impressas. Cada pedra sorteada é “oferecida por” um patrocinador, em rodízio (capítulo 7).",
  ]),
  heading3("Prêmios (rodadas)"),
  ...numberedList([
    "Dê um nome à rodada (por exemplo, 1ª Rodada).",
    "Escreva o prêmio (por exemplo, R$ 500 ou Uma cesta de café).",
    "Escolha o tipo: Quina (Menor) ou Cheia (Maior).",
    "Escolha quem oferece: um patrocinador ou Custeado pela Casa (Sem Patrocínio).",
    "Toque em Add. As rodadas acontecem na ordem em que foram criadas.",
  ]),
  space(),
  infoNote("Se a rodada é de Cartela Cheia, só cartelas de Cartela Cheia podem ganhá-la. Confira se você gerou cartelas desse tipo."),
  space(),
  heading2("3.8 Gerando cartelas"),
  ...numberedList([
    "Na Fábrica de Cartelas, escolha o Tipo de Cartela: Quina ou Cartela Cheia.",
    "Informe a quantidade (de 1 a 5.000) e toque em gerar.",
    "O sistema cria cartelas únicas, com números sorteados com segurança e um código curto (por exemplo, AB12CD).",
    "Repita para o outro tipo, se for usar os dois.",
  ]),
  space(),
  warningNote("Gere mais cartelas do que o previsto. Cartela que sobra não custa nada, mas faltar cartela no dia do evento complica."),
  space(),
  heading2("3.9 Imprimindo as cartelas"),
  body("Ainda na Fábrica de Cartelas, escolha primeiro o que imprimir (Todas, Só Quina ou Só Cartela Cheia) e depois o formato:"),
  simpleTable(
    ["Formato", "Papel", "Cartelas por página", "Uso recomendado"],
    [
      ["a4-4", "A4", "4 (2×2)", "Uso geral: equilibra tamanho e quantidade"],
      ["a4-2", "A4", "2", "Cartelas maiores, mais fáceis de marcar"],
      ["a4-1", "A4", "1", "Eventos especiais"],
      ["a4-6", "A4", "6 (3×2)", "Maior economia de papel"],
      ["a6", "A6", "1", "Gráfica: tamanho cartão"],
    ],
    [1400, 1200, 2400, 4026]
  ),
  space(),
  body("Cada cartela impressa traz a grade B-I-N-G-O, o código curto (usado no PDV), o QR Code (usado pelo PDV e pelo fiscal), a etiqueta do tipo e os patrocinadores."),
  space(),
  infoNote("Imprima cada tipo separado e mantenha cada pilha em ordem de código. A entrega por quantidade e os pedidos entre voluntários (capítulos 5 e 6) usam essa ordem, e você não precisa digitar nem ler código por código."),
  space(),
  heading2("3.10 Ligando e desligando o evento"),
  simpleTable(
    ["Situação", "Significado", "PDV (caixa)"],
    [
      ["Evento Inativo (rascunho)", "Em preparação", "Fechado: mostra “Nenhum evento ativo”"],
      ["Evento Ativo", "Em andamento", "Aberto para vendas"],
      ["Encerrado", "Evento finalizado e caixa fechado", "Fechado de vez"],
    ],
    [2800, 3500, 2726]
  ),
  space(),
  infoNote("Só um evento fica ativo por vez. Ao ativar um, os outros voltam para Inativo."),
  pageBreak(),

  // ── 4. EQUIPE ─────────────────────────────────────────────────────────────
  heading1("4. Equipe e Permissões"),
  body("Os voluntários são cadastrados uma vez, na Central de Voluntários (acessível pelo menu como Central de RH), e depois ligados a cada evento com as permissões certas."),
  heading2("4.1 Cadastrando um voluntário"),
  ...numberedList([
    "Abra a Central de Voluntários.",
    "Toque em Novo Voluntário e digite o Nome Completo.",
    "Toque em Confirmar e Gerar Acesso.",
    "A tela Credenciais Geradas! mostra o USUÁRIO (por exemplo, JOAO1234) e a SENHA (PIN) de 6 dígitos.",
    "Anote e entregue ao voluntário antes de tocar em Entendi, Fechar.",
  ]),
  space(),
  warningNote("O PIN é mostrado uma única vez. Se o voluntário perder, use Resetar PIN: ele gera um PIN novo e o antigo deixa de valer imediatamente."),
  space(),
  heading2("4.2 Ligando o voluntário ao evento"),
  ...numberedList([
    "Na lista Equipe Cadastrada, toque em Gerenciar Eventos no voluntário.",
    "Escolha o evento e marque o que ele pode fazer: Vender (PDV), Palco e/ou Fiscal.",
    "Pronto: o voluntário passa a aparecer em Equipe na Escala do evento e, se tiver Vender (PDV), na Tesouraria.",
  ]),
  space(),
  infoNote("Um voluntário pode ter mais de uma permissão (por exemplo, vender e fiscalizar). Pessoas que só vão sortear precisam apenas de Palco."),
  space(),
  heading2("4.3 O que o voluntário NÃO pode"),
  body("Mesmo sabendo o endereço de uma tela, o voluntário só consegue fazer o que a permissão dele autoriza. Preços, tesouraria, geração de cartelas, relatórios financeiros e o ranking são exclusivos do administrador."),
  pageBreak(),

  // ── 5. TESOURARIA ─────────────────────────────────────────────────────────
  heading1("5. Tesouraria: Entregar, Devolver e Receber Cartelas"),
  body("A Tesouraria controla as cartelas que saem da “fábrica” (o estoque livre), passam pelas mãos dos voluntários e voltam como vendidas. Fica em Tesouraria do Evento, botão Abrir Tesouraria. Só o administrador acessa."),
  heading2("5.1 A tela"),
  ...bullets([
    "Fábrica (Estoque Livre): quantas cartelas ainda estão livres.",
    "Vendedores Ativos no Evento: um cartão para cada voluntário com permissão Vender (PDV).",
    "Em cada voluntário: No Bolso (quantas cartelas estão com ele), Vendidas/Pagas e Devolvíveis / Pendentes.",
    "Três botões por voluntário: Entregar, Receber e Devolver.",
  ]),
  space(),
  warningNote("Se a lista de vendedores aparecer vazia, falta dar ao voluntário a permissão Vender (PDV) na Central de Voluntários e ligá-lo ao evento (capítulo 4)."),
  space(),
  heading2("5.2 Entregar cartelas (por quantidade)"),
  ...numberedList([
    "No voluntário, toque em Entregar. O padrão é a aba Por quantidade.",
    "Escolha o Tipo de cartela (Quina ou Cartela Cheia) e a Quantidade (até 2.000).",
    "Toque em Entregar N cartelas.",
    "O sistema separa as próximas cartelas livres, na ordem da impressão, e mostra o resultado: “50 cartelas entregues: de AB12CD até XY98ZT”, com a lista dos códigos.",
    "Entregue ao voluntário as próximas 50 cartelas da pilha impressa (a do mesmo tipo).",
    "Para ter um recibo, toque em Imprimir extrato deste voluntário.",
  ]),
  space(),
  infoNote("Se não houver cartelas livres suficientes do tipo pedido, nada é entregue e o sistema diz quantas existem. Existe também a aba Por códigos, para entregar cartelas específicas digitando os códigos."),
  space(),
  heading2("5.3 Devolver cartelas"),
  body("Quando o voluntário devolve cartelas que não vendeu, toque em Devolver e informe os códigos dessas cartelas. Elas voltam para a fábrica e podem ser entregues a outra pessoa."),
  space(),
  heading2("5.4 Receber (acertar) o dinheiro de cartelas vendidas em papel"),
  body("Cartela vendida pelo PDV já nasce paga: o dinheiro foi lançado na hora, pelo próprio voluntário. A tesouraria só trabalha as cartelas vendidas em papel, fora do sistema. Para cada uma delas existe o acerto, em Receber:"),
  ...numberedList([
    "Escolha o preço aplicado neste acerto (veja abaixo).",
    "Informe os códigos das cartelas vendidas, ou marque Todas as cartelas que continuam com o voluntário.",
    "Toque em Confirmar Lote (ou Conferir e receber, no modo “todas”).",
    "No modo “todas”, o sistema mostra uma prévia (“38 cartelas, R$ 380,00”) e pede a sua confirmação antes de gravar.",
  ]),
  space(),
  heading3("A opção “todas as cartelas que continuam com o voluntário”"),
  body("É o caminho mais rápido e evita digitar códigos de cartelas vendidas. Funciona assim: primeiro recolha as cartelas NÃO vendidas (Devolver); o que sobrou com o voluntário foi vendido, e um clique dá baixa em tudo."),
  warningNote("Confirme só depois de recolher as cartelas não vendidas. Se o voluntário ainda tiver cartelas na mão, o sistema cobrará por elas."),
  space(),
  heading3("Qual preço aplicar?"),
  body("Uma cartela vendida em papel na pré-venda deve ser acertada pelo preço da pré-venda, mesmo que o acerto aconteça só no dia do evento. A data da venda em papel não fica registrada no sistema, por isso é você quem escolhe a fase de preço no acerto (o padrão é a fase em vigor agora). Se o mesmo voluntário vendeu em fases diferentes, faça um acerto para cada fase."),
  space(),
  heading2("5.5 Fluxo recomendado para venda em papel"),
  ...numberedList([
    "Entregar: dê ao voluntário a quantidade de cartelas de cada tipo.",
    "O voluntário vende em papel.",
    "No fim, o voluntário devolve as não vendidas. Você registra em Devolver.",
    "Receber: marque “todas as cartelas que continuam” e confirme a prévia.",
    "Imprima o Extrato por Voluntário (capítulo 9) para conferir e assinar.",
  ]),
  space(),
  heading2("5.6 Pedidos entre voluntários"),
  body("Os voluntários podem pedir cartelas uns aos outros pelo PDV (capítulo 6.5). No fim da página da Tesouraria, a lista Pedidos entre voluntários mostra quem pediu, quem entregou, quantas cartelas, a faixa de códigos e a situação de cada pedido. Assim você sempre sabe com quem está cada cartela."),
  space(),
  heading2("5.7 Cartelas por ID e bloqueio de cartela perdida"),
  body("Abra Cartelas por ID pelo Painel de Resultados (ou pelo link na Tesouraria). A tela mostra o total de cartelas Livres (fábrica), Com voluntários, Vendidas e Bloqueadas, e permite:"),
  ...bullets([
    "Buscar uma cartela pelo código (ou pelo começo dele) e ver o tipo, a situação e com quem está.",
    "Imprimir a lista de cartelas livres e a de cada voluntário, para conferir a pilha física.",
    "Filtrar por situação e por tipo.",
  ]),
  space(),
  heading3("Bloqueando uma cartela perdida"),
  ...numberedList([
    "Busque o código da cartela.",
    "Toque em Bloquear e informe o motivo (por exemplo, cartela perdida).",
  ]),
  body("Cartela bloqueada não pode ser vendida, entregue, transferida nem premiada. Se você bloquear uma cartela que já estava vendida, o valor continua no caixa e ela só deixa de poder ganhar. Dá para desbloquear a qualquer momento, e tudo fica registrado na auditoria."),
  pageBreak(),

  // ── 6. PDV ────────────────────────────────────────────────────────────────
  heading1("6. PDV: a Tela do Voluntário"),
  body("É a tela de vendas (caixa), em /vendas. Só funciona com o evento Ativo. O voluntário entra com o seu usuário e PIN e já cai no caixa como ele mesmo."),
  heading2("6.1 Vendendo cartelas"),
  ...numberedList([
    "Digite o código da cartela em ID da Cartela e toque em Adicionar cartela, ou toque no ícone da câmera e leia o QR Code.",
    "O sistema confirma a cartela e mostra no carrinho o código, o tipo (cartelas cheias têm o selo Cheia) e o preço de cada uma.",
    "Repita para todas as cartelas da venda. O Total a cobrar é somado automaticamente.",
    "Escolha a forma de pagamento: Dinheiro ou PIX.",
    "Confirme a venda. As cartelas ficam pagas no sistema, e o valor entra no seu caixa.",
  ]),
  space(),
  heading3("Lendo o QR com a câmera"),
  body("O botão da câmera abre o leitor em tela cheia. Aponte para o QR de cada cartela: ela entra no carrinho, o celular vibra e o leitor continua aberto para a próxima. Toque em Concluir ao terminar. Se uma cartela já foi vendida, está bloqueada ou não existe, o leitor avisa e segue."),
  infoNote("A câmera pede permissão do navegador na primeira vez. Se negar, libere nas configurações do site."),
  space(),
  heading2("6.2 Pagamento por PIX"),
  body("Ao escolher PIX, o sistema mostra a chave PIX do evento (com botão para copiar) e o QR Code, para o comprador pagar pelo aplicativo do banco. Depois que o dinheiro cair, toque em Confirmar pagamento PIX."),
  warningNote("O sistema não confirma o PIX sozinho. Quem vende confere o recebimento no app do banco antes de confirmar a venda."),
  space(),
  heading2("6.3 O preço e as fases"),
  body("O preço de cada cartela é definido pelo administrador (capítulo 3.5). O PDV mostra a fase em vigor perto do campo de código (por exemplo, “preço: Pré-venda”) e aplica o valor certo para cada tipo de cartela."),
  body("Se a fase de preço mudar justamente entre adicionar a cartela e finalizar a venda, o sistema recusa a venda, atualiza os valores do carrinho e avisa: “Os preços mudaram… confira o total e tente de novo”. Ninguém é cobrado pelo valor antigo sem perceber."),
  space(),
  heading2("6.4 Errei: desfazer a última venda"),
  body("Logo depois de fechar a venda aparece o link Errei: desfazer esta venda. Ele também fica em Equipe, em Última venda."),
  ...bullets([
    "Vale só para a sua própria última venda, em até 10 minutos.",
    "As cartelas voltam para a sua mão e o valor sai do caixa.",
    "Fica registrado quem desfez, quando e quais cartelas.",
    "Passou de 10 minutos, ou é uma venda mais antiga: fale com o administrador.",
  ]),
  space(),
  heading2("6.5 O botão Equipe"),
  body("No topo do PDV, o botão Equipe abre o seu painel:"),
  ...bullets([
    "Vendi no caixa: quanto você vendeu (quantidade, PIX e dinheiro).",
    "Comigo: quantas cartelas estão na sua mão, por tipo.",
    "Última venda, com a opção de desfazer.",
    "Equipe: os colegas e quantas cartelas cada um tem na mão. Só a quantidade, sem os valores das vendas deles.",
  ]),
  space(),
  heading3("Aviso de estoque baixo"),
  body("Quando restam 5 cartelas ou menos com você, o botão Equipe fica âmbar (“Restam 3”) e o painel avisa para pedir mais."),
  space(),
  heading3("Pedindo cartelas a um colega"),
  ...numberedList([
    "Em Equipe, ache o colega que tem cartelas sobrando e toque em Pedir.",
    "Escolha o tipo e a quantidade e toque em Enviar pedido. Se ele não tiver essa quantidade, o sistema avisa na hora.",
    "O colega vê um número vermelho no botão Equipe dele (atualiza em segundos) e responde.",
    "Quando ele aceitar, o pedido aparece como Aceito em Meus pedidos, com a faixa de códigos: “de X até Y”.",
  ]),
  space(),
  heading3("Respondendo a um pedido"),
  ...numberedList([
    "Em Equipe, veja Pedidos para você.",
    "Toque em Aceitar. O sistema separa as últimas N cartelas da sua pilha (as de maior código) e mostra “de X até Y”.",
    "Entregue ao colega exatamente essas cartelas, e ele confere a faixa no celular dele.",
    "Se a sua pilha não estiver em ordem, use Escolher os códigos que vou entregar e digite os códigos que você realmente vai passar.",
    "Para recusar, toque em Recusar. Quem pediu pode cancelar enquanto não houver resposta.",
  ]),
  space(),
  infoNote("Por que o sistema registra os códigos? Para o acerto da tesouraria e a conferência de um bingo (que exige cartela paga) continuarem batendo com as cartelas físicas. Sem registro, uma cartela vendida por outra pessoa poderia ficar “não paga” no sistema."),
  space(),
  heading2("6.6 Mensagens comuns no PDV"),
  simpleTable(
    ["Mensagem", "O que significa / o que fazer"],
    [
      ["Nenhum evento ativo", "O administrador precisa ativar o evento"],
      ["Cartela não encontrada neste evento", "Código digitado errado ou cartela de outro evento"],
      ["Esta cartela já foi vendida", "Confira o código; se foi engano, a venda anterior pode ser desfeita"],
      ["Esta cartela está BLOQUEADA", "Foi dada como perdida ou cancelada; avise o administrador"],
      ["O preço da cartela cheia ainda não foi definido", "O administrador precisa definir o preço da cartela cheia"],
      ["Os preços mudaram…", "A fase de preço virou; confira o novo total e tente de novo"],
    ],
    [3500, 5526]
  ),
  space(),

  // ── 7. SORTEIO ────────────────────────────────────────────────────────────
  heading1("7. Conduzindo o Sorteio ao Vivo (Palco e Telão)"),
  body("O sorteio é conduzido pelo administrador ou por um voluntário com a permissão Palco, na Mesa do Locutor (/live). O público acompanha pelo Telão (/projector)."),
  heading2("7.1 Preparando as telas"),
  ...numberedList([
    "Ative o evento (Evento Ativo).",
    "No Centro de Comando, em Links Operacionais, abra a Mesa Locutor no aparelho do locutor.",
    "Abra o Telão no computador ligado ao projetor ou à TV: use Abrir Telão (ou, dentro da Mesa do Locutor, Telão Pop-up ou Link do Telão).",
    "Deixe o navegador do telão em tela cheia. As telas se ajustam à altura da tela, sem precisar diminuir o zoom.",
  ]),
  space(),
  infoNote("Se o telão estiver no mesmo navegador do locutor (por exemplo, uma janela pop-up no mesmo computador), ele atualiza no mesmo instante em que a pedra é sorteada. Em outro aparelho, a atualização leva até cerca de 1,5 segundo."),
  space(),
  heading2("7.2 A Mesa do Locutor"),
  simpleTable(
    ["Bloco", "O que mostra"],
    [
      ["Rodada Ativa", "O prêmio da rodada em andamento e o seu tipo (Quina ou Cheia)"],
      ["Patrocinador da Pedra", "No ar agora (quem ofereceu a última pedra) e Próxima pedra, para você anunciar antes de sortear"],
      ["Sorteador Manual", "A bola grande, o botão Sortear Pedra e o contador de pedras cantadas"],
      ["Grade B-I-N-G-O", "Os 75 números, com os já sorteados em destaque"],
      ["Na Cara do Gol", "As cartelas mais perto de ganhar a rodada atual (veja abaixo)"],
      ["Auditoria de Mesa", "Busca de qualquer cartela pelo código, com a situação dela"],
      ["Mostrar grade no telão", "Liga e desliga a grade de números na tela grande"],
    ],
    [3000, 6026]
  ),
  space(),
  heading3("Pedra patrocinada"),
  body("Cada pedra sorteada é “oferecida por” um patrocinador, em rodízio. Antes de apertar Sortear Pedra, olhe a Próxima pedra e anuncie o patrocinador. O telão mostra o cartão “Pedra oferecida por…” junto com a bola."),
  space(),
  heading3("Na Cara do Gol"),
  body("A lista acompanha o tipo da rodada atual:"),
  ...bullets([
    "Rodada de Quina: mostra cartelas a 1 ou 2 pedras de fechar uma linha, e “Bateu!” para as que já fecharam.",
    "Rodada de Cartela Cheia: mostra cartelas a até 4 pedras de completar a cartela.",
    "Só entram cartelas do tipo da rodada.",
  ]),
  space(),
  heading2("7.3 Passo a passo do sorteio"),
  ...numberedList([
    "Confira a Rodada Ativa e anuncie o prêmio e o patrocinador da vez.",
    "Toque em Sortear Pedra a cada número. A bola gira e o número aparece na mesa e no telão.",
    "Quando alguém gritar BINGO, o fiscal confere a cartela (capítulo 8) e avisa você.",
    "Aparece o aviso ALERTA DE BINGO NO PÁTIO!, com o código da cartela e o nome do ganhador.",
    "Se for válido, toque em SOLTAR TELÃO!: o telão mostra a comemoração com o nome do ganhador, o prêmio e quem o ofereceu.",
    "Se for um engano, toque em Falso Alarme (Limpar).",
    "Terminada a comemoração, toque em Encerrar Rodada e Ir Pro Próximo Prêmio. As pedras são zeradas e começa a rodada seguinte.",
  ]),
  space(),
  warningNote("Forçar reset do globo atual zera as pedras da rodada em andamento. Use só em caso de erro: fica registrado na auditoria."),
  space(),
  heading2("7.4 O Telão"),
  body("O telão (/projector) é feito para projetores e TVs grandes. Ninguém precisa mexer nele. Mostra:"),
  ...bullets([
    "A bola com o número sorteado, em destaque, e a contagem de pedras.",
    "O prêmio da rodada e quem o oferece.",
    "A grade B-I-N-G-O (quando ligada na mesa).",
    "O rodapé dos patrocinadores, com a Pedra oferecida por… e a faixa de logos.",
    "A comemoração com confetes e o nome do ganhador, quando o bingo é solto.",
  ]),
  space(),
  infoNote("O sorteio e as vendas dependem de internet. Se a conexão cair, o telão mantém na tela o último estado e as pedras já sorteadas ficam salvas; o sorteio só continua quando a internet voltar. Tenha um roteador 4G ou o hotspot de um celular como reserva."),
  space(),

  // ── 8. FISCAL ─────────────────────────────────────────────────────────────
  heading1("8. Fiscal: Conferindo um Bingo"),
  body("O fiscal (administrador ou voluntário com a permissão Fiscal) usa a tela Verificador (/verify). O menu de baixo alterna entre VENDAS, VERIFICAR e SAIR."),
  heading2("8.1 Passo a passo"),
  ...numberedList([
    "Quando alguém gritar BINGO, peça a cartela e abra o Verificador.",
    "Toque em LER QR CODE COM A CÂMERA e aponte para a cartela, ou digite o código em OU DIGITE O CÓDIGO MANUALMENTE.",
    "Leia o resultado na tela (tabela abaixo).",
    "Se for um bingo válido, toque em AVISAR LOCUTOR e informe o nome do ganhador quando o sistema pedir.",
    "A tela confirma “Aviso enviado para o telão!”. O locutor vê o aviso na Mesa e decide soltar o telão.",
  ]),
  space(),
  heading2("8.2 O que o sistema confere"),
  body("A conferência acontece no servidor, não no aparelho do fiscal. O sistema verifica, nesta ordem:"),
  ...bullets([
    "A cartela existe neste evento.",
    "Não está bloqueada (perdida ou cancelada).",
    "Está paga. Cartela não paga nunca ganha, e o sistema avisa que o pagamento do prêmio está proibido.",
    "É do mesmo tipo da rodada: cartela de Quina só ganha rodada de Quina, e cartela cheia só ganha rodada de Cartela Cheia.",
    "Os números sorteados fecham o padrão da rodada atual.",
  ]),
  space(),
  simpleTable(
    ["Resultado na tela", "Significado"],
    [
      ["BINGO! Quina confirmada / Cartela Cheia confirmada", "A cartela venceu a rodada atual"],
      ["Cartela válida, mas ainda não bateu Quina (ou Cartela Cheia)", "Está tudo certo com a cartela, mas ainda não fechou o padrão"],
      ["CARTELA NÃO PAGA", "A cartela não foi vendida no PDV nem acertada na tesouraria"],
      ["CARTELA BLOQUEADA", "Foi dada como perdida ou cancelada e não pode ser premiada"],
      ["Esta cartela é de Quina, mas a rodada atual premia Cartela Cheia", "O tipo da cartela não é o da rodada"],
      ["Cartela não encontrada", "Código errado ou cartela de outro evento"],
    ],
    [4300, 4726]
  ),
  space(),
  heading2("8.3 O que é uma Quina"),
  body("Quina é uma linha completa: qualquer uma das 5 linhas, das 5 colunas ou das 2 diagonais. O centro da cartela é livre, então uma linha que passa pelo centro precisa de 4 números. Cartela Cheia é a cartela com todos os 24 números sorteados."),
  space(),
  infoNote("Uma cartela que falta 4 números ou menos para a cartela cheia já tem uma quina garantida. Por isso numa rodada de Quina o aviso “Bateu!” aparece cedo."),
  pageBreak(),

  // ── 9. RESULTADOS ─────────────────────────────────────────────────────────
  heading1("9. Painel de Resultados e Relatórios"),
  body("O Painel de Resultados reúne tudo o que o evento já registrou. Abra pelo Centro de Comando, em Painel de Resultados. É exclusivo do administrador e se atualiza sozinho a cada 30 segundos enquanto o evento acontece (o botão do topo atualiza na hora; clicar com o botão direito pausa a atualização)."),
  heading2("9.1 O que o painel mostra"),
  simpleTable(
    ["Item", "O que é"],
    [
      ["Faturamento bruto", "Vendas de cartelas somadas aos patrocínios"],
      ["Cartelas pagas / Ticket médio", "Quantas foram pagas (e a % das geradas) e o valor médio por cartela"],
      ["Pico de vendas", "O horário com mais dinheiro entrando"],
      ["PIX e Dinheiro", "Quanto entrou em cada forma de pagamento"],
      ["Pedras sorteadas / Prêmios entregues", "Andamento do jogo"],
      ["Linha do tempo de vendas", "Barras com as vendas do PDV e os acertos da tesouraria, e a linha do total acumulado"],
      ["Vendas por voluntário", "Valor e quantidade por pessoa"],
      ["Tipo de cartela e Vendas por preço praticado", "Quina contra Cheia, e o efeito das fases de preço"],
      ["Estoque de cartelas", "Livres, com voluntários, pagas e bloqueadas"],
      ["Exposição dos patrocinadores", "Quantas pedras cada patrocinador ofereceu"],
      ["Prestação de contas por voluntário", "Tabela com PIX, dinheiro, total e cartelas ainda na mão"],
    ],
    [3500, 5526]
  ),
  space(),
  warningNote("A linha do tempo mostra o que o sistema registra com horário. O PDV registra cada venda na hora, mas cartelas vendidas em papel só ganham horário no momento do acerto da tesouraria: elas aparecem como “acerto” (barra laranja), e não como venda."),
  space(),
  body("Se aparecer o aviso Conferência necessária, o total das cartelas pagas está diferente do total dos pagamentos lançados. Isso costuma acontecer com cartelas marcadas como pagas sem lançamento (modo demonstração) ou com preço alterado depois das vendas. Abra o Fechamento de Caixa para ver o detalhe."),
  space(),
  heading2("9.2 Ranking de vendedores (só o administrador vê)"),
  body("Abaixo dos indicadores há o ranking, com o pódio (1º, 2º e 3º) e a lista dos demais. Você pode ordenar por valor vendido ou por cartelas vendidas. Conta tudo o que foi creditado ao voluntário, tanto as vendas do PDV quanto as cartelas acertadas na tesouraria."),
  ...bullets([
    "Os voluntários não veem o ranking, e não há metas: o objetivo é só o administrador reconhecer quem se destacou, por exemplo com uma prenda.",
    "Em Imprimir ranking, a folha vem com uma linha “Prenda” para você anunciar no evento.",
    "Empate divide a posição (1º, 1º, 3º).",
  ]),
  space(),
  heading2("9.3 Documentos para imprimir"),
  body("A faixa Imprimir, no topo do painel, abre cada documento em uma nova aba. Use o botão IMPRIMIR PDF de cada um."),
  simpleTable(
    ["Documento", "Para que serve"],
    [
      ["Fechamento de Caixa", "O relatório formal do evento: espelho de caixa, PIX e dinheiro, vendas por tipo de cartela, patrocínios e prestação de contas por voluntário. É o documento que o tesoureiro assina."],
      ["Extrato por Voluntário", "Uma folha por voluntário: cartelas vendidas (por preço), cartelas ainda com ele e linhas para as assinaturas. Também serve como recibo na entrega."],
      ["Cartelas por ID", "Situação de cada cartela, busca por código e bloqueio de cartela perdida"],
      ["Relatório de Patrocinadores", "A prova de entrega para cada patrocinador (veja abaixo)"],
      ["Ranking", "O pódio e a lista de vendedores, com a linha da prenda"],
      ["Auditoria", "Quem fez o quê, e quando (capítulo 11)"],
    ],
    [3000, 6026]
  ),
  space(),
  heading2("9.4 Relatório de Patrocinadores"),
  body("É a prova de entrega que você mostra a cada patrocinador. Para cada um, mostra:"),
  ...bullets([
    "As pedras oferecidas e a porcentagem do total.",
    "O tempo em tela, que é uma estimativa: soma o intervalo até a próxima pedra, com teto de 2 minutos por pedra, e pressupõe o telão ligado durante o sorteio.",
    "Os prêmios oferecidos e quantos já foram entregues, e a cota de patrocínio.",
  ]),
  body("Cada patrocinador tem o link Versão para o patrocinador, que mostra só os números dele, para você imprimir e entregar sem expor os dos outros."),
  warningNote("O registro de exposição começa a valer nos sorteios feitos a partir da atualização que o criou. Eventos sorteados antes não têm esse registro, e ele não pode ser reconstruído depois."),
  pageBreak(),

  // ── 10. ENCERRANDO ────────────────────────────────────────────────────────
  heading1("10. Encerrando o Evento"),
  heading2("10.1 Ordem recomendada"),
  ...numberedList([
    "Termine o sorteio e encerre a última rodada.",
    "Recolha as cartelas não vendidas de cada voluntário (Devolver).",
    "Faça o acerto de cada voluntário (Receber) e imprima o Extrato por Voluntário para assinar.",
    "Confira em Cartelas por ID se não restam cartelas na mão de ninguém.",
    "Abra Fechar Caixa Definitivo, no Centro de Comando. Isso abre o relatório de fechamento: confira o total e imprima (IMPRIMIR PDF).",
    "No Painel principal, no card do evento ativo, toque em Encerrar Evento e confirme.",
  ]),
  space(),
  dangerNote("Encerrar o evento fecha o caixa: o PDV deixa de aceitar vendas e uma venda não pode mais ser desfeita. Faça isso por último, depois de conferir tudo."),
  space(),
  heading2("10.2 O que acontece ao encerrar"),
  ...bullets([
    "O evento passa a Encerrado e o PDV fecha imediatamente.",
    "O sistema gera o relatório final, com a receita total, a quantidade de cartelas e o resultado por forma de pagamento e por voluntário.",
    "Os relatórios continuam disponíveis para consulta e impressão.",
    "O encerramento fica registrado na auditoria.",
  ]),
  space(),
  heading2("10.3 O modo demonstração"),
  body("O botão Validar Todas (Demo) marca todas as cartelas livres como pagas, com valor zero, e serve só para testar o fluxo do bingo e do fiscal antes do evento."),
  dangerNote("Nunca use o modo demonstração em um evento real. Ele só funciona em um evento que ainda não teve nenhuma venda nem pagamento, e as cartelas marcadas como pagas ficam sem lançamento no caixa."),
  pageBreak(),

  // ── 11. AUDITORIA E SEGURANÇA ─────────────────────────────────────────────
  heading1("11. Auditoria e Segurança"),
  heading2("11.1 O log de auditoria"),
  body("O sistema registra as ações importantes: quem fez, quando e os dados da ação. Abra pelo Painel de Resultados, em Auditoria. Só o administrador acessa."),
  simpleTable(
    ["Categoria", "O que é registrado"],
    [
      ["Dinheiro", "Pagamentos registrados na tesouraria, vendas desfeitas, fases de preço criadas ou apagadas, mudança do preço padrão"],
      ["Cartelas", "Cartelas geradas, entregues e recolhidas, trocas entre voluntários, cartelas bloqueadas e desbloqueadas"],
      ["Sorteio e ganhadores", "Aviso de bingo, bingo solto no telão, falso alarme, rodada encerrada, globo zerado"],
      ["Evento", "Encerramento e modo demonstração"],
    ],
    [3000, 6026]
  ),
  space(),
  body("As linhas em destaque amarelo (filtro Merece atenção) são ações que pedem um olhar do administrador: vendas desfeitas, bloqueios, falsos alarmes, reset do globo e encerramento. Cada linha é escrita em português, por exemplo: “Recebeu de Maria o acerto de 38 cartelas: R$ 380,00 (preço: Pré-venda)”."),
  warningNote("O log só registra ações feitas depois desta atualização do sistema. Eventos anteriores não têm histórico, e ele não pode ser reconstruído."),
  space(),
  heading2("11.2 Boas práticas"),
  ...bullets([
    "Cada pessoa usa o seu próprio usuário e PIN. Nunca compartilhe credenciais: o log registra quem fez cada ação.",
    "Troque o PIN de quem saiu da equipe ou perdeu o aparelho (Resetar PIN).",
    "Use senhas fortes para o administrador e não as repita em outros sites.",
    "Dê a cada voluntário só a permissão de que ele precisa.",
    "Bloqueie imediatamente uma cartela perdida.",
    "Confira o Extrato por Voluntário em cada acerto, com assinatura.",
    "Revise a Auditoria (filtro Merece atenção) ao fim do evento.",
  ]),
  pageBreak(),

  // ── 12. CHECKLIST ─────────────────────────────────────────────────────────
  heading1("12. Checklist do Evento"),
  heading2("12.1 Semanas antes"),
  ...bullets([
    "Criar o evento e definir os preços padrão (quina e cartela cheia).",
    "Cadastrar as Fases de Preço, se for usar.",
    "Informar a chave PIX.",
    "Cadastrar os patrocinadores (nome e logo) e montar as rodadas, com a ordem dos prêmios.",
    "Cadastrar os voluntários, ligá-los ao evento e dar as permissões (Vender, Palco, Fiscal).",
    "Gerar as cartelas de cada tipo, com folga, e imprimir cada tipo separado.",
    "Combinar quem será o locutor, os fiscais e o tesoureiro.",
  ]),
  heading2("12.2 Na véspera"),
  ...bullets([
    "Testar o PDV, o leitor de QR, o telão e o Verificador no local, com a internet do salão.",
    "Ter uma conexão reserva (hotspot de celular ou roteador 4G).",
    "Conferir se cada voluntário consegue entrar com o próprio usuário e PIN.",
    "Entregar as cartelas de papel aos voluntários que vão vender fora do caixa (Tesouraria, Entregar).",
  ]),
  heading2("12.3 No dia"),
  ...bullets([
    "Ativar o evento (Evento Ativo).",
    "Abrir o telão e a Mesa do Locutor e conferir o rodapé dos patrocinadores.",
    "Acompanhar o Painel de Resultados e o aviso de estoque baixo dos voluntários.",
    "Durante o sorteio: anunciar o patrocinador da próxima pedra e conferir cada bingo com o Fiscal.",
  ]),
  heading2("12.4 Depois do evento"),
  ...bullets([
    "Seguir a ordem do capítulo 10: devolver, receber, extrato, conferir, fechar caixa, encerrar.",
    "Imprimir e guardar o Fechamento de Caixa, os extratos assinados e o ranking.",
    "Entregar a cada patrocinador a sua Versão para o patrocinador.",
    "Revisar a Auditoria (Merece atenção).",
  ]),
  pageBreak(),

  // ── 13. FAQ ───────────────────────────────────────────────────────────────
  heading1("13. Perguntas Frequentes e Solução de Problemas"),
  heading2("13.1 Perguntas frequentes"),

  heading3("Como faço se um voluntário esquecer o PIN?"),
  body("Na Central de Voluntários, ache o voluntário e toque em Resetar PIN. O novo PIN aparece na tela, e o antigo deixa de valer."),
  heading3("Posso ter dois eventos ativos ao mesmo tempo?"),
  body("Não. Só um evento fica ativo por vez. Ao ativar um, o anterior volta para Inativo."),
  heading3("A internet caiu durante o sorteio. E agora?"),
  body("As pedras já sorteadas ficam salvas. O telão mantém o último estado e o sorteio e as vendas só voltam quando a internet voltar. Por isso recomendamos uma conexão reserva. O sistema não funciona sem internet."),
  heading3("Posso mudar o preço no meio do evento?"),
  body("Sim, e o jeito certo é usar as Fases de Preço. Cartelas já vendidas nunca mudam de preço."),
  heading3("Uma cartela de Quina pode ganhar o prêmio da Cartela Cheia?"),
  body("Não. Cada tipo só concorre aos prêmios do mesmo tipo. Cartelas antigas, de eventos anteriores aos tipos, valem para os dois."),
  heading3("Perdi uma cartela. O que faço?"),
  body("Busque o código em Cartelas por ID e toque em Bloquear. Ela deixa de poder ser vendida e premiada."),
  heading3("Errei uma venda no PDV."),
  body("Toque em Errei: desfazer esta venda, em até 10 minutos. Passado esse prazo, o administrador corrige."),
  heading3("Vendi uma cartela em papel e o fiscal diz “CARTELA NÃO PAGA”."),
  body("Falta dar baixa na tesouraria. Cartelas vendidas em papel só ficam pagas depois do acerto (Receber). Cartelas vendidas pelo PDV já ficam pagas na hora."),
  heading3("O sistema confirma pagamentos PIX sozinho?"),
  body("Não. O voluntário confere o recebimento no aplicativo do banco e confirma a venda no PDV."),
  heading3("Posso imprimir cartelas antes de ativar o evento?"),
  body("Sim. A impressão pode ser feita a qualquer momento depois de gerar as cartelas."),
  heading3("Como adiciono um patrocinador com prêmio?"),
  body("Em Gestão de Rodadas, cadastre o patrocinador e depois crie a rodada escolhendo-o como quem oferece o prêmio. O nome e o logo dele aparecem no telão, no prêmio da rodada e na comemoração do ganhador."),
  space(),

  heading2("13.2 Solução de problemas"),
  simpleTable(
    ["Problema", "Causa provável", "O que fazer"],
    [
      ["“Credenciais inválidas”", "Usuário ou PIN errado, ou bloqueio por muitas tentativas", "Confira os dados; se persistir, espere cerca de 15 minutos ou peça Resetar PIN"],
      ["PDV mostra “Nenhum evento ativo”", "O evento está Inativo", "O administrador ativa o evento"],
      ["A lista de vendedores da Tesouraria está vazia", "Faltam a permissão Vender (PDV) e a ligação ao evento", "Central de Voluntários, Gerenciar Eventos, marcar Vender (PDV)"],
      ["A câmera não abre", "Permissão negada no navegador", "Libere a câmera nas configurações do site e tente de novo"],
      ["Telão sem número ou parado", "Janela sem internet ou aberta no evento errado", "Atualize a página (F5) e confira a conexão"],
      ["Não consigo gerar cartelas de Cartela Cheia", "O preço da cartela cheia não foi definido", "Defina o preço (padrão ou em uma fase) e tente de novo"],
      ["“Seu plano não tem mais eventos disponíveis”", "O plano chegou ao limite de eventos", "Fale com o suporte pelo WhatsApp para renovar ou ampliar"],
      ["Aviso “Conferência necessária” no relatório", "Cartelas pagas sem lançamento, ou preço alterado depois das vendas", "Veja o Fechamento de Caixa; evite o modo demonstração em evento real"],
    ],
    [2900, 3000, 3126]
  ),
  space(),
  heading2("13.3 Suporte"),
  body("Em caso de dúvida ou problema, fale com o suporte pelo WhatsApp indicado no site acaoleve.dev.br."),
  pageBreak(),

  // ── 14. REFERÊNCIA RÁPIDA ─────────────────────────────────────────────────
  heading1("14. Referência Rápida"),
  heading2("14.1 Quem pode fazer o quê"),
  simpleTable(
    ["Ação", "Administrador", "Vender (PDV)", "Palco", "Fiscal"],
    [
      ["Definir preços, fases, prêmios e patrocinadores", "Sim", "Não", "Não", "Não"],
      ["Gerar e imprimir cartelas", "Sim", "Não", "Não", "Não"],
      ["Tesouraria (entregar, devolver, receber)", "Sim", "Não", "Não", "Não"],
      ["Vender no PDV e desfazer a própria venda", "Não*", "Sim", "Não", "Não"],
      ["Pedir e liberar cartelas entre voluntários", "Não", "Sim", "Não", "Não"],
      ["Sortear, soltar o telão, encerrar rodada", "Sim", "Não", "Sim", "Não"],
      ["Conferir um bingo e avisar o locutor", "Sim", "Não", "Não", "Sim"],
      ["Painel, relatórios, ranking e auditoria", "Sim", "Não", "Não", "Não"],
      ["Bloquear cartela perdida", "Sim", "Não", "Não", "Não"],
    ],
    [3226, 1800, 1400, 1100, 1500]
  ),
  body("* Para vender, o administrador também precisa estar ligado ao evento como vendedor (Vender (PDV))."),
  space(),
  heading2("14.2 Glossário"),
  simpleTable(
    ["Termo", "Significado"],
    [
      ["Quina", "Linha completa na cartela (linha, coluna ou diagonal)"],
      ["Cartela Cheia", "Todos os números da cartela sorteados"],
      ["Fábrica (estoque livre)", "Cartelas geradas que ainda não foram entregues a ninguém"],
      ["Na mão / No Bolso", "Cartelas entregues a um voluntário e ainda não pagas"],
      ["Acerto", "Dar baixa e receber o dinheiro das cartelas vendidas em papel"],
      ["Fase de preço", "Período com preços próprios (pré-venda, perto do evento, no evento)"],
      ["Pedra patrocinada", "Cada pedra sorteada é “oferecida por” um patrocinador, em rodízio"],
      ["Bloqueada", "Cartela dada como perdida ou cancelada"],
      ["Telão", "A tela grande do projetor ou da TV (/projector)"],
    ],
    [3000, 6026]
  ),
  space(),
];

// ─────────────────────────────────────────────────────────────────────────────
// BUILD DO DOCUMENTO
// ─────────────────────────────────────────────────────────────────────────────
// Uma configuração de numeração por lista (instâncias), para a contagem recomeçar em 1 em cada lista.
const numberLevels = [{
  level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: 720, hanging: 360 } } },
}];

const doc = new Document({
  creator: "Ação Leve",
  title: "Manual do Usuário — Seu Evento",
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
      { reference: "numbers", levels: numberLevels },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: C.slate800 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.dark }, paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.green }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.slate800 }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [makeCoverSection(), makeContentSection(content)],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(SAIDA, buffer);
  console.log(`Manual do Usuário v${VERSAO_NUM} gerado:`, SAIDA);
}).catch((e) => {
  console.error("Erro ao gerar o manual:", e);
  process.exit(1);
});
