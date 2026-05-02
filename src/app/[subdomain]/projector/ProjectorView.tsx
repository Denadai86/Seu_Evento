// src/app/[subdomain]/projector/ProjectorView.tsx

"use client";

import useSWR from "swr";
import { useMemo } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface Props {
  eventId: string;
  eventName: string;
  initialDrawn: number[];
  sponsors: Sponsor[];
}

export default function ProjectorView({
  eventId,
  eventName,
  sponsors,
}: Props) {
  const { data, error } = useSWR(`/api/bingo/state?eventId=${eventId}`, fetcher, {
    refreshInterval: 1500,
    revalidateOnFocus: false,
  });

  const drawnNumbers: number[] = data?.drawnNumbers || [];
  const latestNumber: number | null = data?.latest || null;

  const board = useMemo(() => {
    return [
      { letter: "B", range: [1, 15] },
      { letter: "I", range: [16, 30] },
      { letter: "N", range: [31, 45] },
      { letter: "G", range: [46, 60] },
      { letter: "O", range: [61, 75] },
    ];
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-3xl">
        Erro ao conectar com a mesa.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-3xl animate-pulse">
        Sincronizando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-8 bg-gradient-to-b from-[#050505] to-[#0b0b0b]">
      
      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-wide text-white">
          {eventName}
        </h1>
        <p className="text-slate-500 uppercase tracking-widest text-sm mt-2">
          Bingo Ao Vivo
        </p>
      </div>

      {/* BOLA PRINCIPAL */}
      <div className="flex flex-col items-center justify-center mb-12">
        <div className="w-72 h-72 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-[0_0_80px_rgba(255,215,0,0.25)] border-8 border-yellow-200">
          <span className="text-9xl font-black text-black">
            {latestNumber || "--"}
          </span>
        </div>
      </div>

      {/* GRID */}
      <div className="flex-1 max-w-6xl mx-auto w-full bg-[#111] p-6 rounded-3xl border border-[#222] shadow-xl">
        {board.map((row) => (
          <div key={row.letter} className="flex items-center gap-4 mb-4">
            
            <div className="w-16 h-16 bg-yellow-500 text-black rounded-xl flex items-center justify-center text-3xl font-black shadow-lg">
              {row.letter}
            </div>

            <div className="flex-1 grid grid-cols-15 gap-2">
              {Array.from({ length: 15 }, (_, i) => i + row.range[0]).map((num) => {
                const isDrawn = drawnNumbers.includes(num);

                return (
                  <div
                    key={num}
                    className={`
                      h-14 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-300
                      ${
                        isDrawn
                          ? "bg-yellow-400 text-black scale-105 shadow-[0_0_12px_rgba(255,215,0,0.6)]"
                          : "bg-[#1a1a1a] text-slate-600"
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

      {/* RODAPÉ - PATROCINADORES */}
      {sponsors.length > 0 && (
        <div className="mt-10 flex justify-center gap-8 flex-wrap opacity-80">
          {sponsors.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm text-slate-400">
              {s.logoUrl && (
                <img src={s.logoUrl} className="h-6 object-contain" />
              )}
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}