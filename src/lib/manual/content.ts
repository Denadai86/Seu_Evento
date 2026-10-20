// src/lib/manual/content.ts
//
// CONTEÚDO do manual dentro do sistema (central de ajuda). É a fonte principal do texto de ajuda.
//
// COMO ACRESCENTAR UM ASSUNTO: copie um item de TOPICS, troque o `id` (único, sem espaço ou acento),
// escreva título, resumo e passos curtos, escolha `category`, `icon` e `roles`, e liste `keywords`
// (as palavras que alguém digitaria para procurar isso). Os testes (pnpm test) conferem se tudo está coerente.
//
// REGRA: mudou uma tela ou uma regra do sistema? Atualize o assunto correspondente no mesmo commit.

import type { Category, CategoryId, IconKey, Topic } from "./types";

export const CATEGORIES: Category[] = [
  { id: "comecar", title: "Primeiros passos", description: "Entrar no sistema e se localizar" },
  { id: "vender", title: "Vender cartelas", description: "O dia a dia do caixa (PDV)" },
  { id: "tesouraria", title: "Tesouraria", description: "Entregar, recolher e receber cartelas" },
  { id: "sorteio", title: "Sorteio e bingo", description: "Mesa do locutor, telão e conferência" },
  { id: "evento", title: "Preparar o evento", description: "Preços, prêmios, equipe e cartelas" },
  { id: "conselho", title: "Fiscalização", description: "Auditoria e relatórios" },
  { id: "problemas", title: "Deu problema?", description: "Mensagens de erro e o que fazer" },
];

export const ICON_KEYS: IconKey[] = [
  "cart", "undo", "users", "package", "wallet", "ban", "scan", "mic", "settings", "alert", "shield", "key", "book",
];

