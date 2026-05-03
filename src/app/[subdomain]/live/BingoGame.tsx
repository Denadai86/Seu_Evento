// src/app/[subdomain]/live/BingoGame.tsx

"use client";

import { useState, useTransition, useMemo } from "react";
import useSWR from "swr";
import { drawNextNumber, resetGame } from "@/actions/bingo";
import LogoutButton from "@/components/LogoutButton";
import { MonitorPlay } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BingoGameProps {
  eventId: string;
  eventName: string;
  initialDrawn: number[];
  sponsors: {
    id: string;
    name: string;
    logoUrl: string | null;
  }[];
}

export default function BingoGame({
  eventId,
  eventName,
  initialDrawn,
  sponsors,
}: BingoGameProps) {
  const [isPending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number | null>(
    initialDrawn[initialDrawn.length - 1] || null
  );

  const { data, mutate } = useSWR(
    `/api/bingo/state?eventId=${eventId}`,
    fetcher,
    {
      refreshInterval: 2000,
      fallbackData: {
        drawnNumbers: initialDrawn,
        latest: initialDrawn[initialDrawn.length - 1] || null,
      },
    }
  );

  const drawnNumbers: number[] = data?.drawnNumbers || [];
  
  // A Lógica visual B-I-N-G-O unificada!
  const board = useMemo(() => {
    return [
      { letter: "B", range: [1, 15] },
      { letter: "I", range: [16, 30] },
      { letter: "N", range: [31, 45] },
      { letter: "G", range: [46, 60] },
      { letter: "O", range: [61, 75] },
    ];
  }, []);

  const animateDraw = async (finalNumber: number) => {
    setSpinning(true);
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 60));
      setDisplayNumber(Math.floor(Math.random() * 75) + 1);
    }
    setDisplayNumber(finalNumber);
    setSpinning(false);
  };

  const handleDraw = () => {
    startTransition(async () => {
      const res = await drawNextNumber(eventId);
      if (res?.success) {
        await animateDraw(res.latest);
        mutate(
          { drawnNumbers: res.drawnNumbers, latest: res.latest },
          false
        );
      } else {
        alert(res?.error || "Erro ao sortear.");
      }
    });
  };

  const handleReset = () => {
    if (!confirm("Isso vai zerar a mesa. Tem certeza?")) return;
    startTransition(async () => {
      await resetGame(eventId);
      setDisplayNumber(null);
      mutate({ drawnNumbers: [], latest: null }, false);
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-8">
      
{/* HEADER E LOGOUT */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <h1 className="text-3xl font-black text-[#d4af37] tracking-wide">
          🎰 {eventName}
        </h1>

        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            {sponsors.slice(0, 3).map((s) =>
              s.logoUrl ? (
                <img
                  key={s.id}
                  src={s.logoUrl}
                  className="h-10 opacity-80 object-contain"
                  alt={s.name}
                />
              ) : null
            )}
          </div>
          
          {/* 🔥 NOVO: BOTÃO DO TELÃO DIRETO NA MESA DO LOCUTOR */}
          <div className="h-8 w-px bg-gray-800"></div>
          <a 
            href={`/projector?event=${eventId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-400 transition-colors"
            title="Abrir Telão do Público"
          >
            <MonitorPlay size={18} />
            <span className="hidden sm:inline">Telão</span>
          </a>

          {/* Botão de Sair que já estava aí */}
          <div className="h-8 w-px bg-gray-800"></div>
          <LogoutButton callbackUrl="/entrar" variant="dark" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">

        {/* CONTROLE DO LOCUTOR */}
        <div className="flex flex-col items-center justify-center space-y-6 bg-[#111827] p-8 rounded-3xl border border-[#1f2937] h-fit sticky top-8 shadow-2xl">
          <h2 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Painel de Sorteio</h2>
          
          <div className="w-56 h-56 bg-black rounded-full flex items-center justify-center border-[6px] border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.15)] relative">
            <span className={`text-[110px] font-black text-[#d4af37] ${spinning ? "animate-pulse blur-[1px]" : ""}`}>
              {displayNumber || "--"}
            </span>
          </div>

          <button
            onClick={handleDraw}
            disabled={isPending || drawnNumbers.length >= 75}
            className="
              w-full py-5 mt-4
              bg-gradient-to-r from-[#d4af37] to-yellow-500 
              text-black font-black text-xl 
              rounded-2xl 
              shadow-[0_0_20px_rgba(212,175,55,0.3)] 
              hover:scale-[1.02] active:scale-95 transition-all
              disabled:opacity-40 disabled:hover:scale-100
            "
          >
            {isPending ? "Processando..." : "🎯 Sortear Pedra"}
          </button>

          <div className="w-full pt-6 mt-2 border-t border-[#1f2937] text-center flex flex-col gap-3">
             <span className="text-gray-400 font-mono text-sm">
                Bolas na mesa: <strong className="text-white text-lg">{drawnNumbers.length}</strong> / 75
             </span>
             <button
              onClick={handleReset}
              disabled={isPending}
              className="text-red-400/60 hover:text-red-400 hover:underline text-xs transition-colors"
            >
              ⚠️ Resetar globo (Zerar tudo)
            </button>
          </div>
        </div>

        {/* GRID ORGANIZADA (B-I-N-G-O) */}
        <div className="xl:col-span-2 bg-[#111827] p-8 rounded-3xl border border-[#1f2937]">
          
          <div className="flex flex-col gap-4">
            {board.map((row) => (
              <div key={row.letter} className="flex items-center gap-4">
                
                {/* Letra da Linha */}
                <div className="w-12 h-12 shrink-0 bg-[#d4af37] text-black rounded-xl flex items-center justify-center text-2xl font-black shadow-lg">
                  {row.letter}
                </div>

                {/* Números da Linha */}
                <div className="flex-1 grid grid-cols-5 sm:grid-cols-15 gap-2">
                  {Array.from({ length: 15 }, (_, i) => i + row.range[0]).map((num) => {
                    const isDrawn = drawnNumbers.includes(num);

                    return (
                      <div
                        key={num}
                        className={`
                          h-12 rounded-lg flex items-center justify-center text-sm sm:text-base font-bold transition-all duration-300
                          ${
                            isDrawn
                              ? "bg-[#d4af37] text-black scale-105 shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                              : "bg-black/50 text-gray-600 border border-[#1f2937]"
                          }
                        `}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}