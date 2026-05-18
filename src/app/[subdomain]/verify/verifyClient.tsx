// src/app/[subdomain]/verify/verifyClient.tsx
"use client";

import { useState, useTransition } from "react";
import { alertLocutor } from "@/actions/bingo";
import { Trophy, Send, AlertTriangle, CheckCircle2 } from "lucide-react"; // 🔥 CheckCircle2 adicionado!

interface Props {
  eventId: string;
  shortId: string;
  validation: any;
  verifierName: string;
}

export default function VerifyClient({ eventId, shortId, validation, verifierName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isSent, setIsSent] = useState(false); // 🔥 Novo estado para controlar o visual!

  const handleAlert = () => {
    const winnerName = prompt("Nome do Ganhador na mesa:");
    if (!winnerName) return;

    startTransition(async () => {
      // Enviamos o alerta para o locutor
      await alertLocutor(eventId, shortId, `${winnerName} (Ref: ${verifierName})`);
      // Em vez do alert() nativo, nós mudamos o estado do botão!
      setIsSent(true);
    });
  };

  if (!validation.success) return null;

  return (
    <div className="mt-8 space-y-4">
      {validation.isWinner ? (
        <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-3xl p-6 text-center animate-in zoom-in duration-300">
          <div className="flex justify-center mb-4 text-emerald-400">
            <Trophy size={48} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">BINGO DETECTADO!</h2>
          <p className="text-emerald-400 text-sm font-bold mb-6 italic">{validation.winMessage}</p>
          
          {/* 🔥 A MÁGICA DA RESPONSIVIDADE AQUI */}
          {isSent ? (
            <div className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={24} /> AVISO LÁ NO TELÃO!
            </div>
          ) : verifierName !== "Desconhecido" ? (
            <button
              onClick={handleAlert}
              disabled={isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50 disabled:scale-95"
            >
              <Send size={20} /> {isPending ? "ENVIANDO..." : "AVISAR LOCUTOR"}
            </button>
          ) : (
            <div className="mt-4 p-4 bg-black/40 border border-slate-700 rounded-xl text-slate-400 text-xs text-center">
              Apenas fiscais credenciados podem enviar o alerta para a mesa.
            </div>
          )}

        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center italic text-slate-400 text-sm">
          {validation.winMessage}
        </div>
      )}

      {!validation.isPaid && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex items-center gap-3 text-red-400">
          <AlertTriangle size={20} className="shrink-0" />
          <p className="text-xs font-bold leading-tight uppercase">
            Atenção: Cartela não paga. Pagamento de prêmio proibido!
          </p>
        </div>
      )}
    </div>
  );
}