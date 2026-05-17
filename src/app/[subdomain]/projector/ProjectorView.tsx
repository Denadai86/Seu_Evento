// src/app/[subdomain]/projector/ProjectorView.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Trophy, Star } from "lucide-react";
import confetti from "canvas-confetti";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro na rede");
  return res.json();
};

// Helper para pegar a Letra B-I-N-G-O (igual ao BingoGame)
const formatBall = (num: number | null) => {
  if (!num) return { letter: "", number: "--" };
  if (num <= 15) return { letter: "B", number: num };
  if (num <= 30) return { letter: "I", number: num };
  if (num <= 45) return { letter: "N", number: num };
  if (num <= 60) return { letter: "G", number: num };
  return { letter: "O", number: num };
};

export default function ProjectorView({ eventId, eventName, initialDrawn, sponsors }: any) {
  const [displayNumber, setDisplayNumber] = useState<number | null>(
    initialDrawn?.[initialDrawn.length - 1] || null
  );

  const { data } = useSWR(`/api/bingo/state?eventId=${eventId}`, fetcher, {
    refreshInterval: 1500,
    fallbackData: {
      drawnNumbers: initialDrawn || [],
      latest: null,
      showBoard: true,
      bingoConfirmed: false,
      pendingWinnerName: "",
      currentPrize: null,
    },
    // Atualiza o número exibido quando chega um novo sorteio
    onSuccess: (newData: { latest: any; }) => {
      const latest = newData?.latest;
      if (latest && latest !== displayNumber) {
        setDisplayNumber(latest);
      }
    },
  } as any);

  const drawnNumbers: number[] = data?.drawnNumbers || [];
  const bingoConfirmed = data?.bingoConfirmed;
  const winnerName = data?.pendingWinnerName || "Ganhador";
  const currentPrize = data?.currentPrize;
  const showBoard = data?.showBoard !== false;

  const currentBall = formatBall(displayNumber);

  const board = useMemo(() => [
    { letter: "B", range: [1, 15] },
    { letter: "I", range: [16, 30] },
    { letter: "N", range: [31, 45] },
    { letter: "G", range: [46, 60] },
    { letter: "O", range: [61, 75] },
  ], []);

  // Confetti ao confirmar bingo
  useEffect(() => {
    if (bingoConfirmed) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [bingoConfirmed]);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#113a20] via-[#081a0e] to-black text-white overflow-hidden font-sans">

      {/* Conteúdo principal — desfoca se houver bingo */}
      <div className={`transition-all duration-1000 ${bingoConfirmed ? "blur-2xl opacity-20 scale-95 pointer-events-none" : "opacity-100"}`}>

        {/* HEADER */}
        <div className="flex flex-col items-center pt-12 pb-6 gap-2">
          <h1 className="text-5xl font-black text-[#fef08a] tracking-widest uppercase drop-shadow-[0_2px_20px_rgba(254,240,138,0.3)]">
            {eventName}
          </h1>

          {/* Prêmio atual */}
          {currentPrize && (
            <div className="mt-4 flex items-center gap-4 bg-violet-900/40 border border-violet-500/40 px-6 py-4 rounded-2xl">
              <Trophy size={24} className="text-violet-400 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">
                  Rodada da Vez • {currentPrize.name}
                </p>
                <p className="text-violet-200 font-black text-2xl">
                  {currentPrize.prizeName}
                  <span className="text-sm font-normal opacity-60 ml-2">
                    ({currentPrize.type === "QUINA" ? "Quina" : "Cartela Cheia"})
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col xl:flex-row items-center xl:items-start justify-center gap-12 px-8 pb-12">

          {/* BOLA */}
          <div className="flex flex-col items-center gap-8 shrink-0">
            <div className="w-72 h-72 rounded-full flex items-center justify-center relative bg-[radial-gradient(circle_at_35%_25%,_#fef08a_0%,_#eab308_25%,_#a16207_80%,_#422006_100%)] shadow-[inset_-16px_-16px_32px_rgba(0,0,0,0.6),_inset_8px_8px_16px_rgba(255,255,255,0.4),_0_30px_60px_rgba(0,0,0,0.7)] border border-[#ca8a04]/30">
              <div className="flex flex-col items-center justify-center leading-none">
                <span className="text-4xl font-bold text-black/40 -mb-2 tracking-widest">
                  {currentBall.letter}
                </span>
                <span className="text-[130px] font-black text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)] leading-none">
                  {currentBall.number}
                </span>
              </div>
            </div>

            <div className="text-center text-[#fef08a]/50 font-mono text-xl">
              Pedras: <strong className="text-[#fef08a]">{drawnNumbers.length}</strong> / 75
            </div>

            {/* Sponsors */}
            {sponsors?.length > 0 && (
              <div className="flex items-center gap-6 mt-2">
                {sponsors.slice(0, 4).map((s: any) =>
                  s.logoUrl ? (
                    <img key={s.id} src={s.logoUrl} className="h-10 opacity-70 object-contain" alt={s.name} />
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* GRADE B-I-N-G-O */}
          {showBoard && (
            <div className="flex-1 max-w-3xl bg-black/40 p-8 rounded-3xl border border-emerald-900/50 shadow-2xl backdrop-blur-sm">
              <div className="flex flex-col gap-3">
                {board.map((row) => (
                  <div key={row.letter} className="flex items-center gap-3">
                    <div className="w-14 h-14 shrink-0 bg-gradient-to-br from-[#fef08a] to-[#ca8a04] text-black rounded-xl flex items-center justify-center text-3xl font-black shadow-lg border border-yellow-200/50">
                      {row.letter}
                    </div>
                    <div className="flex-1 grid grid-cols-15 gap-2">
                      {Array.from({ length: 15 }, (_, i) => i + row.range[0]).map((num) => {
                        const isDrawn = drawnNumbers.includes(num);
                        return (
                          <div
                            key={num}
                            className={`h-14 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-300 border ${
                              isDrawn
                                ? "bg-gradient-to-b from-[#fef08a] to-[#ca8a04] text-black scale-105 border-yellow-200/50 shadow-[0_0_15px_rgba(202,138,4,0.4)]"
                                : "bg-black/40 text-emerald-900 border-emerald-900/30"
                            }`}
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
          )}
        </div>
      </div>

      {/* 🎊 OVERLAY DE CELEBRAÇÃO */}
      {bingoConfirmed && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-700">
          <div className="relative flex flex-col items-center">
            <div className="absolute -top-24 text-yellow-400 animate-bounce">
              <Star size={80} fill="currentColor" />
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-emerald-400 text-2xl font-black uppercase tracking-[0.5em] animate-pulse">
                Temos um Ganhador!
              </h2>

              <div className="relative">
                <h3 className="text-9xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                  {winnerName.split(" (Ref:")[0]}
                </h3>
                <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl -z-10 rounded-full" />
              </div>

              <div className="flex items-center justify-center gap-4 text-yellow-500 pt-8">
                <div className="h-px w-20 bg-yellow-500/30" />
                <Trophy size={40} />
                <div className="h-px w-20 bg-yellow-500/30" />
              </div>

              {currentPrize && (
                <p className="text-violet-300 text-xl font-bold mt-4">
                  🏆 {currentPrize.prizeName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}