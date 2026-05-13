// src/app/[subdomain]/projector/ProjectorView.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Trophy } from "lucide-react"; // 🔥 Import do ícone adicionado

// 1. Fetcher blindado que dispara erro se a rede falhar
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha na sincronização com o servidor");
  return res.json();
};

interface Sponsor { id: string; name: string; logoUrl?: string | null; }
interface Props { eventId: string; eventName: string; initialDrawn: number[]; sponsors: Sponsor[]; }

// Helper para pegar a Letra B-I-N-G-O
const formatBall = (num: number | null) => {
  if (!num) return { letter: "", number: "--" };
  if (num <= 15) return { letter: "B", number: num };
  if (num <= 30) return { letter: "I", number: num };
  if (num <= 45) return { letter: "N", number: num };
  if (num <= 60) return { letter: "G", number: num };
  return { letter: "O", number: num };
};

export default function ProjectorView({ eventId, eventName, initialDrawn, sponsors }: Props) {
  const [displayNumber, setDisplayNumber] = useState<number | null>(initialDrawn[initialDrawn.length - 1] || null);
  const [spinning, setSpinning] = useState(false);

  // SWR busca os dados em tempo real
  const { data, error } = useSWR(`/api/bingo/state?eventId=${eventId}`, fetcher, {
    refreshInterval: 1500, 
    revalidateOnFocus: false,
    fallbackData: {
      drawnNumbers: initialDrawn,
      latest: initialDrawn[initialDrawn.length - 1] || null,
      showBoard: true,
      currentPrize: null // Estado inicial do prêmio
    }
  });

  // 🔥 AGORA SIM: Extraímos os dados AQUI DENTRO, depois do useSWR
  const drawnNumbers: number[] = data?.drawnNumbers || [];
  const latestNumber: number | null = data?.latest || null;
  const showBoard = data?.showBoard !== false;
  const currentPrize = data?.currentPrize || null;

  const board = useMemo(() => [
    { letter: "B", range: [1, 15] }, { letter: "I", range: [16, 30] },
    { letter: "N", range: [31, 45] }, { letter: "G", range: [46, 60] },
    { letter: "O", range: [61, 75] },
  ], []);

  useEffect(() => {
    if (latestNumber && latestNumber !== displayNumber && !spinning) {
      const animate = async () => {
        setSpinning(true);
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 50));
          setDisplayNumber(Math.floor(Math.random() * 75) + 1);
        }
        setDisplayNumber(latestNumber);
        setSpinning(false);
      };
      animate();
    } else if (!latestNumber && displayNumber) {
      setDisplayNumber(null);
    }
  }, [latestNumber, displayNumber, spinning]);

  const currentBall = formatBall(displayNumber);

  if (error) return <div className="min-h-screen flex items-center justify-center text-3xl text-red-500 bg-black">Erro de conexão com o painel.</div>;

  return (
    <div className="min-h-screen flex flex-col p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#113a20] via-[#081a0e] to-black font-sans">
      
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black tracking-wide text-[#fef08a] drop-shadow-[0_2px_15px_rgba(254,240,138,0.3)]">{eventName}</h1>
        <p className="text-emerald-400/60 uppercase tracking-widest text-lg mt-3 font-bold">Bingo Ao Vivo</p>
      </div>

      {/* 🔥 FAIXA DO PRÊMIO NO TELÃO */}
      {currentPrize && (
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-gradient-to-r from-violet-900/80 to-purple-900/80 border border-violet-400/30 text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest inline-flex items-center gap-3 shadow-[0_0_30px_rgba(139,92,246,0.4)] backdrop-blur-md">
            <Trophy size={24} className="text-yellow-400" />
            <span className="text-lg">
              {currentPrize.name} • <span className="text-yellow-400 font-black">{currentPrize.prizeName}</span> 
              <span className="text-violet-300 ml-2">({currentPrize.type === "QUINA" ? "Quina" : "Cartela Cheia"})</span>
            </span>
          </div>
        </div>
      )}

      {/* BOLA 3D COM LETRA E ANIMAÇÃO */}
      <div className="flex flex-col items-center justify-center mb-12">
        <div className="w-80 h-80 rounded-full flex items-center justify-center relative bg-[radial-gradient(circle_at_35%_25%,_#fef08a_0%,_#eab308_25%,_#a16207_80%,_#422006_100%)] shadow-[inset_-24px_-24px_48px_rgba(0,0,0,0.6),_inset_12px_12px_24px_rgba(255,255,255,0.4),_0_30px_60px_rgba(0,0,0,0.7)] border border-[#ca8a04]/40">
          <div className={`flex flex-col items-center justify-center leading-none ${spinning ? "animate-pulse blur-[1px]" : ""}`}>
            <span className="text-5xl font-bold text-black/40 -mb-3 tracking-widest">{currentBall.letter}</span>
            <span className="text-[140px] font-black text-black drop-shadow-[0_3px_3px_rgba(255,255,255,0.3)]">{currentBall.number}</span>
          </div>
        </div>
      </div>

      {showBoard ? (
        <div className="flex-1 max-w-7xl mx-auto w-full bg-black/40 p-8 rounded-[40px] border border-emerald-900/50 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col gap-5">
            {board.map((row) => (
              <div key={row.letter} className="flex items-center gap-5">
                <div className="w-20 h-20 shrink-0 bg-gradient-to-br from-[#fef08a] to-[#ca8a04] text-black rounded-2xl flex items-center justify-center text-5xl font-black shadow-lg border border-yellow-200/50">{row.letter}</div>
                <div className="flex-1 grid grid-cols-15 gap-2 md:gap-3">
                  {Array.from({ length: 15 }, (_, i) => i + row.range[0]).map((num) => {
                    const isDrawn = drawnNumbers.includes(num);
                    return (
                      <div key={num} className={`h-16 md:h-20 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-black transition-all duration-500 border ${isDrawn ? "bg-gradient-to-b from-[#fef08a] to-[#ca8a04] text-black scale-105 border-yellow-200/50 shadow-[0_0_20px_rgba(202,138,4,0.5)]" : "bg-black/40 text-emerald-900 border-emerald-900/30"}`}>
                        {num}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
          <h2 className="text-5xl md:text-7xl font-black text-emerald-900/40 uppercase tracking-[0.2em] drop-shadow-sm mt-10">Atenção à<br/>Pedra Sorteada</h2>
        </div>
      )}

      {sponsors.length > 0 && (
        <div className="mt-12 flex justify-center gap-12 flex-wrap items-center bg-black/30 p-6 rounded-3xl border border-emerald-900/30 max-w-5xl mx-auto backdrop-blur-sm">
          {sponsors.map((s) => s.logoUrl && <img key={s.id} src={s.logoUrl} className="h-12 object-contain drop-shadow-md opacity-90" alt={s.name} />)}
        </div>
      )}
    </div>
  );
}