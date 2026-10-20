// src/app/[subdomain]/verify/verifyClient.tsx
"use client";

import { useState, useTransition } from "react";
import { alertLocutor } from "@/actions/bingo";
import { Trophy, Send, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import type { UnpaidAdvice } from "@/lib/unpaidAdvice";

interface Props {
  eventId: string;
  shortId: string;
  validation: any;
  verifierName: string;
  advice?: UnpaidAdvice | null; // só quando a cartela não está paga: com quem está e o próximo passo
}

export default function VerifyClient({ eventId, shortId, validation, verifierName, advice }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isSent, setIsSent] = useState(false);

  const handleAlert = () => {
    const winnerName = prompt("Nome completo do ganhador (para o telão):");
    if (!winnerName || winnerName.trim() === "") return;

    startTransition(async () => {
      const result = await alertLocutor(eventId, shortId, winnerName.trim());
      
      if (result?.success) {
        setIsSent(true);
      } else {
        alert(result?.error || "Erro ao enviar alerta para o locutor.");
      }
    });
  };

  // ── Não paga: avisa, mostra COM QUEM está e oferece (de forma discreta) o caminho para regularizar ──
  if (validation?.reason === "NOT_PAID") {
    return (
      <div className="mt-8 bg-red-500/10 border border-red-500/50 rounded-2xl p-5">
        <div className="flex gap-3">
          <AlertTriangle size={22} className="text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-red-400">CARTELA NÃO PAGA</p>
            <p className="text-sm text-red-400/80">Pagamento do prêmio está proibido.</p>
            {advice && <p className="text-sm text-slate-200 mt-3">{advice.headline}</p>}
          </div>
        </div>
        {advice?.action && (
          <a
            href={advice.action.href}
            className="mt-4 flex items-center justify-center rounded-xl border border-red-400/40 text-red-100 hover:bg-red-500/10 px-4 py-2.5 text-sm font-bold transition"
          >
            {advice.action.label} →
          </a>
        )}
        {advice && <p className="text-[11px] text-slate-500 mt-3">{advice.note}</p>}
      </div>
    );
  }

  // ── Outros recusados (bloqueada, sem permissão…): mostra o motivo em vez de uma tela vazia ──
  if (!validation?.success) {
    if (!validation?.error) return null;
    return (
      <div className="mt-8 bg-red-500/10 border border-red-500/50 rounded-2xl p-5 flex gap-3">
        <Ban size={22} className="text-red-400 shrink-0 mt-0.5" />
        <p className="text-sm font-bold text-red-300">{validation.error}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {validation.isWinner ? (
        <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-3xl p-6 text-center">
          <div className="flex justify-center mb-4 text-emerald-400">
            <Trophy size={52} />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">BINGO!</h2>
          <p className="text-emerald-400 font-bold mb-6">{validation.winMessage}</p>

          {isSent ? (
            <div className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2">
              <CheckCircle2 size={24} /> Aviso enviado ao locutor!
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAlert}
              disabled={isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <Send size={20} />
              {isPending ? "ENVIANDO..." : "AVISAR LOCUTOR"}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 text-center">
          {validation.winMessage}
        </div>
      )}

    </div>
  );
}