"use client";

import { useState, useTransition } from "react";
import useSWR from "swr";
import { drawNextNumber, resetGame } from "@/actions/bingo";

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
  const latestNumber: number | null = data?.latest || null;

  // 🎯 efeito cassino (animação fake antes do resultado real)
  const animateDraw = async (finalNumber: number) => {
    setSpinning(true);

    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 60));
      setDisplayNumber(Math.floor(Math.random() * 75) + 1);
    }

    setDisplayNumber(finalNumber);
    setSpinning(false);

    // 🔊 som opcional (coloque um mp3 em /public/sounds/draw.mp3)
    try {
      new Audio("/sounds/draw.mp3").play();
    } catch {}
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
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-[#d4af37] tracking-wide">
          🎰 {eventName}
        </h1>

        <div className="flex gap-4">
          {sponsors.slice(0, 3).map((s) =>
            s.logoUrl ? (
              <img
                key={s.id}
                src={s.logoUrl}
                className="h-10 opacity-80"
              />
            ) : null
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* CONTROLE */}
        <div className="flex flex-col items-center justify-center space-y-6 bg-[#111827] p-8 rounded-2xl border border-[#1f2937]">
          
          <div className="w-56 h-56 bg-black rounded-full flex items-center justify-center border-[6px] border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.25)]">
            <span className={`text-[110px] font-black text-[#d4af37] ${spinning ? "animate-pulse" : ""}`}>
              {displayNumber || "--"}
            </span>
          </div>

          <button
            onClick={handleDraw}
            disabled={isPending || drawnNumbers.length >= 75}
            className="
              w-full py-5 
              bg-gradient-to-r from-[#d4af37] to-yellow-500 
              text-black font-black text-xl 
              rounded-xl 
              shadow-[0_0_20px_rgba(212,175,55,0.4)] 
              hover:scale-105 transition
              disabled:opacity-40
            "
          >
            {isPending ? "Sorteando..." : "🎯 Sortear Número"}
          </button>

          <button
            onClick={handleReset}
            disabled={isPending}
            className="text-red-400 hover:underline text-sm"
          >
            Resetar jogo
          </button>
        </div>

        {/* GRID */}
        <div className="lg:col-span-2">
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-300">
              Painel de Números
            </h2>
            <span className="font-mono text-sm text-gray-400">
              {drawnNumbers.length} / 75
            </span>
          </div>

          <div className="grid grid-cols-10 gap-3">
            {Array.from({ length: 75 }, (_, i) => i + 1).map((num) => {
              const isDrawn = drawnNumbers.includes(num);

              return (
                <div
                  key={num}
                  className={`
                    h-12 flex items-center justify-center rounded-lg text-lg font-bold
                    border border-[#1f2937]
                    ${
                      isDrawn
                        ? "bg-[#10b981] text-black shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                        : "bg-black text-gray-500"
                    }
                  `}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}