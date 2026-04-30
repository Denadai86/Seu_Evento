"use client";

import { useState } from "react";
import { drawNumber, resetEvent } from "../.././actions"; // Voltando 3 pastas para chegar no actions.ts

export default function BingoGame({ eventId, eventName, initialDrawn, sponsors }: {
  eventId: string,
  eventName: string,
  initialDrawn: number[],
  sponsors: any[]
}) {
  const [drawn, setDrawn] = useState<number[]>(initialDrawn);
  const [loading, setLoading] = useState(false);

  // A última bola sorteada
  const currentNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;

  const handleDraw = async () => {
    if (drawn.length >= 75) {
      alert("Todos os números já foram sorteados!");
      return;
    }

    setLoading(true);
    let nextNum;
    
    // O Globo virtual gira até achar uma bola que não saiu ainda
    do {
      nextNum = Math.floor(Math.random() * 75) + 1;
    } while (drawn.includes(nextNum));

    // Atualiza a tela instantaneamente (Optimistic UI)
    const newDrawn = [...drawn, nextNum];
    setDrawn(newDrawn);
    
    // AVISA O TELÃO:
    localStorage.setItem(`bingo_${eventId}`, JSON.stringify(newDrawn));

    // Salva no banco de dados em segundo plano
    await drawNumber(eventId, nextNum);
    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm("🚨 PERIGO: Isso vai zerar o sorteio atual. Deseja recomeçar?")) return;
    setLoading(true);
    await resetEvent(eventId);
    setDrawn([]);
    setLoading(false);
  };

  // Função para desenhar as linhas (B, I, N, G, O)
  const renderRow = (letter: string, start: number) => {
    const nums = Array.from({ length: 15 }, (_, i) => start + i);
    return (
      <div key={letter} className="flex items-center gap-2 mb-3">
        <div className="w-16 h-16 flex items-center justify-center bg-emerald-600 text-white font-black text-3xl rounded-2xl shadow-lg">
          {letter}
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          {nums.map(n => (
            <div
              key={n}
              className={`w-12 h-12 flex items-center justify-center rounded-full font-bold text-xl transition-all duration-500 ${
                drawn.includes(n) 
                  ? "bg-emerald-400 text-slate-900 scale-110 shadow-[0_0_20px_rgba(52,211,153,0.8)]" 
                  : "bg-slate-800 text-slate-500 opacity-50"
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
    <div className="flex flex-col lg:flex-row h-screen p-6 gap-6">
      
      {/* PAINEL ESQUERDO: Controles e Patrocinadores */}
      <div className="lg:w-1/3 flex flex-col gap-6">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
          <h1 className="text-3xl font-black text-white mb-1 leading-tight">{eventName}</h1>
          <p className="text-slate-400 text-sm">Bolas sorteadas: {drawn.length} de 75</p>
        </div>

        {/* Bola Atual */}
        <div className="bg-slate-900 flex-1 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
          <span className="text-slate-400 font-bold tracking-widest uppercase mb-4 z-10">Bola Atual</span>
          <div className="w-64 h-64 bg-slate-950 rounded-full border-8 border-emerald-500 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] z-10">
            <span className="text-9xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {currentNumber !== null ? currentNumber : "--"}
            </span>
          </div>
          
          <button 
            onClick={handleDraw}
            disabled={loading || drawn.length >= 75}
            className="mt-10 px-12 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-2xl rounded-2xl shadow-[0_10px_0_rgba(4,120,87,1)] active:shadow-[0_0px_0_rgba(4,120,87,1)] active:translate-y-2 transition-all z-10 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "GIRANDO..." : "SORTEAR BOLA"}
          </button>
          {/* Logo abaixo do botão de SORTEAR BOLA, adicione este botão: */}
          <button 
            onClick={() => window.open(`/projector?event=${eventId}`, 'Telao', 'width=1280,height=720,fullscreen=yes')}
            className="mt-4 px-6 py-2 border-2 border-slate-700 hover:border-emerald-500 text-slate-400 hover:text-emerald-400 font-bold text-sm rounded-xl transition-all z-10"
          >
            📺 ABRIR TELÃO (POPUP)
          </button>
        </div>

        {/* VITRINE DE PATROCINADORES */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
          <h3 className="text-amber-500 font-bold text-center text-sm uppercase tracking-widest mb-4">Apoio</h3>
          {sponsors.length === 0 ? (
            <p className="text-slate-500 text-center text-sm">Sem patrocinadores</p>
          ) : (
            <div className="flex flex-wrap justify-center items-center gap-6">
              {sponsors.map(s => (
                <div key={s.id} className="flex flex-col items-center">
                  {s.logoUrl ? (
                     <img src={s.logoUrl} alt={s.name} className="h-16 object-contain mb-2 filter drop-shadow-md brightness-110" />
                  ) : (
                     <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                       <span className="text-amber-500 text-2xl font-bold">{s.name.charAt(0)}</span>
                     </div>
                  )}
                  <span className="text-slate-300 font-bold text-xs text-center">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PAINEL DIREITO: O Painel de 75 Números */}
      <div className="lg:w-2/3 bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col justify-between">
        <div>
          {renderRow("B", 1)}
          {renderRow("I", 16)}
          {renderRow("N", 31)}
          {renderRow("G", 46)}
          {renderRow("O", 61)}
        </div>
        
        <div className="flex justify-end pt-6 border-t border-slate-800">
           <button 
             onClick={handleReset}
             className="text-red-500 hover:text-red-400 font-bold text-sm px-4 py-2 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
           >
             Zerar Sorteio
           </button>
        </div>
      </div>

    </div>
  );
}