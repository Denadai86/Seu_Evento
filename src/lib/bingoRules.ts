// src/lib/bingoRules.ts
//
// Regras de bingo (função pura) usadas pelo SERVIDOR (validar o ganhador) e pela MESA do locutor
// ("Na cara do gol"). Antes cada lado fazia a sua conta: a mesa sempre media "cartela cheia",
// mesmo na rodada de QUINA, e mostrava como "faltando" cartelas que já tinham ganho.
//
// Quina = qualquer linha completa: 5 linhas, 5 colunas ou 2 diagonais (o centro de N é livre).

export type BingoMatrix = { B: number[]; I: number[]; N: number[]; G: number[]; O: number[] };

const COLS = ["B", "I", "N", "G", "O"] as const;
const isFree = (col: string, row: number) => col === "N" && row === 2;

/** Os 24 números da cartela (sem o centro livre). */
export function cardNumbers(m: BingoMatrix): number[] {
  const out: number[] = [];
  for (const col of COLS) for (let row = 0; row < 5; row++) if (!isFree(col, row)) out.push(m[col][row]);
  return out;
}

export function evaluateCard(m: BingoMatrix, drawnNumbers: number[]) {
  const drawn = new Set(drawnNumbers);
  const missing = (nums: number[]) => nums.filter((n) => !drawn.has(n)).length;

  const rows = [0, 1, 2, 3, 4].map((row) =>
    COLS.filter((col) => !isFree(col, row)).map((col) => m[col][row])
  );
  const cols = COLS.map((col) => [0, 1, 2, 3, 4].filter((row) => !isFree(col, row)).map((row) => m[col][row]));
  const diag1 = [m.B[0], m.I[1], m.G[3], m.O[4]];
  const diag2 = [m.B[4], m.I[3], m.G[1], m.O[0]];

  const fullMissing = missing(cardNumbers(m));

  return {
    fullMissing, // quantas pedras faltam para a CARTELA CHEIA
    quinaMissing: Math.min(...[...rows, ...cols, diag1, diag2].map(missing)), // para a linha mais próxima
    isFullHouse: fullMissing === 0,
    hasHorizontalQuina: rows.some((l) => missing(l) === 0),
    hasVerticalQuina: cols.some((l) => missing(l) === 0),
    hasDiag1: missing(diag1) === 0,
    hasDiag2: missing(diag2) === 0,
    get hasQuina() {
      return this.hasHorizontalQuina || this.hasVerticalQuina || this.hasDiag1 || this.hasDiag2;
    },
  };
}
