// src/app/[subdomain]/cartela/[shortId]/InteractiveCard.tsx
"use client";

import { useState, useEffect } from "react";

const LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

interface InteractiveCardProps {
  shortId: string;
  matrix: Record<string, number[]>;
  sponsors: any[];
}

export default function InteractiveCard({ shortId, matrix, sponsors }: InteractiveCardProps) {
  // Estado para armazenar os números marcados
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Efeito para carregar marcações antigas do localStorage
  useEffect(() => {
    const savedMarks = localStorage.getItem(`bingo_marks_${shortId}`);
    if (savedMarks) {
      setMarkedNumbers(JSON.parse(savedMarks));
    }
    setIsLoaded(true);
  }, [shortId]);

  // Função para alternar a marcação (Dauber Effect)
  const toggleMark = (num: number) => {
    setMarkedNumbers((prev) => {
      const newMarks = prev.includes(num)
        ? prev.filter((n) => n !== num) // Desmarca
        : [...prev, num]; // Marca

      // Salva instantaneamente no localStorage
      localStorage.setItem(`bingo_marks_${shortId}`, JSON.stringify(newMarks));
      return newMarks;
    });
  };

  const clearCard = () => {
    if (confirm("Deseja apagar todas as marcações?")) {
      setMarkedNumbers([]);
      localStorage.removeItem(`bingo_marks_${shortId}`);
    }
  };

  if (!isLoaded) return <div className="animate-pulse h-96 bg-slate-200 rounded-2xl w-full"></div>;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      {/* GRID DA CARTELA DIGITAL */}
      <div className="p-4">
        <div className="flex justify-between w-full mb-2">
          {LETTERS.map((letter) => (
            <div key={letter} className="flex-1 text-center font-black text-2xl text-slate-800">
              {letter}
            </div>
          ))}
        </div>

        <div className="flex justify-between w-full gap-1">
          {LETTERS.map((letter) => (
            <div key={letter} className="flex-1 flex flex-col gap-1">
              {matrix[letter].map((num, rowIndex) => {
                const isFree = letter === 'N' && rowIndex === 2;
                const isMarked = markedNumbers.includes(num);

                return (
                  <button
                    key={`${letter}-${rowIndex}`}
                    onClick={() => !isFree && toggleMark(num)}
                    disabled={isFree}
                    className={`
                      w-full aspect-square rounded-full flex items-center justify-center text-lg sm:text-xl font-bold transition-all duration-200 ease-in-out select-none
                      ${isFree ? 'bg-blue-600 text-white shadow-inner scale-95 cursor-default' 
                               : isMarked 
                                  ? 'bg-emerald-500 text-white scale-95 shadow-inner' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'}
                    `}
                  >
                    {isFree ? '★' : num}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* CONTROLES DO JOGADOR */}
      <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
        <button 
          onClick={clearCard}
          className="text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors"
        >
          Limpar Cartela
        </button>
        <div className="text-sm font-bold text-slate-800">
          Faltam: {24 - markedNumbers.length}
        </div>
      </div>

      {/* ÁREA DE PATROCINADORES (Monetização) */}
      {sponsors.length > 0 && (
        <div className="bg-slate-800 p-4 flex gap-4 overflow-x-auto snap-x">
          {sponsors.map((s) => (
            <div key={s.id} className="snap-center shrink-0 flex flex-col items-center bg-slate-700 rounded-xl p-2 min-w-[80px]">
               {/* Aqui renderizamos a imagem do patrocinador. Espaço nobre! */}
               <div className="w-8 h-8 rounded bg-white mb-1 overflow-hidden flex items-center justify-center">
                 {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="w-full object-contain" /> : <span className="text-xs">Logo</span>}
               </div>
               <span className="text-[10px] text-slate-300 font-bold truncate w-full text-center">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}