export const TOPICS: Topic[] = [
  // ── PRIMEIROS PASSOS ───────────────────────────────────────────────────────
  {
    id: "acesso-entrar",
    title: "Entrar no sistema e esqueci o PIN",
    summary: "Use o seu usuário e o PIN de 6 dígitos. Esqueceu? O administrador gera um novo.",
    category: "comecar",
    icon: "key",
    roles: "todos",
    featured: true,
    keywords: ["entrar", "login", "senha", "pin", "usuario", "esqueci", "acesso", "bloqueado", "tentativas", "credenciais"],
    steps: [
      "Abra o endereço do seu evento e vá em Entrar.",
      "Em Identificação digite o seu usuário (por exemplo, JOAO1234) e, em Código de Acesso, o seu PIN de 6 dígitos. O administrador usa e-mail e senha.",
      "Toque em Entrar. O sistema leva você para a tela do seu papel.",
      "Esqueceu o PIN? Peça ao administrador: na Central de Voluntários ele toca em Resetar PIN e passa o novo. O PIN antigo deixa de valer na hora.",
    ],
    tips: ["O login não diferencia maiúsculas de minúsculas: joao1234 e JOAO1234 funcionam igual."],
    warnings: [
      "Depois de várias tentativas erradas o sistema bloqueia o login por cerca de 15 minutos. Se muita gente erra no mesmo Wi-Fi, o bloqueio pode afetar mais de uma pessoa: espere uns minutos.",
      "Nunca empreste o seu usuário e PIN. O sistema registra quem fez cada ação.",
    ],
    related: ["pdv-vender"],
  },

  // ── VENDER ─────────────────────────────────────────────────────────────────
  {
    id: "pdv-vender",
    title: "Vender cartelas no PDV",
    summary: "Digite ou leia o QR de cada cartela, escolha Dinheiro ou PIX e confirme.",
    category: "vender",
    icon: "cart",
    roles: ["vendedor"],
    featured: true,
    keywords: ["vender", "venda", "caixa", "pdv", "qr", "camera", "pix", "dinheiro", "carrinho", "cartela", "cobrar", "troco"],
    steps: [
      "Abra o PDV (menu de baixo: Vendas). O evento precisa estar Ativo.",
      "Digite o código da cartela em ID da Cartela, ou toque no ícone da câmera e aponte para o QR Code.",
      "A cartela entra no carrinho com o tipo e o preço (a cartela cheia tem o selo Cheia). Repita para cada cartela.",
      "Confira o Total a cobrar e escolha Dinheiro ou PIX.",
      "No PIX, mostre a chave ou o QR ao comprador, confira no aplicativo do banco que o dinheiro chegou e só então toque em Confirmar pagamento PIX.",
      "Confirme a venda. As cartelas ficam pagas e o valor entra no seu caixa.",
    ],
    tips: [
      "A câmera continua aberta para ler várias cartelas seguidas. Toque em Concluir quando terminar.",
      "O preço mostrado é o da fase de preço em vigor, definido pelo administrador. Se a fase mudar no meio da venda, o sistema recusa, atualiza o carrinho e avisa.",
    ],
    warnings: ["O sistema não confirma o PIX sozinho. Sempre confira o recebimento no aplicativo do banco."],
    related: ["pdv-desfazer", "pdv-pedir", "problema-nao-paga"],
  },
  {
    id: "pdv-desfazer",
    title: "Errei uma venda: desfazer",
    summary: "Você pode desfazer a sua última venda em até 10 minutos.",
    category: "vender",
    icon: "undo",
    roles: ["vendedor"],
    keywords: ["desfazer", "errei", "erro", "cancelar venda", "estornar", "voltar venda", "enganei", "corrigir"],
    steps: [
      "Logo depois de fechar a venda, toque em Errei: desfazer esta venda.",
      "Se já saiu dessa tela, toque em Equipe e, em Última venda, use o mesmo botão.",
      "Confirme. As cartelas voltam para a sua mão e o valor sai do seu caixa.",
    ],
    warnings: [
      "Só vale para a sua última venda e em até 10 minutos. Depois disso, fale com o administrador.",
      "Fica registrado quem desfez, quando e quais cartelas.",
    ],
    related: ["pdv-vender"],
  },
  {
    id: "pdv-pedir",
    title: "Pedir cartelas a um colega",
    summary: "Acabaram as suas cartelas? Peça a quem tem sobrando, pelo próprio PDV.",
    category: "vender",
    icon: "users",
    roles: ["vendedor"],
    keywords: ["pedir", "pedido", "trocar", "colega", "equipe", "emprestar", "estoque baixo", "acabou", "acabaram", "restam", "sobrando"],
    steps: [
      "Toque no botão Equipe, no topo do PDV.",
      "Na lista da equipe, ache o colega com cartelas sobrando e toque em Pedir.",
      "Escolha o tipo (Quina ou Cartela Cheia) e a quantidade e toque em Enviar pedido.",
      "Quando o colega aceitar, o pedido aparece como Aceito, com a faixa de códigos (de X até Y).",
      "Confira as cartelas físicas que ele entregou com a faixa mostrada no celular.",
    ],
    tips: [
      "Quando restam 5 cartelas ou menos com você, o botão Equipe fica âmbar para avisar.",
      "Para responder a um pedido, o colega vê um número vermelho no botão Equipe dele e toca em Aceitar: o sistema separa as últimas cartelas da pilha dele. Se a pilha não estiver em ordem, ele pode escolher os códigos que vai entregar.",
    ],
    related: ["pdv-vender"],
  },

  // ── TESOURARIA ─────────────────────────────────────────────────────────────
  {
    id: "tesouraria-entregar",
    title: "Entregar cartelas a um voluntário",
    summary: "Informe o tipo e a quantidade: o sistema separa as próximas cartelas da pilha.",
    category: "tesouraria",
    icon: "package",
    roles: ["tesoureiro", "admin"],
    featured: true,
    keywords: ["entregar", "distribuir", "quantidade", "voluntario", "pilha", "estoque", "fabrica", "dar cartelas", "recibo"],
    steps: [
      "Abra Tesouraria do Evento e toque em Abrir Tesouraria.",
      "No cartão do voluntário, toque em Entregar (aba Por quantidade).",
      "Escolha o Tipo de cartela e a Quantidade.",
      "Toque em Entregar N cartelas. O sistema mostra o resultado, por exemplo: de AB12CD até XY98ZT.",
      "Entregue ao voluntário as próximas N cartelas da pilha impressa do mesmo tipo.",
      "Para ter um recibo, toque em Imprimir extrato deste voluntário.",
    ],
    warnings: [
      "Imprima cada tipo separado e mantenha a pilha em ordem de código, para a faixa mostrada bater com o que você entrega.",
      "Se não houver cartelas livres suficientes do tipo pedido, nada é entregue e o sistema diz quantas existem.",
    ],
    tips: ["Existe também a aba Por códigos, para entregar cartelas específicas digitando os códigos."],
    related: ["tesouraria-receber", "cartela-bloquear"],
  },
  {
    id: "tesouraria-receber",
    title: "Receber o acerto de cartelas vendidas em papel",
    summary: "Recolha as não vendidas, marque 'todas as que continuam' e confirme a prévia.",
    category: "tesouraria",
    icon: "wallet",
    roles: ["tesoureiro", "admin"],
    featured: true,
    keywords: ["receber", "acerto", "acertar", "pagamento", "dinheiro", "devolver", "recolher", "extrato", "papel", "fechar conta"],
    steps: [
      "Peça ao voluntário as cartelas NÃO vendidas e registre os códigos em Devolver.",
      "No cartão dele, toque em Receber.",
      "Marque Todas as cartelas que continuam com o voluntário e toque em Conferir e receber.",
      "Confira a prévia (quantidade e valor) e confirme.",
      "Imprima o Extrato por Voluntário para ele assinar.",
    ],
    warnings: [
      "Confirme só depois de recolher as cartelas não vendidas: o sistema cobra tudo o que ainda estiver com o voluntário.",
      "Cartelas vendidas pelo PDV já estão pagas. O acerto é só para as vendidas em papel.",
    ],
    tips: [
      "O acerto usa sempre o preço da fase em vigor. Só o administrador pode escolher outra fase, e isso fica destacado na auditoria.",
      "Você também pode informar os códigos das cartelas vendidas, em vez de marcar 'todas'.",
    ],
    related: ["tesouraria-entregar", "problema-nao-paga"],
  },
  {
    id: "cartela-bloquear",
    title: "Bloquear uma cartela perdida",
    summary: "Cartela bloqueada não pode ser vendida, entregue nem premiada.",
    category: "tesouraria",
    icon: "ban",
    roles: ["tesoureiro", "admin"],
    keywords: ["bloquear", "perdida", "perdi", "cancelar cartela", "extraviada", "desbloquear", "sumiu", "roubada"],
    steps: [
      "Abra Cartelas por ID (pelo Painel de Resultados ou pelo link na Tesouraria).",
      "Busque o código da cartela.",
      "Toque em Bloquear e escreva o motivo (por exemplo, cartela perdida).",
      "Para desfazer, use Desbloquear. A justificativa também é obrigatória.",
    ],
    warnings: [
      "Se a cartela já estava vendida, o valor continua no caixa, mas ela deixa de poder ganhar.",
      "Todo bloqueio e desbloqueio fica na auditoria, com a sua justificativa.",
    ],
    related: ["tesouraria-entregar", "conselho-auditoria"],
  },

  // ── SORTEIO ────────────────────────────────────────────────────────────────
  {
    id: "palco-sorteio",
    title: "Conduzir o sorteio e soltar o telão",
    summary: "Sorteie, anuncie o patrocinador da próxima pedra e solte o bingo confirmado.",
    category: "sorteio",
    icon: "mic",
    roles: ["palco", "admin"],
    featured: true,
    keywords: ["sorteio", "sortear", "telao", "locutor", "palco", "pedra", "rodada", "patrocinador", "reset", "bola", "projetor"],
    steps: [
      "Abra a Mesa do Locutor e o Telão (no projetor ou na TV).",
      "Confira a Rodada Ativa e anuncie o prêmio e quem o oferece.",
      "Antes de sortear, olhe a Próxima pedra e anuncie o patrocinador.",
      "Toque em Sortear Pedra a cada número.",
      "Cada aviso de bingo entra numa fila na sua mesa, com a cartela, o nome e em qual pedra ela fechou. Ninguém é recusado por já haver outro aviso.",
      "Marque quem ganha e toque em Soltar no telão. Com mais de um marcado, o prêmio é dividido e o telão mostra todos os nomes. Com um só, os outros cedem.",
      "Aviso errado ou falso alarme? Toque em Descartar: ele sai da fila e o fiscal pode reenviar com o nome corrigido.",
      "Depois da comemoração, toque em Encerrar Rodada e Ir Pro Próximo Prêmio.",
    ],
    tips: [
      "Se o telão está no mesmo navegador da mesa, atualiza no mesmo instante. Em outro aparelho pode levar até cerca de 1,5 segundo.",
      "A lista Na Cara do Gol mostra as cartelas mais perto de ganhar a rodada atual.",
      "Quando duas cartelas fecham na mesma pedra aparece o aviso de Empate. A decisão é sua, na hora, com os ganhadores: o sistema só mostra o dado.",
      "Decidiu errado? Use Decidi errado: reabrir a decisão. O telão volta ao normal e os avisos voltam para a fila.",
    ],
    warnings: [
      "Você não consegue encerrar a rodada enquanto houver aviso aguardando decisão: solte o telão ou descarte.",
      "Forçar reset do globo zera as pedras da rodada, tira os avisos da fila e fica na auditoria. Use só em caso de erro.",
    ],
    related: ["fiscal-conferir"],
  },
  {
    id: "fiscal-conferir",
    title: "Conferir um bingo",
    summary: "Leia o QR da cartela de quem gritou bingo e avise o locutor.",
    category: "sorteio",
    icon: "scan",
    roles: ["fiscal", "admin"],
    featured: true,
    keywords: ["bingo", "conferir", "conferencia", "verificar", "fiscal", "qr", "ganhador", "validar", "quina", "cartela cheia", "gritou"],
    steps: [
      "Peça a cartela a quem gritou BINGO e abra o Verificador (menu: Verificar).",
      "Toque em Ler QR Code com a câmera, ou digite o código da cartela.",
      "Leia o resultado: bingo confirmado, ainda não bateu, não paga, bloqueada ou tipo errado.",
      "Se for um bingo válido, toque em Avisar Locutor e informe o nome do ganhador.",
      "O aviso entra na fila do locutor, que decide com os ganhadores. Se outra pessoa também gritar bingo, avise a cartela dela também: todos entram na fila.",
    ],
    tips: [
      "Quina é uma linha completa (linha, coluna ou diagonal). Cartela cheia é a cartela com todos os números sorteados.",
      "Cartela de Quina só ganha rodada de Quina, e cartela cheia só ganha rodada de Cartela Cheia.",
      "Duas pessoas podem ganhar na mesma rodada: o telão só muda depois que o locutor decide (um ganhador ou prêmio dividido).",
    ],
    warnings: ["Cartela não paga nunca ganha: ela precisa ter sido vendida no PDV ou acertada na tesouraria."],
    related: ["problema-nao-paga", "palco-sorteio"],
  },

  // ── PREPARAR O EVENTO ──────────────────────────────────────────────────────
  {
    id: "evento-preparar",
    title: "Preparar o evento: preços, fases e cartelas",
    summary: "Defina os preços, as fases de preço, os prêmios e gere as cartelas.",
    category: "evento",
    icon: "settings",
    roles: ["admin"],
    featured: true,
    keywords: ["preparar", "evento", "preco", "fase", "pre-venda", "premio", "patrocinador", "gerar cartelas", "imprimir", "pix", "ativar", "configurar"],
    steps: [
      "Crie o evento em + Novo Evento. Ele nasce Inativo.",
      "Defina o preço padrão da cartela e, se for ter rodada de cartela cheia, o preço da cartela cheia.",
      "Cadastre as Fases de Preço (pré-venda, perto do evento, no evento) com a data de início de cada uma.",
      "Informe a chave PIX, cadastre os patrocinadores e monte as rodadas e os prêmios.",
      "Gere as cartelas de cada tipo e imprima cada tipo separado.",
      "Cadastre a equipe, dê as permissões e, no dia, ligue o evento em Evento Ativo.",
    ],
    warnings: [
      "Cartelas já vendidas nunca mudam de preço, mesmo se você apagar uma fase.",
      "Para gerar cartela cheia, o preço dela precisa estar definido.",
    ],
    tips: ["Gere mais cartelas do que o previsto: sobrar não custa nada, faltar no dia do evento complica."],
    related: ["tesouraria-entregar"],
  },

  {
    id: "equipe-evento",
    title: "Montar a equipe de cada evento",
    summary: "Escolha quem trabalha em cada evento e o que cada pessoa pode fazer nele.",
    category: "evento",
    icon: "users",
    roles: ["admin"],
    keywords: ["equipe", "voluntario", "escala", "permissao", "tesoureiro", "conselho", "copiar equipe", "novo voluntario", "pin", "vespera"],
    steps: [
      "Abra o evento e toque em Montar a equipe do evento.",
      "Para quem já está cadastrado, toque nas etiquetas (Vender, Palco, Fiscal, Tesouraria, Conselho) e em Adicionar.",
      "Para uma pessoa nova, toque em Novo voluntário, escreva o nome e escolha as permissões. Anote o usuário e o PIN: o PIN aparece uma única vez.",
      "Para repetir uma equipe, use Trazer a equipe de outro evento: as pessoas vêm com as mesmas permissões e você ajusta o que precisar.",
      "Para mudar o que alguém faz, toque nas etiquetas dela. Para gerar novo PIN, use o ícone da chave.",
    ],
    tips: [
      "A mesma pessoa pode estar em vários eventos, cada um com permissões diferentes (vendedora num, tesoureira noutro).",
      "A Central de Voluntários continua existindo: é o cadastro geral de todos os eventos.",
    ],
    warnings: ["Toda mudança de permissão e todo PIN novo ficam registrados na auditoria."],
    related: ["evento-preparar"],
  },

  // ── FISCALIZAÇÃO ───────────────────────────────────────────────────────────
  {
    id: "conselho-auditoria",
    title: "Ler a auditoria",
    summary: "Veja quem fez o quê, quando, com qual papel e de qual IP.",
    category: "conselho",
    icon: "shield",
    roles: ["conselho", "admin"],
    featured: true,
    keywords: ["auditoria", "conselho", "log", "fraude", "quem fez", "registro", "fiscalizar", "relatorio", "historico", "ip"],
    steps: [
      "Abra Gestão e entre em Auditoria.",
      "Use os filtros: Dinheiro, Cartelas, Sorteio, Equipe e permissões ou Evento.",
      "O filtro Merece atenção mostra só o que pede um olhar: vendas desfeitas, bloqueios, falsos alarmes, mudanças de permissão, PIN redefinido e acertos com fase diferente da vigente.",
      "Cada linha mostra a pessoa, o papel que ela tinha, o IP e o aparelho.",
    ],
    tips: ["O Conselho só lê: não altera nada. O ranking de vendedores é visível só para o administrador."],
    related: ["cartela-bloquear"],
  },

  // ── PROBLEMAS ──────────────────────────────────────────────────────────────
  {
    id: "problema-nao-paga",
    title: "O fiscal diz “CARTELA NÃO PAGA”",
    summary: "Falta dar baixa no pagamento da cartela.",
    category: "problemas",
    icon: "alert",
    roles: ["fiscal", "tesoureiro", "admin", "vendedor"],
    keywords: ["nao paga", "pagamento", "fiscal", "bingo recusado", "cartela invalida", "recusou", "nao valida", "erro"],
    steps: [
      "Descubra como a cartela foi vendida: pelo PDV ou em papel.",
      "Se foi pelo PDV, ela deveria estar paga. Confira se a venda não foi desfeita.",
      "Se foi em papel, falta o acerto: o tesoureiro registra o pagamento em Tesouraria, Receber.",
      "O Verificador mostra com quem a cartela está. Quem tem o botão Regularizar agora (o dono da cartela, o tesoureiro ou o administrador) vai direto ao passo certo.",
      "Confira a cartela de novo no Verificador.",
    ],
    warnings: [
      "Nunca pague um prêmio de uma cartela que o sistema marca como não paga.",
      "Cartela que nunca foi entregue a ninguém não tem convite de venda: sem registro, ela não pode ser premiada.",
      "Se a cartela for paga depois de ter sido conferida como não paga, a auditoria destaca como Pago após conferência.",
    ],
    related: ["tesouraria-receber", "fiscal-conferir"],
  },
];

// ── Consultas ───────────────────────────────────────────────────────────────
const byId = new Map(TOPICS.map((t) => [t.id, t]));

export const getTopic = (id: string): Topic | undefined => byId.get(id);

export const getCategory = (id: CategoryId): Category | undefined => CATEGORIES.find((c) => c.id === id);
