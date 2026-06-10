const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, LevelFormat, PageNumber, PageBreak, VerticalAlign,
  ExternalHyperlink, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// PALETA DE CORES
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  green: "1A7A4A",        // verde escuro
  greenLight: "D1FAE5",   // verde claro
  greenMid: "4ADE80",     // verde médio
  dark: "0B0F14",         // fundo escuro do app
  slate800: "1E293B",
  slate700: "334155",
  slate400: "94A3B8",
  white: "FFFFFF",
  amber: "D97706",
  amberLight: "FEF3C7",
  red: "DC2626",
  redLight: "FEE2E2",
  blueLight: "EFF6FF",
  blue: "2563EB",
  black: "000000",
  gray100: "F3F4F6",
  gray200: "E5E7EB",
  gray600: "4B5563",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: C.gray200 };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Arial", color: C.dark })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.green, space: 4 } },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: C.green })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
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
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [9026],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
              bottom: noBorder,
              left: { style: BorderStyle.SINGLE, size: 12, color: borderColor },
              right: noBorder,
            },
            shading: { fill: color, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            width: { size: 9026, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", color: C.slate800 })] })],
          }),
        ],
      }),
    ],
  });
}

function warningNote(text) {
  return note("⚠️  " + text, C.amberLight, C.amber);
}

function dangerNote(text) {
  return note("🔴  " + text, C.redLight, C.red);
}

function infoNote(text) {
  return note("ℹ️  " + text, C.blueLight, C.blue);
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: C.slate800 })],
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: C.slate800 })],
  });
}

function space(before = 160) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [new TextRun("")] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function tableHeader(cells, widths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text, i) =>
      new TableCell({
        borders,
        shading: { fill: C.slate800, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 150, right: 150 },
        width: { size: widths[i], type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, font: "Arial", color: C.white })],
        })],
      })
    ),
  });
}

function tableRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((text, i) =>
      new TableCell({
        borders,
        shading: { fill: shade ? C.gray100 : C.white, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 150, right: 150 },
        width: { size: widths[i], type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text: String(text), size: 20, font: "Arial", color: C.slate800 })],
        })],
      })
    ),
  });
}

function simpleTable(headers, rows, widths) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      tableHeader(headers, widths),
      ...rows.map((r, i) => tableRow(r, widths, i % 2 === 0)),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPA
// ─────────────────────────────────────────────────────────────────────────────
function makeCoverSection() {
  return {
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 2880, right: 1800, bottom: 1440, left: 1800 },
      },
    },
    headers: { default: new Header({ children: [] }) },
    footers: { default: new Footer({ children: [] }) },
    children: [
      new Table({
        width: { size: 8306, type: WidthType.DXA },
        columnWidths: [8306],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: noBorders,
                shading: { fill: C.dark, type: ShadingType.CLEAR },
                margins: { top: 800, bottom: 800, left: 600, right: 600 },
                width: { size: 8306, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 160 },
                    children: [new TextRun({ text: "🎱", size: 96, font: "Segoe UI Emoji" })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 120 },
                    children: [new TextRun({ text: "SEU EVENTO", bold: true, size: 64, font: "Arial", color: C.greenMid })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 40 },
                    children: [new TextRun({ text: "Plataforma de Bingo Digital", size: 32, font: "Arial", color: C.slate400 })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0 },
                    children: [new TextRun({ text: "acaoleve.dev.br", size: 24, font: "Courier New", color: C.greenMid })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      space(400),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "MANUAL DO USUÁRIO", bold: true, size: 40, font: "Arial", color: C.dark })],
      }),
      space(80),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Guia Completo para Organizadores de Eventos e Equipe", size: 24, font: "Arial", color: C.slate400 })],
      }),
      space(400),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.gray200, space: 4 } },
        spacing: { before: 200 },
        children: [new TextRun({ text: "Versão 1.0  •  Junho de 2026", size: 20, font: "Arial", color: C.slate400 })],
      }),
      pageBreak(),
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO DE CONTEÚDO (com cabeçalho e rodapé)
// ─────────────────────────────────────────────────────────────────────────────
function makeContentSection(children) {
  return {
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gray200, space: 2 } },
            children: [
              new TextRun({ text: "SEU EVENTO · Manual do Usuário", size: 18, font: "Arial", color: C.slate400 }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.gray200, space: 2 } },
            children: [
              new TextRun({ text: "Página ", size: 18, font: "Arial", color: C.slate400 }),
              new PageNumber(),
              new TextRun({ text: "  •  acaoleve.dev.br", size: 18, font: "Arial", color: C.slate400 }),
            ],
          }),
        ],
      }),
    },
    children,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEÚDO DO MANUAL
