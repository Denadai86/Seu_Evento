// src/lib/manual/search.ts
//
// Busca do manual: sem acento, sem diferença de maiúscula, tolerante a 1 erro de digitação,
// e que entende mais de uma palavra ("desfazer venda"). Função pura, sem biblioteca, com testes.

import type { Topic } from "./types";

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Palavras que não ajudam a achar nada ("como faço para…").
const STOP = new Set(["a", "o", "e", "de", "da", "do", "das", "dos", "em", "no", "na", "um", "uma", "para", "por", "com", "que", "como", "eu", "se", "os", "as", "faco", "posso", "quero"]);

export const queryTokens = (q: string): string[] =>
  normalizeText(q).split(" ").filter((t) => t && !STOP.has(t));

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// 1 = a palavra da busca é o começo de alguma palavra do campo; 0.5 = parecida (1 erro de digitação); 0 = não achou
function hit(token: string, words: string[]): number {
  if (words.some((w) => w === token || (token.length >= 3 && w.startsWith(token)))) return 1;
  if (token.length >= 5 && words.some((w) => Math.abs(w.length - token.length) <= 1 && levenshtein(token, w) <= 1)) return 0.5;
  return 0;
}

type Indexed = { topic: Topic; title: string[]; keywords: string[]; summary: string[]; body: string[] };
const words = (s: string) => normalizeText(s).split(" ").filter(Boolean);

function index(topic: Topic): Indexed {
  return {
    topic,
    title: words(topic.title),
    keywords: topic.keywords.flatMap(words),
    summary: words(topic.summary),
    body: [...topic.steps, ...(topic.tips ?? []), ...(topic.warnings ?? [])].flatMap(words),
  };
}

function scoreToken(token: string, ix: Indexed): number {
  return hit(token, ix.title) * 8 + hit(token, ix.keywords) * 7 + hit(token, ix.summary) * 3 + hit(token, ix.body) * 1;
}

/** Assuntos que combinam com a busca, do mais ao menos parecido. Busca vazia devolve lista vazia. */
export function searchTopics(topics: readonly Topic[], query: string): Topic[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];

  const scored = topics.map((t) => {
    const ix = index(t);
    const perToken = tokens.map((tok) => scoreToken(tok, ix));
    return { topic: t, perToken, total: perToken.reduce((s, v) => s + v, 0) };
  });

  const byScore = (a: { total: number; topic: Topic }, b: { total: number; topic: Topic }) =>
    b.total - a.total || a.topic.title.localeCompare(b.topic.title, "pt-BR");

  // Primeiro exige TODAS as palavras ("desfazer venda"); se nada casar, aceita ALGUMA.
  const all = scored.filter((s) => s.perToken.every((v) => v > 0)).sort(byScore);
  if (all.length > 0) return all.map((s) => s.topic);
  return scored.filter((s) => s.total > 0).sort(byScore).map((s) => s.topic);
}
