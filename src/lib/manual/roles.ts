// src/lib/manual/roles.ts
//
// Quem vê o quê no manual. É conveniência (mostrar só o que importa para cada pessoa), NÃO segurança:
// quem protege de verdade as telas e as ações é o servidor (src/lib/accessPolicy.ts e as guardas das actions).
// Função pura, com testes.

import type { ManualRole, Topic } from "./types";

export const MANUAL_ROLES: readonly ManualRole[] = ["admin", "vendedor", "tesoureiro", "palco", "fiscal", "conselho"];

export const ROLE_LABEL: Record<ManualRole, string> = {
  admin: "Administrador",
  vendedor: "Vendedor (PDV)",
  tesoureiro: "Tesoureiro",
  palco: "Palco (locutor)",
  fiscal: "Fiscal",
  conselho: "Conselho",
};

export const isManualRole = (v: unknown): v is ManualRole =>
  typeof v === "string" && (MANUAL_ROLES as readonly string[]).includes(v);

export type StaffFlags = {
  canSell?: boolean | null;
  canOperate?: boolean | null;
  canVerify?: boolean | null;
  canTreasury?: boolean | null;
  canAudit?: boolean | null;
};

/** Papéis de um voluntário: a união das permissões dele em todos os eventos em que trabalha. */
export function rolesFromFlags(rows: StaffFlags[]): ManualRole[] {
  const roles = new Set<ManualRole>();
  for (const r of rows) {
    if (r.canSell) roles.add("vendedor");
    if (r.canOperate) roles.add("palco");
    if (r.canVerify) roles.add("fiscal");
    if (r.canTreasury) roles.add("tesoureiro");
    if (r.canAudit) roles.add("conselho");
  }
  return MANUAL_ROLES.filter((r) => roles.has(r));
}

export function topicVisibleTo(topic: Pick<Topic, "roles">, roles: readonly ManualRole[]): boolean {
  return topic.roles === "todos" || topic.roles.some((r) => roles.includes(r));
}

/**
 * Lista de assuntos para uma pessoa.
 *  • Administrador, sem "ver como": tudo.
 *  • Administrador, "ver como X": o que o papel X vê (útil para treinar a equipe).
 *  • Os demais: só o que casa com os papéis deles (mais o que é para todos).
 */
export function visibleTopics<T extends Pick<Topic, "roles">>(
  topics: readonly T[],
  opts: { roles: readonly ManualRole[]; isAdmin: boolean; viewAs?: ManualRole | null }
): T[] {
  if (opts.isAdmin) {
    if (!opts.viewAs) return [...topics];
    return topics.filter((t) => topicVisibleTo(t, [opts.viewAs as ManualRole]));
  }
  return topics.filter((t) => topicVisibleTo(t, opts.roles));
}