// ─────────────────────────────────────────────────────────────────────────────
const content = [

  // ── CAPÍTULO 1: VISÃO GERAL ──────────────────────────────────────────────
  heading1("1. Visão Geral da Plataforma"),
  body("O Seu Evento é um sistema SaaS (Software como Serviço) de bingo digital. Ele permite que organizações realizem eventos de bingo de forma profissional, com controle de cartelas, equipe, financeiro e telão ao vivo — tudo via navegador web."),
  space(),
  heading2("1.1 Como Funciona o Multi-Tenant"),
  body("A plataforma opera por subdomínios. Cada organização cliente recebe seu próprio ambiente isolado:"),
  space(80),
  simpleTable(
    ["Organização", "Endereço de Acesso", "Descrição"],
    [
      ["Acão Leve", "acaoleve.dev.br", "Plataforma principal (Super Admin)"],
      ["Associação XYZ", "xyz.acaoleve.dev.br", "Painel do cliente XYZ"],
      ["Igreja ABC", "igabc.acaoleve.dev.br", "Painel do cliente ABC"],
    ],
    [3200, 3200, 2626]
  ),
  space(),
  heading2("1.2 Perfis de Acesso"),
  body("Existem três perfis na plataforma, cada um com permissões distintas:"),
  space(80),
  simpleTable(
    ["Perfil", "Quem É", "O que Pode Fazer"],
    [
      ["Super Admin", "Dono da plataforma", "Gerenciar todos os clientes, criar tenants, ver GMV global"],
      ["Org Admin", "Dono do evento / Organização", "Criar eventos, gerenciar equipe, ver financeiro, sortear"],
      ["Staff", "Voluntário / Operador de caixa", "Vender cartelas, verificar cartelas (por permissão)"],
    ],
    [2000, 2500, 4526]
  ),
  space(),
  infoNote("A URL de login unificada é: acaoleve.dev.br/entrar — tanto admins quanto staff usam a mesma tela."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 2: PRIMEIRO ACESSO ──────────────────────────────────────────
  heading1("2. Primeiro Acesso"),
  heading2("2.1 Como Fazer Login"),
  numbered("Acesse acaoleve.dev.br/entrar no navegador."),
  numbered("No campo Identificação, insira seu e-mail (admins) ou nome de usuário (staff, ex: JOAOSIL)."),
  numbered("No campo Código de Acesso, insira sua senha ou PIN de 4 dígitos."),
  numbered("Clique em Entrar. O sistema detecta seu perfil e redireciona automaticamente."),
  space(),
  simpleTable(
    ["Perfil", "Credencial de Login", "Destino Após Login"],
    [
      ["Super Admin", "E-mail + senha", "acaoleve.dev.br/admin"],
      ["Org Admin", "E-mail + senha", "seusubdominio.acaoleve.dev.br/dashboard"],
      ["Staff", "Username + PIN de 4 dígitos", "seusubdominio.acaoleve.dev.br/vendas"],
    ],
    [2000, 3000, 4026]
  ),
  space(),
  warningNote("Se aparecer a mensagem 'Credenciais inválidas', verifique o Caps Lock. O username do Staff é sempre em maiúsculas."),
  space(),
  heading2("2.2 Proteção Contra Força Bruta"),
  body("O sistema bloqueia automaticamente o login após 5 tentativas erradas em 15 minutos. Se isso acontecer, aguarde 15 minutos ou contate o administrador para reset de senha."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 3: PAINEL DO ORGANIZADOR ────────────────────────────────────
  heading1("3. Painel do Organizador (Org Admin)"),
  body("Após o login, o Org Admin é direcionado ao painel principal em /dashboard, que exibe os KPIs da organização."),
  space(),
  heading2("3.1 Tela Inicial do Dashboard"),
  body("O dashboard mostra três indicadores principais:"),
  bullet("Total de Eventos: número total de eventos criados na organização."),
  bullet("Eventos Ativos: eventos com status ACTIVE no momento."),
  bullet("Voluntários: total de membros de equipe (Staff) cadastrados."),
  space(),
  heading2("3.2 Criando um Novo Evento"),
  numbered("No dashboard, clique no botão + Novo Evento."),
  numbered("Digite o nome do evento (ex: Bingo de Natal 2026) e confirme."),
  numbered("O evento é criado com status RASCUNHO. Você pode configurá-lo antes de ativar."),
  space(),
  heading2("3.3 Configurando o Evento (Wizard de Configuração)"),
  body("Ao entrar em um evento, você encontrará um painel com várias seções de configuração:"),
  space(80),
  simpleTable(
    ["Seção", "O que Configura"],
    [
      ["Preço da Cartela", "Valor em reais de cada cartela. Usado no PDV e relatórios."],
      ["Chave PIX", "Chave PIX do recebedor para gerar QR Codes no PDV."],
      ["Patrocinadores", "Logos e nomes dos patrocinadores exibidos no telão."],
      ["Prêmios / Rodadas", "Tipo de prêmio (Quina ou Cartela Cheia) e nome do prêmio."],
      ["Equipe", "Criar voluntários e definir permissões por evento."],
      ["Estoque", "Distribuir cartelas aos voluntários para venda."],
    ],
    [2800, 6226]
  ),
  space(),
  heading2("3.4 Gerando Cartelas"),
  numbered("No painel do evento, localize o botão Gerar Cartelas."),
  numbered("Informe a quantidade desejada (ex: 200 cartelas)."),
  numbered("O sistema gera cartelas únicas com matrizes B-I-N-G-O aleatórias e IDs curtos (ex: ABC123)."),
  space(),
  warningNote("Gere sempre um número maior do que o previsto de participantes. Cartelas não vendidas não impactam o financeiro."),
  space(),
  heading2("3.5 Status dos Eventos"),
  simpleTable(
    ["Status", "Significado", "PDV (Caixa)"],
    [
      ["RASCUNHO", "Evento criado, ainda em configuração", "Fechado"],
      ["ATIVO", "Evento em andamento — sorteio liberado", "Aberto"],
      ["ENCERRADO", "Evento finalizado — relatório gerado", "Fechado"],
    ],
    [2200, 4326, 2500]
  ),
  space(),
  infoNote("Apenas um evento pode estar ATIVO por vez. Ao ativar um evento, os demais são automaticamente movidos para RASCUNHO."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 4: GERENCIAMENTO DE EQUIPE ──────────────────────────────────
  heading1("4. Gerenciamento de Equipe"),
  heading2("4.1 Criando um Voluntário"),
  numbered("Acesse o painel do evento e vá em Equipe."),
  numbered("Clique em + Novo Membro."),
  numbered("Informe o nome completo do voluntário."),
  numbered("Defina as permissões: Vendedor, Operador e/ou Fiscal."),
  numbered("O sistema gera automaticamente: Username (ex: JOAOSIL) e PIN de 4 dígitos."),
  numbered("Anote e entregue as credenciais ao voluntário."),
  space(),
  simpleTable(
    ["Permissão", "O que Libera"],
    [
      ["Vendedor (canSell)", "Acesso ao PDV para vender cartelas"],
      ["Operador (canOperate)", "Controle do sorteio e jogo ao vivo (tela Live)"],
      ["Fiscal (canVerify)", "Scanner de QR Code para verificar cartelas premiadas"],
    ],
    [3500, 5526]
  ),
  space(),
  heading2("4.2 Distribuindo Cartelas (Estoque)"),
  body("Para que um voluntário possa vender, ele precisa ter cartelas atribuídas ao seu estoque:"),
  numbered("No painel de equipe, localize o voluntário."),
  numbered("Clique em Entregar Cartelas e informe a quantidade."),
  numbered("O voluntário receberá aquelas cartelas em seu PDV."),
  numbered("Cartelas não vendidas podem ser devolvidas ao estoque central com o botão Devolver."),
  space(),
  heading2("4.3 Resetando o PIN de um Voluntário"),
  numbered("Acesse Equipe no painel do evento."),
  numbered("Localize o voluntário e clique em Resetar PIN."),
  numbered("Um novo PIN de 4 dígitos é gerado. Informe-o ao voluntário."),
  space(),
  warningNote("O PIN anterior é invalidado imediatamente. O voluntário não consegue mais logar com o PIN antigo."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 5: PDV (PONTO DE VENDA) ─────────────────────────────────────
  heading1("5. PDV — Ponto de Venda (Tela do Voluntário)"),
  body("Esta é a tela que o voluntário utiliza para registrar a venda de cartelas. Acessível em: seusubdominio.acaoleve.dev.br/vendas"),
  space(),
  heading2("5.1 Fluxo de Venda"),
  numbered("O voluntário faz login com seu Username e PIN."),
  numbered("Na tela Frente de Caixa, seleciona seu próprio nome."),
  numbered("Digita ou escaneia o ID da cartela (ex: ABC123) e pressiona Enter."),
  numbered("Repete para todas as cartelas da venda (carrinho)."),
  numbered("Seleciona a forma de pagamento: Dinheiro, Cartão ou PIX."),
  numbered("Se PIX: um QR Code é exibido com a chave PIX configurada. Aguarda confirmação."),
  numbered("Confirma a venda. As cartelas são marcadas como pagas no sistema."),
  space(),
  infoNote("O PDV aceita múltiplas cartelas em uma só operação (venda em lote). Ideal para acelerar filas grandes."),
  space(),
  heading2("5.2 Pagamento via PIX"),
  body("Ao escolher PIX, o sistema exibe um QR Code gerado a partir da chave PIX cadastrada no evento. O voluntário mostra o QR Code ao comprador, que efetua o pagamento pelo app bancário. A confirmação é manual — o voluntário clica Confirmar quando o pagamento for recebido."),
  space(),
  warningNote("O sistema não confirma o PIX automaticamente. O voluntário é responsável por verificar o recebimento antes de confirmar a venda."),
  space(),
  heading2("5.3 Verificação de Cartela (Fiscal)"),
  body("Voluntários com permissão de Fiscal podem acessar a tela de verificação em /verify para escanear o QR Code de uma cartela e confirmar se ela está registrada e paga no sistema."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 6: SORTEIO AO VIVO ──────────────────────────────────────────
  heading1("6. Conduzindo o Sorteio ao Vivo"),
  body("O sorteio é realizado pelo Org Admin ou por voluntário com permissão de Operador, na tela ao vivo em: seusubdominio.acaoleve.dev.br/live"),
  space(),
  heading2("6.1 Interface de Sorteio"),
  body("A tela de sorteio contém:"),
  bullet("Bola Grande: exibe o número sorteado com animação giratória (ex: G-54)."),
  bullet("Painel B-I-N-G-O: grade 5×75 mostrando todos os números, destacando os sorteados."),
  bullet("Ranking de Cartelas Próximas: lista as 10 cartelas mais próximas de ganhar."),
  bullet("Botão SORTEAR: sorteia o próximo número. Usa transação atômica no banco (sem duplicatas)."),
  bullet("Botão TELÃO: abre/fecha o painel visual para o projetor."),
  bullet("Auditoria: campo para buscar qualquer cartela pelo ID e ver sua situação."),
  space(),
  heading2("6.2 Passo a Passo do Sorteio"),
  numbered("Ative o evento no dashboard (status ATIVO)."),
  numbered("Abra a tela /live em um dispositivo. Abra /projector em outro (telão)."),
  numbered("Pressione SORTEAR para cada número. O telão atualiza em tempo real (a cada 1,5s)."),
  numbered("Quando alguém gritar BINGO!, use a busca de auditoria para verificar a cartela."),
  numbered("Clique em Bingo Confirmado para acionar a celebração no telão."),
  numbered("Depois, clique em Próximo Prêmio para avançar para a próxima rodada."),
  space(),
  warningNote("Nunca feche a tela /live durante o sorteio. Abra o /projector em uma aba ou dispositivo separado."),
  space(),
  heading2("6.3 Telão (Projector View)"),
  body("Acessível em /projector, esta tela é otimizada para projetores e TVs grandes. Exibe:"),
  bullet("O número sorteado em destaque."),
  bullet("Todo o histórico de números na grade B-I-N-G-O."),
  bullet("O prêmio atual da rodada e os logos dos patrocinadores."),
  bullet("Animação de confetes e celebração quando o bingo é confirmado."),
  space(),
  infoNote("O telão atualiza automaticamente a cada 1,5 segundo. Não é necessário nenhuma interação."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 7: IMPRESSÃO DE CARTELAS ────────────────────────────────────
  heading1("7. Impressão de Cartelas"),
  body("Cartelas podem ser impressas para distribuição física em: seusubdominio.acaoleve.dev.br/print"),
  space(),
  heading2("7.1 Layouts Disponíveis"),
  simpleTable(
    ["Layout", "Formato", "Cartelas por Página", "Uso Recomendado"],
    [
      ["a4-4", "A4", "4 (2×2)", "Uso geral — equilibra tamanho e quantidade"],
      ["a4-2", "A4", "2 (1×2)", "Cartelas maiores, mais fáceis de marcar"],
      ["a4-1", "A4", "1 (premium)", "Eventos especiais, patrocinadores grandes"],
      ["a4-6", "A4", "6 (3×2)", "Maior economia de papel"],
      ["a6", "A6", "1", "Gráfica — impressão em tamanho cartão"],
    ],
    [1400, 1200, 2400, 3826]
  ),
  space(),
  heading2("7.2 Como Imprimir"),
  numbered("Acesse /print no subdomínio do evento."),
  numbered("Selecione o layout desejado no menu."),
  numbered("Clique em Imprimir / Salvar PDF."),
  numbered("Na caixa de diálogo do navegador, escolha a impressora ou salve como PDF."),
  space(),
  body("Cada cartela impressa contém:"),
  bullet("Grade B-I-N-G-O com os números únicos da cartela."),
  bullet("ID curto da cartela (ex: ABC123) para uso no PDV."),
  bullet("QR Code para verificação rápida pelo fiscal."),
  bullet("Logo e nome dos patrocinadores do evento."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 8: FINANCEIRO ────────────────────────────────────────────────
  heading1("8. Financeiro e Relatórios"),
  heading2("8.1 Dashboard Financeiro"),
  body("Acessível em /dashboard/[eventId]/finance, exibe em tempo real:"),
  bullet("Receita Total: soma de todas as transações confirmadas."),
  bullet("Breakdown por Método: quanto foi recebido em Dinheiro, Cartão e PIX."),
  bullet("Ranking de Vendedores: quem vendeu mais e o valor total por voluntário."),
  space(),
  heading2("8.2 Tesouraria"),
  body("A tela de Tesouraria (/tesouraria) permite ao administrador ver o saldo de cada voluntário, confirmando os repasses. Útil para a prestação de contas no final do evento."),
  space(),
  heading2("8.3 Encerramento do Evento"),
  body("Ao clicar em Encerrar Evento, o sistema:"),
  numbered("Muda o status para ENCERRADO e fecha o PDV imediatamente."),
  numbered("Gera um relatório final com: receita total, cartelas vendidas, breakdown por método e ranking de voluntários."),
  numbered("O relatório pode ser visualizado em /relatorio e impresso."),
  space(),
  warningNote("O encerramento é irreversível para fins de caixa. O evento pode continuar visível mas o PDV não aceita mais vendas."),
  space(),
  heading2("8.4 Modo Demonstração"),
  body("O botão Ativar Modo Demo marca todas as cartelas não vendidas como pagas com valor zero. Útil para testes e demonstrações. As transações de demo não aparecem no financeiro real."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 9: CARTELAS DIGITAIS ────────────────────────────────────────
  heading1("9. Cartelas Digitais"),
  body("Cada cartela tem uma versão digital acessível pelo participante em: seusubdominio.acaoleve.dev.br/cartela/[ID]"),
  space(),
  body("Na cartela digital, o participante pode:"),
  bullet("Visualizar sua cartela com os números destacados conforme o sorteio progride."),
  bullet("Ver em tempo real quais números já foram sorteados."),
  bullet("Acompanhar quantos números faltam para ganhar."),
  space(),
  body("O link da cartela digital fica embutido no QR Code impresso em cada cartela física. O participante pode escanear o QR Code para acessar sua versão digital simultaneamente."),
  space(),
  pageBreak(),

  // ── CAPÍTULO 10: FAQ DO USUÁRIO ───────────────────────────────────────────
  heading1("10. Perguntas Frequentes"),
  space(),

  heading3("Como faço se um voluntário esquecer o PIN?"),
  body("Acesse o painel do evento, vá em Equipe, localize o voluntário e clique em Resetar PIN. O novo PIN será exibido na tela."),
  space(120),

  heading3("Posso ter dois eventos simultâneos?"),
  body("Não. A plataforma permite apenas um evento ATIVO por organização por vez. Se ativar um segundo evento, o anterior volta automaticamente para RASCUNHO."),
  space(120),

  heading3("O que acontece se o internet cair durante o sorteio?"),
  body("Os números já sorteados ficam salvos no banco. Ao reconectar, o telão e a tela ao vivo se atualizam automaticamente. Nenhum número é perdido."),
  space(120),

  heading3("Como adicionar patrocinadores com prêmios?"),
  body("No painel do evento, acesse a seção Patrocinadores. Ao adicionar um patrocinador, é possível criar uma rodada de prêmio vinculada. O logo do patrocinador aparece no telão durante aquela rodada."),
  space(120),

  heading3("Posso imprimir cartelas antes de ativar o evento?"),
  body("Sim. A impressão pode ser feita a qualquer momento após a geração das cartelas, independente do status do evento."),
  space(120),

  heading3("Como saber se uma cartela foi realmente paga?"),
  body("Use a tela de Verificação (/verify) com a câmera do celular para escanear o QR Code da cartela. O sistema indica se está paga, não paga ou não encontrada."),
  space(120),

  heading3("O sistema confirma pagamentos PIX automaticamente?"),
  body("Não. A confirmação do PIX é manual. O voluntário deve verificar o recebimento no aplicativo bancário e então confirmar a venda no PDV."),
  space(),
];

// ─────────────────────────────────────────────────────────────────────────────
// BUILD DO DOCUMENTO
// ─────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: C.slate800 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.dark },
        paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.green },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.slate800 },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    makeCoverSection(),
    makeContentSection(content),
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/mnt/user-data/outputs/Manual_Usuario_SeuEvento.docx", buffer);
  console.log("✅ Manual do Usuário gerado com sucesso!");
}).catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});