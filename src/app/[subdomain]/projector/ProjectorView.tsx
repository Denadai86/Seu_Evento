"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Trophy, Star } from "lucide-react";
import confetti from "canvas-confetti"; // Certifique-se de rodar pnpm add canvas-confetti e pnpm add -D @types/canvas-confetti

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro na rede");
  return res.json();
};

export default function ProjectorView({ eventId, eventName, initialDrawn, sponsors }: any) {
  const { data } = useSWR(`/api/bingo/state?eventId=${eventId}`, fetcher, {
    refreshInterval: 1500,
    fallbackData: { drawnNumbers: initialDrawn, latest: null, showBoard: true, bingoConfirmed: false }
  });

  const bingoConfirmed = data?.bingoConfirmed;
  const winnerName = data?.pendingWinnerName || "Ganhador";

  // Dispara confetes de forma elegante (não exagerada)
  useEffect(() => {
    if (bingoConfirmed) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [bingoConfirmed]);

  return (
    <div className="relative min-h-screen bg-[#081a0e] text-white overflow-hidden font-sans">
      
      {/* O Tabuleiro e a Bola (Ocultos se houver Bingo para dar foco total) */}
      <div className={`transition-all duration-1000 ${bingoConfirmed ? 'blur-2xl opacity-20 scale-95' : 'opacity-100'}`}>
        {/* ... (Todo o código anterior do tabuleiro e bola vai aqui) ... */}
        <div className="p-12 text-center">
             <h1 className="text-4xl font-black text-yellow-500 uppercase tracking-widest">{eventName}</h1>
             {/* Componentes da bola e grid que já tínhamos */}
        </div>
      </div>

      {/* 🎊 OVERLAY DE CELEBRAÇÃO PREMIUM */}
      {bingoConfirmed && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-700">
          
          <div className="relative flex flex-col items-center">
            {/* Ícone de Estrela com Brilho */}
            <div className="absolute -top-24 text-yellow-400 animate-bounce">
              <Star size={80} fill="currentColor" />
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-emerald-400 text-2xl font-black uppercase tracking-[0.5em] animate-pulse">
                Temos um Ganhador!
              </h2>
              
              <div className="relative">
                <h3 className="text-9xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                  {winnerName.split(" (Ref:")[0]} {/* Limpa o log do fiscal no telão */}
                </h3>
                <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl -z-10 rounded-full" />
              </div>

              <div className="flex items-center justify-center gap-4 text-yellow-500 pt-8">
                <div className="h-px w-20 bg-yellow-500/30" />
                <Trophy size={40} />
                <div className="h-px w-20 bg-yellow-500/30" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}