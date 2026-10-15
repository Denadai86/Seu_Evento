// src/lib/ranking.ts
//
// Ranking de vendedores (SÓ para o administrador, sem metas: serve para premiar com uma prenda).
// Conta tudo que foi creditado ao voluntário: vendas no PDV e cartelas acertadas na tesouraria.
// Função pura, com testes.

export type RankRow = { id: string; name: string; qtd: number; total: number };
export type RankBy = "qtd" | "valor";
export type Ranked = RankRow & { position: number };

export function buildRanking(rows: RankRow[], by: RankBy): Ranked[] {
  const primary = (r: RankRow) => (by === "qtd" ? r.qtd : r.total);
  const secondary = (r: RankRow) => (by === "qtd" ? r.total : r.qtd);

  const sorted = rows
    .filter((r) => r.id !== "sem-vendedor" && r.qtd > 0)
    .sort((a, b) => primary(b) - primary(a) || secondary(b) - secondary(a) || a.name.localeCompare(b.name, "pt-BR"));

  // Empate total (mesmo critério e mesmo desempate) divide a posição: 1º, 1º, 3º…
  const out: Ranked[] = [];
  sorted.forEach((r, i) => {
    const prev = out[i - 1];
    const tied = prev && primary(prev) === primary(r) && secondary(prev) === secondary(r);
    out.push({ ...r, position: tied ? prev.position : i + 1 });
  });
  return out;
}
