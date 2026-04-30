"use client";

import { useEffect, useState } from "react";

export default function ProjectorView({ eventId, eventName, initialDrawn, sponsors }: {
  eventId: string, eventName: string, initialDrawn: number[], sponsors: any[]
}) {
  const [drawn, setDrawn] = useState<number[]>(initialDrawn);
  const currentNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;

  // A MÁGICA DO TEMPO REAL: Escuta o locutor pela memória do navegador
  useEffect(() => {
    // Garante que o estado inicial vá para a memória caso tenha sido aberto depois
    localStorage.setItem(`bingo_${eventId}`, JSON.stringify(drawn));

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `bingo_${eventId}` && e.newValue) {
        setDrawn(JSON.parse(e.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [eventId]);

  const renderRow = (letter: string, start: number) => {
    const nums = Array.from({ length: 15 }, (_, i) => start + i);
    return (
      <div key={letter} className="flex items-center gap-3 mb-4">
        <div className="w-20 h-20 flex items-center justify-center bg-emerald-600 text-white font-black text-5xl rounded-2xl shadow-lg">
          {letter}
        </div>
        <div className="flex gap-2 flex-1">
          {nums.map(n => (
            <div
              key={n}
              className={`flex-1 h-20 flex items-center justify-center rounded-xl font-bold text-3xl transition-all duration-500 ${
                drawn.includes(n) 
                  ? "bg-emerald-400 text-slate-900 scale-105 shadow-[0_0_30px_rgba(52,211,153,0.8)] z-10" 
                  : "bg-slate-800 text-slate-600"
              }`}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen p-8 gap-8 cursor-none pointer-events-none">
      
      {/* HEADER GIGANTE */}
      <header className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
         <div>
           <h1 className="text-6xl font-black text-white drop-shadow-md">{eventName}</h1>
           <p className="text-emerald-400 text-xl font-bold mt-2 uppercase tracking-widest">Sorteio ao Vivo</p>
         </div>
         
         {/* Bola Atual Gigante */}
         <div className="flex items-center gap-6 bg-slate-950 p-4 rounded-3xl border-2 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <span className="text-slate-400 text-2xl font-bold uppercase tracking-widest pl-4">Bola:</span>
            <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-inner">
               <span className="text-7xl font-black text-slate-950">{currentNumber !== null ? currentNumber : "--"}</span>
            </div>
         </div>
      </header>

      {/* PAINEL DE NÚMEROS */}
      <div className="flex-1 bg-slate-900/80 rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col justify-between">
        {renderRow("B", 1)}
        {renderRow("I", 16)}
        {renderRow("N", 31)}
        {renderRow("G", 46)}
        {renderRow("O", 61)}
      </div>

      {/* RODAPÉ DE PATROCINADORES */}
      {sponsors.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-center gap-12 overflow-hidden h-32">
          <span className="text-slate-500 font-bold uppercase tracking-widest">Apoio:</span>
          {sponsors.map(s => (
            <div key={s.id} className="flex items-center gap-4">
              {s.logoUrl && <img src={s.logoUrl} alt={s.name} className="h-20 object-contain filter drop-shadow-lg" />}
              <span className="text-white font-bold text-2xl">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}