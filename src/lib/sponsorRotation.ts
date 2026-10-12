// src/lib/sponsorRotation.ts
//
// Rodízio de "Pedra Patrocinada".
// A pedra de número k (contando TODAS as pedras do evento, em todas as rodadas) é
// oferecida pelo patrocinador (k-1) % N. O cursor fica no banco (Event.sponsorCursor)
// e é incrementado no MESMO update que grava a pedra — por isso mesa do locutor e
// telão sempre enxergam o mesmo "No ar" / "Próximo".

import type { Prisma } from "@prisma/client";

export type SponsorLite = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export const SPONSOR_SELECT = { id: true, name: true, logoUrl: true } as const;

// Desempate por id (cuid cresce com o tempo) para a ordem ser sempre estável.
export function sponsorOrderBy(): Prisma.SponsorOrderByWithRelationInput[] {
  return [{ order: "asc" }, { id: "asc" }];
}

export function resolveSponsorSlots(
  sponsors: SponsorLite[],
  cursor: number,
  hasDrawn: boolean
): { currentSponsor: SponsorLite | null; nextSponsor: SponsorLite | null } {
  const n = sponsors.length;
  if (n === 0) return { currentSponsor: null, nextSponsor: null };

  const c = Math.max(0, cursor);
  return {
    // "No ar" só existe se há pedra na mesa (após reset / fim de rodada não há)
    currentSponsor: hasDrawn && c > 0 ? sponsors[(c - 1) % n] : null,
    nextSponsor: sponsors[c % n],
  };
}
