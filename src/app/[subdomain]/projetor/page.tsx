"use client";

import { useState, useEffect } from "react";
import { getActiveEvent } from "../actions";

const getLetter = (num: number) => {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
};

const bingoBoard = {
  B: Array.from({ length: 15 }, (_, i) => i + 1),
  I: Array.from({ length: 15 }, (_, i) => i + 16),
  N: Array.from({ length: 15 }, (_, i) => i + 31),
  G: Array.from({ length: 15 }, (_, i) => i + 46),
  O: Array.from({ length: 15 }, (_, i) => i + 61),
};

export default function TelaProjetor() {
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const currentNumber = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;

  // Radar: Consulta o banco a cada 2 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getActiveEvent();
      if (res.success && res.event) {
        if (res.event.drawnNumbers.length !== drawnNumbers.length) {
          setDrawnNumbers(res.event.drawnNumbers);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [drawnNumbers.length]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-8 font-sans selection:bg-transparent overflow-hidden">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white italic">
            AÇÃO BINGO <span className="text-emerald-500">PRO</span>
          </h1>
          <p className="text-slate-400 text-xl font-medium tracking-wide mt-1">
            Projeção ao vivo
          </p>
        </div>
        <div className="text-right bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 shadow-inner">
          <p className="text-slate-500 font-bold uppercase text-sm tracking-widest mb-1">
            Números Sorteados
          </p>
          <p className="text-5xl font-black text-emerald-400">
            {drawnNumbers.length} <span className="text-3xl text-slate-600">/ 75</span>
          </p>
        </div>
      </header>

      <main className="flex-1 flex gap-12">
        
        {/* Lado Esquerdo: Último Número com Animação */}
        <section className="w-1/3 flex flex-col items-center justify-center bg-slate-900/50 rounded-[40px] border border-slate-800 shadow-2xl p-8 relative overflow-hidden">
          {/* Brilho de fundo */}
          <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] rounded-full" />
          
          <h2 className="text-2xl text-slate-500 font-bold mb-8 uppercase tracking-[0.3em] z-10">
            Último Sorteado
          </h2>
          
          {/* A propriedade KEY recria a div, forçando a animação CSS a rodar novamente */}
          <div 
            key={currentNumber || "empty"} 
            className="flex flex-col items-center justify-center h-96 w-full bg-slate-900 rounded-[32px] border-4 border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.25)] animate-[popIn_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] z-10"
          >
            {currentNumber ? (
              <>
                <span className="text-7xl font-black text-emerald-500 mb-2 opacity-80 tracking-tighter">
                  {getLetter(currentNumber)}
                </span>
                <span className="text-[16rem] leading-none font-black text-white tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                  {currentNumber.toString().padStart(2, "0")}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-slate-700 text-center px-4 uppercase tracking-widest animate-pulse">
                Aguardando...
              </span>
            )}
          </div>
        </section>

        {/* Lado Direito: Histórico (Grid) */}
        <section className="w-2/3 flex flex-col justify-center gap-5">
          {Object.entries(bingoBoard).map(([letter, numbers]) => (
            <div key={letter} className="flex gap-5 items-center">
              
              <div className="w-20 h-20 flex items-center justify-center bg-slate-900 text-emerald-400 text-5xl font-black rounded-2xl shadow-lg border-2 border-slate-800">
                {letter}
              </div>
              
              <div className="flex-1 grid grid-cols-15 gap-2">
                {numbers.map((num) => {
                  const isDrawn = drawnNumbers.includes(num);
                  const isLastDrawn = num === currentNumber;

                  return (
                    <div
                      key={num}
                      className={`h-20 flex items-center justify-center text-3xl font-black rounded-xl transition-all duration-500
                        ${
                          isLastDrawn
                            ? "bg-amber-400 text-slate-900 scale-110 shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse border-2 border-amber-200 z-10"
                            : isDrawn
                            ? "bg-emerald-500 text-slate-950 scale-100 shadow-lg shadow-emerald-500/20 border-2 border-emerald-400"
                            : "bg-slate-900 text-slate-700 border-2 border-slate-800/50"
                        }
                      `}
                      style={{ gridColumn: 'span 1 / span 1' }}
                    >
                      {num.toString().padStart(2, "0")}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}