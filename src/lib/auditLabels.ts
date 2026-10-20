// src/lib/auditLabels.ts
//
// Catálogo do log de auditoria: nome de cada ação, categoria e a frase em português que a descreve.
// Função pura (sem banco), com testes. As ações são gravadas por logAudit() em src/lib/audit.ts.

export type AuditCategory = "DINHEIRO" | "CARTELAS" | "SORTEIO" | "EQUIPE" | "EVENTO";

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  DINHEIRO: "Dinheiro",
  CARTELAS: "Cartelas",
  SORTEIO: "Sorteio e ganhadores",
  EQUIPE: "Equipe e permissões",
  EVENTO: "Evento",
};

// `sensitive` = ação que merece atenção do administrador (destaque na tela).
export const AUDIT_ACTIONS: Record<string, { label: string; category: AuditCategory; sensitive?: boolean }> = {
  SALE_COMPLETED: { label: "Venda no PDV", category: "DINHEIRO" },
  PAYMENT_REGISTERED: { label: "Pagamento registrado", category: "DINHEIRO" },
  SALE_UNDONE: { label: "Venda desfeita", category: "DINHEIRO", sensitive: true },
  PRICE_TIER_CREATED: { label: "Fase de preço criada", category: "DINHEIRO" },
  PRICE_TIER_DELETED: { label: "Fase de preço apagada", category: "DINHEIRO", sensitive: true },
  TICKET_PRICE_CHANGED: { label: "Preço padrão alterado", category: "DINHEIRO" },
  CARDS_GENERATED: { label: "Cartelas geradas", category: "CARTELAS" },
  CARDS_ASSIGNED: { label: "Cartelas entregues", category: "CARTELAS" },
  CARDS_RETURNED: { label: "Cartelas recolhidas", category: "CARTELAS" },
  TRANSFER_ACCEPTED: { label: "Troca entre voluntários", category: "CARTELAS" },
  CARD_BLOCKED: { label: "Cartela bloqueada", category: "CARTELAS", sensitive: true },
  CARD_UNBLOCKED: { label: "Cartela desbloqueada", category: "CARTELAS", sensitive: true },
  UNPAID_CARD_CHECKED: { label: "Cartela não paga conferida", category: "SORTEIO" },
  PAID_AFTER_BINGO_CHECK: { label: "Pago após conferência", category: "DINHEIRO", sensitive: true },
  BINGO_ALERT: { label: "Aviso de bingo", category: "SORTEIO" },
  BINGO_RELEASED: { label: "Bingo solto no telão", category: "SORTEIO" },
  BINGO_CLAIM_DISCARDED: { label: "Aviso de bingo descartado", category: "SORTEIO", sensitive: true },
  BINGO_DECISION_REOPENED: { label: "Decisão do bingo reaberta", category: "SORTEIO", sensitive: true },
  BINGO_FALSE_ALARM: { label: "Falso alarme", category: "SORTEIO", sensitive: true },
  ROUND_COMPLETED: { label: "Rodada encerrada", category: "SORTEIO" },
  GAME_RESET: { label: "Globo zerado", category: "SORTEIO", sensitive: true },
  STAFF_PERMISSIONS_CHANGED: { label: "Permissões alteradas", category: "EQUIPE", sensitive: true },
  PIN_RESET: { label: "PIN redefinido", category: "EQUIPE", sensitive: true },
  EVENT_CLOSED: { label: "Evento encerrado", category: "EVENTO", sensitive: true },
  DEMO_MODE: { label: "Modo demonstração", category: "EVENTO", sensitive: true },
};

// Nome de cada permissão (para descrever quem ganhou ou perdeu o quê).
export const PERMISSION_LABEL: Record<string, string> = {
  canSell: "Vender (PDV)",
  canOperate: "Palco",
  canVerify: "Fiscal",
  canTreasury: "Tesouraria",
  canAudit: "Conselho",
};
const PERMISSION_KEYS = ["canSell", "canOperate", "canVerify", "canTreasury", "canAudit"] as const;

/** Destaque na tela: ações sensíveis, e também um acerto em que o administrador usou fase diferente da vigente. */
export function isSensitiveEntry(action: string, md?: Record<string, any> | null): boolean {
  if (AUDIT_ACTIONS[action]?.sensitive) return true;
  if (action === "PAYMENT_REGISTERED" && md?.overridden) return true;
  return false;
}

export const actionsOfCategory = (cat: AuditCategory): string[] =>
  Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.category === cat).map(([k]) => k);

