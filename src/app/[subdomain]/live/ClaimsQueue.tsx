// src/app/[subdomain]/live/ClaimsQueue.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { releaseWinners, discardClaim } from "@/actions/bingo";
import { orderClaims, summarizeQueue } from "@/lib/bingoClaims";

export type QueueClaim = {
  id: string;
  card: string;
  name: string;
  fiscal: string;
  closedAtDraw: number | null;
  drawnCount: number;
  status: "PENDING" | "WINNER";
  createdAt: string;
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" });

// FILA DE AVISOS DE BINGO: todo aviso válido aparece aqui (ninguém é recusado por já haver outro).
// O locutor decide na hora, com os ganhadores: um só ganha (os outros cedem) ou o prêmio é dividido.
export default function ClaimsQueue({ eventId, claims, onChanged }: { eventId: string; claims: QueueClaim[]; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  // null = o locutor ainda não mexeu: vale a SUGESTÃO (quem fechou primeiro). Calculado direto, sem efeito,
  // para o botão já aparecer certo na primeira tela.
  const [picked, setPicked] = useState<Set<string> | null>(null);

  const queue = useMemo(() => orderClaims(claims.filter((c) => c.status === "PENDING")), [claims]);
  const summary = useMemo(() => summarizeQueue(queue), [queue]);

  const selected = useMemo(() => {
    if (picked === null) return new Set(summary.suggestedId ? [summary.suggestedId] : []);
    const ids = new Set(queue.map((c) => c.id)); // avisos que saíram da fila deixam de contar
    return new Set([...picked].filter((id) => ids.has(id)));
  }, [picked, queue, summary.suggestedId]);

  if (queue.length === 0) return null;

  const chosen = queue.filter((c) => selected.has(c.id));
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const release = () =>
    startTransition(async () => {
      const res = await releaseWinners(eventId, chosen.map((c) => c.id));
      if (!res.success) alert(res.error);
      setPicked(null);
      onChanged();
    });

  const discard = (id: string, name: string) => {
    if (!window.confirm(`Descartar o aviso de ${name}? Ele sai da fila (o fiscal pode reenviar com o nome corrigido).`)) return;
    startTransition(async () => {
      const res = await discardClaim(eventId, id);
      if (!res.success) alert(res.error);
      onChanged();
    });
  };

  const label =
    chosen.length === 0
      ? "Escolha o(s) ganhador(es)"
      : chosen.length === 1
        ? `🎉 SOLTAR NO TELÃO: ${chosen[0].name}`
        : `🎉 DIVIDIR O PRÊMIO: ${chosen.length} ganhadores`;

  return (
    <div className="bg-amber-500 text-black p-5 md:p-6 rounded-3xl border-4 border-white shadow-[0_0_30px_rgba(245,158,11,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <p className="font-black uppercase text-xs tracking-tighter">
          🚨 {queue.length} aviso{queue.length === 1 ? "" : "s"} de bingo no pátio
        </p>
        {summary.isRealTie && (
          <p className="bg-black text-amber-300 text-xs font-black uppercase px-3 py-1 rounded-full">
            ⚖️ Empate: {summary.tiedIds.length} cartelas fecharam na MESMA pedra (nº {summary.firstDraw})
          </p>
        )}
      </div>
      <p className="text-sm font-bold mb-4">
        {queue.length === 1 ? "Confira e solte o telão." : "Decida com os ganhadores: um só ganha (os outros cedem) ou dividam o prêmio."}
      </p>

      <ul className="space-y-2 mb-4">
        {queue.map((c) => (
          <li key={c.id} className="flex items-center gap-3 bg-white/90 rounded-2xl px-4 py-3">
            <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="w-6 h-6 accent-black shrink-0" />
              <span className="min-w-0">
                <span className="block text-xl font-black truncate">Cartela {c.card} — {c.name}</span>
                <span className="block text-xs font-bold text-black/60">
                  {c.closedAtDraw ? `fechou na pedra nº ${c.closedAtDraw}` : "pedra não identificada"} • avisou às {hora(c.createdAt)} • fiscal {c.fiscal}
                </span>
              </span>
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => discard(c.id, c.name)}
              className="shrink-0 text-xs font-black text-black/70 hover:text-black underline underline-offset-2 disabled:opacity-50"
            >
              Descartar
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={release}
        disabled={pending || chosen.length === 0}
        className="w-full bg-black text-white font-black text-lg px-6 py-4 rounded-2xl disabled:opacity-50 hover:bg-slate-900 transition"
      >
        {pending ? "Soltando…" : label}
      </button>
      {chosen.length >= 2 && <p className="text-xs font-bold mt-2">O telão vai mostrar os nomes de todos os ganhadores.</p>}
      {chosen.length === 1 && queue.length > 1 && <p className="text-xs font-bold mt-2">Os demais avisos ficam registrados como “cederam”.</p>}
    </div>
  );
}
