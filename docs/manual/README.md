# Manual do Usuário — Seu Evento

Esta pasta guarda o manual e a **fonte** dele. O manual é gerado por código: você edita o texto
em `gerar-manual.js` e roda um comando, que cria o arquivo Word (`.docx`). Não edite o `.docx` à mão,
porque a próxima geração apagaria a sua edição.

## O que é cada arquivo

| Arquivo | O que é |
|---|---|
| `gerar-manual.js` | **A fonte.** Todo o texto do manual está aqui. É este que você edita. |
| `Manual_Usuario_SeuEvento_v2.0.docx` | Versão gerada (Word). |
| `Manual_Usuario_SeuEvento_v2.0.pdf` | A mesma versão em PDF, para enviar a clientes e voluntários. |
| `README.md` | Este guia. |

> O `Manual.md` e o `Manual_V2.txt.md` que ficavam na raiz do projeto eram a versão antiga do gerador
> e um arquivo vazio. Podem ser apagados: `git rm Manual.md Manual_V2.txt.md`

## Gerar o manual (PowerShell, na raiz do projeto)

Só na primeira vez, instale a biblioteca que monta o Word:

```powershell
pnpm add -D -E docx@9.6.1
```

Para gerar:

```powershell
node docs/manual/gerar-manual.js
```

Isso cria `docs/manual/Manual_Usuario_SeuEvento.docx`. Se quiser outro nome ou lugar:

```powershell
node docs/manual/gerar-manual.js docs/manual/Manual_Usuario_SeuEvento_v2.1.docx
```

Opcional: para virar um comando curto, acrescente em `package.json`, dentro de `"scripts"`:

```json
"manual": "node docs/manual/gerar-manual.js"
```

e rode `pnpm manual`.

Depois de gerar: abra o `.docx` no Word, passe os olhos (principalmente nas páginas que você mudou)
e use **Arquivo → Salvar como → PDF**.

## Como editar o texto

Abra `gerar-manual.js` e procure o array `content`. Cada capítulo começa em `heading1("...")`.
Os blocos que você mais vai usar:

```js
heading2("3.5 Fases de preço"),          // título de seção
body("Um parágrafo de texto."),           // parágrafo
...bullets(["Item um.", "Item dois."]),   // lista com marcadores
...numberedList(["Passo um.", "Passo dois."]), // lista numerada (recomeça em 1 sozinha)
infoNote("Uma dica."),                    // caixa azul
warningNote("Um aviso."),                 // caixa amarela
dangerNote("Um perigo."),                 // caixa vermelha
simpleTable(
  ["Coluna A", "Coluna B"],               // cabeçalho
  [["linha 1 A", "linha 1 B"], ["linha 2 A", "linha 2 B"]],
  [3000, 6026]                            // larguras: a SOMA tem que dar 9026
),
space(),
pageBreak(),                              // fim de capítulo: o próximo começa em página nova
```

**Cuidados que evitam erro:**

- Listas (`bullets`, `numberedList`) levam três pontos na frente (`...`). Sem eles, o manual não gera.
- Dentro dos textos use aspas curvas “assim”. As aspas retas (`"`) fecham o texto do JavaScript.
- As larguras de cada `simpleTable` precisam somar **9026**. Se não somarem, o script para e diz qual tabela.
- O **Sumário** e o quadro **"Qual capítulo é para mim?"** são escritos à mão: se você criar ou renomear
  um capítulo, atualize os dois.
- Se o manual não gerar, a mensagem de erro aponta a linha. O erro mais comum é uma aspa ou vírgula faltando.

### Exemplo: dar um papel novo ao quadro de permissões

No capítulo 1.2 existe a tabela de permissões do voluntário. Para acrescentar uma linha, basta
somar um item no meio das linhas:

```js
["Tesouraria", "Entregar, recolher e receber cartelas; ver fechamento, extratos e cartelas por ID; bloquear cartela perdida"],
```

## Quando atualizar cada capítulo

Regra de ouro: **mudou uma tela ou uma regra, atualize o manual no mesmo commit.**

| Se você mudou… | Revise o capítulo |
|---|---|
| Planos, garantia, limite de eventos | 1.3 |
| Papéis e permissões (Tesoureiro, Conselho…) | 1.2, 4, 14.1 |
| Tipos de cartela, preço padrão, fases de preço | 3.4, 3.5 |
| Prêmios, patrocinadores, impressão | 3.7, 3.9 |
| Tesouraria (entregar, devolver, receber) | 5 |
| PDV (venda, câmera, desfazer, pedidos) | 6 |
| Mesa do locutor, telão | 7 |
| Verificador / conferência de bingo | 8 |
| Painel, relatórios, ranking, impressões | 9 |
| Encerramento do evento | 10 |
| Auditoria, segurança | 11 |
| Mensagens de erro e soluções | 13.2 |

## Versão

Mudou o conteúdo de forma relevante? Em `gerar-manual.js`, no começo do arquivo, altere:

```js
const VERSAO_NUM = "2.1";
const VERSAO_DATA = "Novembro de 2026";
```

Isso atualiza a capa, o cabeçalho de todas as páginas e o título "O que mudou na versão…".
Atualize também a tabela **"O que mudou"** (logo depois do Sumário) com as novidades da versão.
Gere com o nome da versão (`..._v2.1.docx`) e guarde o PDF novo na pasta.

## Publicar no site (opcional)

Se quiser que clientes baixem o manual pelo próprio site:

1. Crie a pasta `public/` na raiz do projeto (ela ainda não existe) e copie o PDF para lá:
   `public/manual-seu-evento.pdf`.
2. Depois do deploy ele fica em `https://acaoleve.dev.br/manual-seu-evento.pdf`.
   Funciona só no domínio principal, não nos subdomínios dos clientes.
3. Acrescente um link para ele onde quiser (por exemplo, no rodapé do site).

Isso exige o `proxy.ts` desta versão, que libera arquivos `.pdf` e as páginas de Termos e Privacidade
para visitantes sem login.

> O manual descreve funcionalidades e não tem dados sensíveis, mas **publicar é uma decisão sua**.
> Enquanto não decidir, envie o PDF por WhatsApp.

## O que ainda falta neste manual

- Os papéis **Tesoureiro** e **Conselho** (adicionados depois da v2.0) ainda não estão descritos.
- O manual não tem imagens de tela. Para acrescentar, o `docx` aceita imagens (`ImageRun`),
  mas é melhor usar capturas sem dados reais.
- A **cartela digital** do participante não aparece, porque ainda está em desenvolvimento.
