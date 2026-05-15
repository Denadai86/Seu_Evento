# 🎯 Ação Leve - Bingo SaaS (Documentação do Sistema)

## 📌 Visão Geral
Plataforma Multi-Tenant para gestão, operação e auditoria financeira de bingos presenciais e híbridos (físico + digital). O sistema elimina fraudes, automatiza a geração de cartelas e oferece ferramentas em tempo real para locutores e vendedores de pátio.

## 🛠️ Stack Tecnológico
- **Framework:** Next.js 15 (App Router) + React 19
- **Banco de Dados:** PostgreSQL (Neon Database)
- **ORM:** Prisma Client
- **Estilização:** Tailwind CSS (com utilitários `@media print`)
- **Autenticação:** NextAuth (v5 / auth.js)
- **Real-Time:** SWR (Sincronização via Polling otimizado com Fallback)
- **Hospedagem Alvo:** Vercel

---

## 👥 Níveis de Acesso (Roles)
1. **SUPER_ADMIN:** Dono da plataforma (Ação Leve). Cria os *Tenants* (Igrejas, ONGs, Instituições) e gerencia assinaturas.
2. **ADMIN (Contratante):** Dono do Evento. Acessa o Dashboard, gera cartelas, cadastra patrocinadores e audita o financeiro.
3. **OPERATOR (Locutor):** Responsável pela "Mesa do Locutor" (`/live`). Apenas sorteia pedras e reseta o jogo. Não vê o financeiro.
4. **VERIFIER (Voluntário/Vendedor):** Trabalha no pátio. Usa o celular para vendas rápidas (`/vendas`) e conferência de cartelas ganhadoras (`/verify`).

---

## 🧩 Módulos Principais (Arquitetura de Pastas)
Toda a aplicação roda debaixo do *middleware* `proxy.ts`, que identifica o subdomínio e roteia para a pasta `src/app/[subdomain]/`.

* **`/dashboard`**: Centro de Comando do Admin. Utiliza arquitetura de *Bento Grid* para exibir faturamento, atalhos e auditoria de vendedores.
* **`/live`**: Mesa do Locutor. Interface de controle do sorteio (Transactions seguras no Prisma para evitar condições de corrida).
* **`/projector`**: O Telão do Evento. Página *Client-Side* rodando SWR que reage instantaneamente aos sorteios e exibe a logomarca dos patrocinadores (Motor de Merchandising).
* **`/print`**: Fábrica de Cartelas. Rota "invisível" programada com `@media print` para renderizar PDFs perfeitos em 3 formatos (A4-4, A4-2 Modo Idoso, e A6 Padrão Gráfica). Injeta "Powered by Ação Leve" se o cliente não tiver logo.
* **`/vendas`**: PDV Móvel. Sistema de "caixa rápido" para o voluntário escanear/digitar IDs, colocar no carrinho e dar baixa financeira (Pix/Dinheiro).
* **`/verify`**: Ferramenta de auditoria. Confere de forma inteligente se a cartela bateu os critérios de vitória (ex: Quina ou Cheia).

---

## 🗄️ Estrutura do Banco de Dados (Prisma)
- **Tenant:** A Instituição (subdomínio exclusivo, logo, nome).
- **Event:** O bingo em si. Guarda o status, pedras sorteadas (`drawnNumbers`), preço da cartela.
- **Card (Cartela):** Possui um `shortId` globalmente único (ex: A9B2X1). Armazena a matriz matemática de 25 números. Regra de negócio: *Cartela não ganha prêmio se `isPaid = false`*.
- **Sponsor:** Patrocinadores injetados no telão e no rodapé dos PDFs impressos.
- **Seller:** Vendedores físicos para acerto de contas e controle de lotes de papel.

---

## 🚀 Roadmap & Próximos Passos (Backlog)
- [x] Motor matemático blindado contra cartelas repetidas.
- [x] Motor de impressão CSS com margem de segurança.
- [x] Carrinho de compras no PDV Móvel do Voluntário.
- [ ] **Configuração de Regras de Vitória:** Ensinar o banco a diferenciar prêmios (Rodada 1 = Quina; Rodada 2 = Cartela Cheia).
- [ ] **Cartela Digital do Jogador:** Tela `/cartela/[id]` onde o jogador marca os números no próprio celular.
- [ ] **Fechamento de Caixa Avançado:** Salvar na tabela `Card` a forma de pagamento e a data exata da venda para gráficos.
- [ ] **Personalização da Marca:** Definir os metadados (Favicon, Logo oficial na tela de Login).

---

## 🏆 Lógica de Premiação e Rodadas
- **Entidade `Prize`**: Define o objetivo atual (QUINA ou FULL_HOUSE).
- **Sincronização**: O estado do prêmio é injetado no payload da API `/api/bingo/state`.
- **Validação**: A função `validateWinningCard` (Server Action) cruza:
  1. Status de pagamento da cartela (`isPaid`).
  2. Pedras sorteadas no evento.
  3. Matriz da cartela.
  4. Regra da rodada ativa (Quina ou Cheia).

  ----

  ## 📡 Protocolo de Celebração de 3 Vias
1. **Verificador:** Realiza o `alertLocutor` via Server Action, enviando o ID e o Nome (Logado).
2. **Locutor:** Recebe o alerta via SWR Polling. Decide o *timing* ideal e aciona `toggleBingoCelebration`.
3. **Projector:** Detecta o `bingoConfirmed: true` e renderiza o overlay de vitória com `canvas-confetti` e animações CSS.

## 🏗️ Padrões de Arquitetura e Roadmap de Escalabilidade (Mitigação de Retrabalho)

Para garantir que o sistema escale sem virar um "código espaguete" e facilitar a manutenção, adotamos as seguintes diretrizes e próximos passos de refatoração:

### 1. Estrutura "Feature-Based" (Em Andamento)
- Mover de uma estrutura agrupada por "tipo de arquivo" para "módulos de negócio".
- Exemplo: `src/features/event-settings/` conterá suas próprias `actions.ts`, `components/` e validação `schema.ts` (Zod).

### 2. Evolução Financeira (Módulo de Relatórios)
- **Atual:** Faturamento calculado via soma de `isPaid` x `ticketPrice`.
- **Futuro (Log de Transações):** Criação de uma tabela `Transaction` atrelada à cartela. Registrará quem vendeu, horário exato, e método (Pix/Dinheiro) para auditoria financeira perfeita e gráficos de pico de vendas.

### 3. Herança de Tenant (Automação)
- **Objetivo:** Adicionar campos como `defaultTicketPrice` no modelo `Tenant`.
- **Benefício:** Quando um contratante recorrente cria um novo evento, o sistema herda os padrões dele, zerando o retrabalho de configuração.

### 4. Ciclo de Vida do Evento (State Machine)
- **Atual:** Booleano `isActive`.
- **Futuro:** Migrar para `enum EventStatus { PLANNING, ACTIVE, FINISHED, ARCHIVED }`. Isso travará vendas após o evento e congelará relatórios financeiros automaticamente.

### 5. UI Kit Genérico
- Consolidar botões, modais e inputs padrão dentro de `src/components/ui` para garantir consistência visual em todo o SaaS e mudar o design global editando apenas um arquivo.

*Documento atualizado automaticamente conforme o projeto evolui.* 
