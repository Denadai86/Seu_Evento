// src/app/[subdomain]/dashboard/[eventId]/cartelas/BlockCardButton.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockCard, unblockCard } from "@/actions/cardBlock";

export default function BlockCardButton({ eventId, shortId, blocked }: { eventId: string; shortId: string; blocked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handle = () => {
    if (blocked) {
      const why = window.prompt(`Desbloquear a cartela ${shortId}.\nQual a justificativa? (fica registrada na auditoria)`);
      if (!why || !why.trim()) return;
      start(async () => {
        const res = await unblockCard(eventId, shortId, why);
        if (!res.success) window.alert(res.error);
        router.refresh();
      });
      return;
    }
    const reason = window.prompt(`Bloquear a cartela ${shortId}.\nQual o motivo? (ex.: cartela perdida)`);
    if (!reason || !reason.trim()) return;
    start(async () => {
      const res = await blockCard(eventId, shortId, reason);
      if (!res.success) window.alert(res.error);
      else if (res.wasPaid) {
        window.alert("Atenção: esta cartela JÁ ESTAVA VENDIDA. O valor continua no caixa; ela só não poderá mais ser premiada.");
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={`px-3 py-1 rounded-lg text-xs font-bold border transition disabled:opacity-50 ${
        blocked ? "border-slate-400 text-slate-700 hover:bg-slate-100" : "border-red-300 text-red-700 hover:bg-red-50"
      }`}
    >
      {blocked ? "Desbloquear" : "Bloquear"}
    </button>
  );
}