const brl = (cents: unknown) =>
  (Number(cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const n = (v: unknown) => Number(v ?? 0);
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const typeLabel = (t: unknown) => (t === "FULL_HOUSE" ? "cartela cheia" : "quina");
const range = (first: unknown, last: unknown) => (first && last ? ` (de ${first} até ${last})` : "");
const dateBR = (iso: unknown) =>
  iso
    ? new Date(String(iso)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

/** Frase em português para uma linha do log. `who` traduz o id de um voluntário no nome dele. */
export function describeAudit(action: string, md: Record<string, any> | null | undefined, who: (staffId: string) => string): string {
  const m = md ?? {};
  switch (action) {
    case "SALE_COMPLETED": {
      const codes = (Array.isArray(m.codes) ? m.codes : []) as string[];
      return `Vendeu ${plural(codes.length || n(m.count), "cartela", "cartelas")}${codes.length ? ` (${codes.join(", ")})` : ""} por ${brl(m.total)} no ${m.method === "PIX" ? "PIX" : "dinheiro"} (${who(m.staffId)})`;
    }
    case "PAYMENT_REGISTERED": {
      // Desdobramento do valor (ex.: 3 × R$ 10,00 + 2 × R$ 15,00) para o conselho conferir a conta.
      const parts =
        Array.isArray(m.breakdown) && m.breakdown.length > 0
          ? ` [${(m.breakdown as { price: number; qty: number }[]).map((b) => `${b.qty} × ${brl(b.price)}`).join(" + ")}]`
          : "";
      const phase = m.tier ? ` (fase: ${m.tier})` : "";
      const alert = m.overridden
        ? ` — ATENÇÃO: o administrador aplicou ${m.tier ? `a fase "${m.tier}"` : "o preço padrão"}; a vigente era ${m.vigente ? `"${m.vigente}"` : "o preço padrão"}`
        : "";
      return `Recebeu de ${who(m.staffId)} o acerto de ${plural(n(m.count), "cartela", "cartelas")}: ${brl(m.amount)}${parts}${phase}${m.mode === "all" ? " — tudo o que estava com o voluntário" : ""}${alert}`;
    }
    case "SALE_UNDONE":
      return `Desfez a venda de ${plural((m.codes ?? []).length || n(m.count), "cartela", "cartelas")} (${brl(m.total)}) de ${who(m.staffId)}${(m.codes ?? []).length ? `: ${(m.codes as string[]).join(", ")}` : ""}`;
    case "PRICE_TIER_CREATED":
      return `Criou a fase "${m.name}": quina ${brl(m.quinaPrice)}${m.fullHousePrice ? `, cheia ${brl(m.fullHousePrice)}` : ""}${m.startsAt ? `, a partir de ${dateBR(m.startsAt)}` : ", desde o início"}`;
    case "PRICE_TIER_DELETED":
      return `Apagou a fase de preço${m.name ? ` "${m.name}"` : ""}${m.quinaPrice ? ` (quina ${brl(m.quinaPrice)}${m.fullHousePrice ? `, cheia ${brl(m.fullHousePrice)}` : ""}${m.startsAt ? `, começava em ${dateBR(m.startsAt)}` : ""})` : ""}`;
    case "TICKET_PRICE_CHANGED":
      return `Alterou o preço padrão da ${m.kind === "FULL_HOUSE" ? "cartela cheia" : "cartela"}${m.from != null ? ` de ${brl(m.from)}` : ""} para ${brl(m.price)}`;
    case "CARDS_GENERATED":
      return `Gerou ${plural(n(m.quantity), "cartela", "cartelas")} de ${typeLabel(m.type)}`;
    case "CARDS_ASSIGNED":
      return `Entregou ${plural(n(m.count), "cartela", "cartelas")} a ${who(m.staffId)}${range(m.first, m.last)}${m.mode === "codes" ? " — por códigos" : ""}`;
    case "CARDS_RETURNED":
      return `Recolheu ${plural(n(m.count), "cartela", "cartelas")} de ${who(m.staffId)}`;
    case "TRANSFER_ACCEPTED":
      return `${who(m.fromStaff)} entregou ${plural(n(m.count), "cartela", "cartelas")} a ${who(m.toStaff)}${range(m.first, m.last)}`;
    case "UNPAID_CARD_CHECKED":
      return `O fiscal conferiu a cartela ${m.card}: ainda não estava paga${m.holderStaffId ? ` (estava com ${who(m.holderStaffId)})` : " (sem voluntário)"}`;
    case "PAID_AFTER_BINGO_CHECK": {
      const cards = (Array.isArray(m.cards) ? m.cards : []) as string[];
      return `Pagamento de ${plural(cards.length, "cartela", "cartelas")} (${cards.join(", ")}) que já tinham sido conferidas como NÃO PAGAS — ${m.via === "PDV" ? "venda no PDV" : "acerto na tesouraria"}${m.staffId ? ` (${who(m.staffId)})` : ""}`;
    }
    case "CARD_BLOCKED":
      return `Bloqueou a cartela ${m.shortId}: ${m.reason ?? "sem motivo"}${m.wasPaid ? " (já estava vendida)" : ""}`;
    case "CARD_UNBLOCKED":
      return `Desbloqueou a cartela ${m.shortId}${m.reason ? `: justificativa "${m.reason}"` : ""}`;
    case "STAFF_PERMISSIONS_CHANGED": {
      const target = `${m.targetName ?? "voluntário"}${m.targetUsername ? ` (${m.targetUsername})` : ""}`;
      const on = (f: Record<string, boolean> | null | undefined) =>
        PERMISSION_KEYS.filter((k) => f?.[k]).map((k) => PERMISSION_LABEL[k]);
      if (m.assigned === false) return `Retirou ${target} da equipe do evento`;
      const before = (m.before ?? null) as Record<string, boolean> | null;
      const after = (m.after ?? null) as Record<string, boolean> | null;
      if (!before) return `Escalou ${target} no evento com: ${on(after).join(", ") || "nenhuma permissão"}${m.copiedFrom ? ` (equipe copiada do evento "${m.copiedFrom}")` : ""}`;
      const gained = on(after).filter((l) => !on(before).includes(l));
      const lost = on(before).filter((l) => !on(after).includes(l));
      const parts = [gained.length ? `passou a ter ${gained.join(", ")}` : null, lost.length ? `deixou de ter ${lost.join(", ")}` : null].filter(Boolean);
      return `Alterou as permissões de ${target}: ${parts.join("; ") || "sem mudança"}`;
    }
    case "PIN_RESET":
      return `Redefiniu o PIN de ${m.targetName ?? "um voluntário"}${m.targetUsername ? ` (${m.targetUsername})` : ""}`;
    case "BINGO_ALERT":
      return `O fiscal ${m.fiscal ?? ""} avisou bingo: cartela ${m.card}, ganhador "${m.winnerName}"${m.closedAtDraw ? ` (fechou na pedra ${m.closedAtDraw})` : ""}`.replace("fiscal  ", "fiscal ");
    case "BINGO_RELEASED": {
      const winners = (Array.isArray(m.winners) ? m.winners : []) as { card: string; name: string }[];
      if (winners.length > 0) {
        const who2 = winners.map((w) => `${w.name} (cartela ${w.card})`).join(" e ");
        const yielded = (Array.isArray(m.yielded) ? m.yielded : []) as { name: string }[];
        return `Soltou no telão: ${who2} — ${winners.length > 1 ? "prêmio DIVIDIDO" : "ganhador único"}${yielded.length ? `; cederam: ${yielded.map((y) => y.name).join(", ")}` : ""}`;
      }
      // registros de antes da fila de avisos
      return `Soltou o bingo no telão: cartela ${m.card ?? "?"}, ganhador "${String(m.winnerName ?? "").split(" (Fiscal:")[0]}"`;
    }
    case "BINGO_CLAIM_DISCARDED":
      return `Descartou o aviso de bingo da cartela ${m.card ?? "?"}${m.name ? ` (${m.name})` : ""}`;
    case "BINGO_DECISION_REOPENED":
      return "Reabriu a decisão do bingo: os avisos voltaram para a fila";
    case "BINGO_FALSE_ALARM":
      return `Limpou um aviso de bingo (falso alarme)${m.card ? `: cartela ${m.card}` : ""}`;
    case "ROUND_COMPLETED":
      return `Encerrou a rodada do prêmio "${m.prizeName}"`;
    case "GAME_RESET":
      return "Zerou o globo (reset das pedras sorteadas)";
    case "EVENT_CLOSED":
      return `Encerrou o evento: ${brl(m.totalRevenue)} em ${plural(n(m.cards), "cartela", "cartelas")}`;
    case "DEMO_MODE":
      return "Ativou o modo demonstração (todas as cartelas marcadas como pagas)";
    default:
      return action;
  }
}
