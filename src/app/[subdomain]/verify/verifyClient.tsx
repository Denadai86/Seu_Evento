"use client";

import { useTransition } from "react";
import { alertLocutor } from "@/actions/bingo";
import { Trophy, Send, AlertTriangle } from "lucide-react";

interface Props {
  eventId: string;
  shortId: string;
  validation: any;
  verifierName: string; // Nome do usuário logado (Verifier)
}

export default function VerifyClient({ eventId, shortId, validation, verifierName }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleAlert = () => {
    // Logica: O sistema já sabe quem é o verifierName pela sessão
    const winnerName = prompt("Nome do Ganhador na mesa:");
    if (!winnerName) return;

    startTransition(async () => {
      // Enviamos o alerta para o locutor com o log de quem verificou
      await alertLocutor(eventId, shortId, `${winnerName} (Ref: ${verifierName})`);
      alert("Locutor avisado! Aguarde a celebração no telão.");
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
          
          <button
            onClick={handleAlert}
            disabled={isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40"
          >
            <Send size={20} /> {isPending ? "ENVIANDO..." : "AVISAR LOCUTOR"}
          </button>
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