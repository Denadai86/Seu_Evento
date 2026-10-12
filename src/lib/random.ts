// src/lib/random.ts
//
// Aleatoriedade criptograficamente segura (CSPRNG) para tudo que importa:
// sorteio das pedras, códigos de cartela, matrizes, PINs e senhas temporárias.
// Math.random() é previsível e não deve ser usado nesses casos.

import { randomInt } from "node:crypto";

/** Inteiro uniforme em [min, maxInclusive]. */
export function secureInt(min: number, maxInclusive: number): number {
  return randomInt(min, maxInclusive + 1);
}

/** Elemento uniforme de um array não vazio. */
export function securePick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error("securePick: lista vazia");
  return items[randomInt(0, items.length)];
}
