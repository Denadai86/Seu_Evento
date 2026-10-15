// src/lib/accessPolicy.ts
//
// QUEM PODE VER/FAZER O QUÊ nas telas de gestão. Função pura (sem banco), com testes.
//
//  • Administrador (ORG_ADMIN): tudo do próprio evento.
//  • Tesoureiro (voluntário com `canTreasury`): tesouraria, fechamento de caixa, extratos e cartelas por ID
//    (inclusive bloquear/desbloquear). NÃO vê o painel geral, a auditoria nem o ranking e NÃO escolhe fase de preço.
//  • Conselho (voluntário com `canAudit`): SOMENTE LEITURA do painel, relatórios e auditoria.
//  • Suporte da plataforma (SUPER_ADMIN): leitura das telas (menos o ranking). Nenhuma ação.
// As permissões são por evento e combináveis (a mesma pessoa pode ser tesoureira e do conselho).

export type Role = "SUPER_ADMIN" | "ORG_ADMIN" | "STAFF";

export type PageKey =
  | "tesouraria"
  | "fechamento"
  | "extrato"
  | "cartelas"
  | "resultados"
  | "patrocinadores"
  | "auditoria"
  | "ranking";

export type Actor = { role: Role; canTreasury?: boolean; canAudit?: boolean };

const TREASURY_PAGES: ReadonlySet<PageKey> = new Set(["tesouraria", "fechamento", "extrato", "cartelas"]);
const AUDIT_PAGES: ReadonlySet<PageKey> = new Set([
  "fechamento",
  "extrato",
  "cartelas",
  "resultados",
  "patrocinadores",
  "auditoria",
]);

export function canViewPage(actor: Actor, page: PageKey): boolean {
  if (actor.role === "ORG_ADMIN") return true;
  if (actor.role === "SUPER_ADMIN") return page !== "ranking";
  if (actor.role === "STAFF") {
    return (!!actor.canTreasury && TREASURY_PAGES.has(page)) || (!!actor.canAudit && AUDIT_PAGES.has(page));
  }
  return false;
}

/** Entregar, devolver e receber cartelas (tesouraria). */
export const canOperateTreasury = (a: Actor) => a.role === "ORG_ADMIN" || (a.role === "STAFF" && !!a.canTreasury);

/** Bloquear/desbloquear cartela (com justificativa). */
export const canBlockCards = canOperateTreasury;

/** Escolher OUTRA fase de preço no acerto. O tesoureiro só usa a fase vigente. */
export const canChoosePricePhase = (a: Actor) => a.role === "ORG_ADMIN";

/** O ranking é um reconhecimento do administrador. */
export const canSeeRanking = (a: Actor) => a.role === "ORG_ADMIN";

/** Para onde ir quando não pode ver a página. */
export const homeFor = (a: Actor, eventId: string) => (a.role === "STAFF" ? "/gestao" : `/dashboard/${eventId}`);

/** Rótulo do papel de gestão, para mostrar na tela e no log. */
export function managementRoleLabel(a: Actor): string {
  if (a.role === "ORG_ADMIN") return "Administrador";
  if (a.role === "SUPER_ADMIN") return "Suporte da plataforma";
  const labels = [a.canTreasury ? "Tesoureiro" : null, a.canAudit ? "Conselho" : null].filter(Boolean);
  return labels.length ? labels.join(" e ") : "Voluntário";
}
