// src/app/imprimir/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Printer, Loader2, AlertCircle } from "lucide-react";

type Card = {
  id: string;
  shortId: string;
  matrix: {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
  };
};

type Sponsor = {
  id: string;
  name: string;
  logoUrl?: string;
};

type Data = {
  name: string;
  cards: Card[];
  sponsors: Sponsor[];
};

export default function PrintPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get("event");

        if (!eventId) throw new Error("EventId não informado na URL");

        // Busca rápida dos dados em JSON, sem processar arquivos binários
        const res = await fetch(`/api/get-print-data?eventId=${eventId}`);

        if (!res.ok) throw new Error("Erro ao buscar dados");

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(true);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-500 bg-slate-50">
        <AlertCircle size={48} className="mb-4" />
        <h1 className="text-2xl font-bold">Erro ao carregar as cartelas</h1>
        <p>Verifique se o evento existe e tente novamente.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-emerald-600 bg-slate-50">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h1 className="text-2xl font-black">Montando Lote de Cartelas...</h1>
        <p className="text-slate-500 font-medium">Isso pode levar alguns segundos para lotes grandes.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-black font-sans">
      
      {/* 🖨️ BARRA DE FERRAMENTAS (Fica invisível na impressão graças ao "print:hidden") */}
      <div className="print:hidden sticky top-0 w-full bg-white border-b border-slate-300 shadow-md p-4 px-8 flex justify-between items-center z-50">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{data.name}</h1>
          <p className="text-slate-500 font-medium">{data.cards.length} cartelas geradas e prontas para impressão</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            Dica: Nas opções de impressão, ative "Gráficos de plano de fundo".
          </p>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-500 font-black px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Printer size={20} />
            IMPRIMIR PDF (Ctrl+P)
          </button>
        </div>
      </div>

      {/* 📄 ÁREA DA FOLHA A4 */}
      <div className="p-8 print:p-0 w-full max-w-[210mm] mx-auto print:max-w-none print:w-full">
        {/* Grid de 2 colunas: Encaixa perfeitamente 4 cartelas por folha A4 em modo Retrato */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 print:gap-x-4 print:gap-y-8">
          {data.cards.map((card) => (
            <BingoCard key={card.id} card={card} eventName={data.name} sponsors={data.sponsors} />
          ))}
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧩 COMPONENTE DA CARTELA INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

function BingoCard({ card, eventName, sponsors }: { card: Card; eventName: string; sponsors: Sponsor[] }) {
  const letters = ["B", "I", "N", "G", "O"] as const;

  return (
    <div 
      className="flex flex-col bg-white border-[3px] border-black rounded-2xl overflow-hidden shadow-xl print:shadow-none break-inside-avoid page-break-inside-avoid"
      style={{ pageBreakInside: 'avoid' }} // Garante que a impressora nunca corte a cartela no meio
    >
      {/* HEADER DA CARTELA */}
      <div className="bg-black text-white text-center py-3 px-4 flex justify-between items-center border-b-2 border-black">
        <h2 className="font-black text-lg uppercase tracking-tight truncate max-w-[150px]">{eventName}</h2>
        <div className="text-right">
          <span className="text-[10px] text-gray-300 block leading-none">CÓDIGO</span>
          <span className="font-mono font-bold text-sm bg-white/20 px-2 py-0.5 rounded tracking-widest">{card.shortId}</span>
        </div>
      </div>

      {/* MATRIZ DE NÚMEROS */}
      <div className="p-2 flex-1">
        {/* Cabeçalho B-I-N-G-O */}
        <div className="grid grid-cols-5 gap-1 mb-1">
          {letters.map((letter) => (
            <div key={letter} className="bg-slate-200 text-black text-center font-black text-2xl py-1 rounded-sm">
              {letter}
            </div>
          ))}
        </div>

        {/* Linhas e Células (5x5) */}
        <div className="grid grid-cols-5 gap-1">
          {[0, 1, 2, 3, 4].map((rowIndex) => (
            letters.map((letter, colIndex) => {
              // Identifica o centro exato da cartela (Letra N, Linha 3)
              const isCenter = letter === "N" && rowIndex === 2;

              if (isCenter) {
                return (
                  <div key="center" className="aspect-square bg-black text-white rounded-sm flex flex-col items-center justify-center p-1 border-2 border-black">
                    <span className="font-black text-[10px] uppercase leading-tight text-center">Ação</span>
                    <span className="font-black text-[10px] uppercase leading-tight text-center">Leve</span>
                  </div>
                );
              }

              return (
                <div 
                  key={`${letter}-${rowIndex}`} 
                  className="aspect-square flex items-center justify-center font-black text-2xl border-2 border-slate-300 rounded-sm"
                >
                  {card.matrix[letter][rowIndex]}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* PATROCINADORES / RODAPÉ */}
      <div className="bg-slate-100 border-t-2 border-black p-2 flex justify-center items-center gap-3 min-h-[40px] flex-wrap">
        {sponsors.length > 0 ? (
          sponsors.slice(0, 3).map((sponsor) => (
            <div key={sponsor.id} className="flex items-center gap-1">
              {sponsor.logoUrl ? (
                <img src={sponsor.logoUrl} alt={sponsor.name} className="h-6 object-contain grayscale" />
              ) : (
                <span className="text-[10px] font-bold text-slate-600 uppercase">{sponsor.name}</span>
              )}
            </div>
          ))
        ) : (
          <span className="text-[10px] font-bold text-slate-400 uppercase">Boa sorte!</span>
        )}
      </div>
    </div>
  );
}