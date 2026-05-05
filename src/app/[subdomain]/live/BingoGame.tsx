// src/app/[subdomain]/live/BingoGame.tsx

"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import useSWR from "swr";
import { drawNextNumber, resetGame, checkCard, toggleBoardVisibility, getEventCards } from "@/actions/bingo";
import LogoutButton from "@/components/LogoutButton";
import { MonitorPlay, Copy, CheckCircle2, Search, XCircle, Eye, EyeOff, Trophy } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BingoGameProps {
  eventId: string; eventName: string; initialDrawn: number[];
  sponsors: { id: string; name: string; logoUrl: string | null; }[];
}

// 🔥 Helper para pegar a Letra B-I-N-G-O
const formatBall = (num: number | null) => {
  if (!num) return { letter: "", number: "--" };
  if (num <= 15) return { letter: "B", number: num };
  if (num <= 30) return { letter: "I", number: num };
  if (num <= 45) return { letter: "N", number: num };
  if (num <= 60) return { letter: "G", number: num };
  return { letter: "O", number: num };
};

export default function BingoGame({ eventId, eventName, initialDrawn, sponsors }: BingoGameProps) {
  const [isPending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number | null>(initialDrawn[initialDrawn.length - 1] || null);

  const [auditCode, setAuditCode] = useState("");
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    getEventCards(eventId).then(res => setCards(res.cards)).catch(console.error);
  }, [eventId]);

  const { data, mutate } = useSWR(`/api/bingo/state?eventId=${eventId}`, fetcher, {
    refreshInterval: 2000, fallbackData: { drawnNumbers: initialDrawn, latest: initialDrawn[initialDrawn.length - 1] || null, showBoard: true },
  });

  const drawnNumbers: number[] = data?.drawnNumbers || [];
  const showBoard = data?.showBoard !== false;
  
  const board = useMemo(() => [
    { letter: "B", range: [1, 15] }, { letter: "I", range: [16, 30] },
    { letter: "N", range: [31, 45] }, { letter: "G", range: [46, 60] },
    { letter: "O", range: [61, 75] },
  ], []);

  const ranking = useMemo(() => {
    if (!cards.length || drawnNumbers.length === 0) return [];
    return cards.map(card => {
      const allNumbers = [...card.matrix.B, ...card.matrix.I, ...card.matrix.N.filter((_: any, i: number) => i !== 2), ...card.matrix.G, ...card.matrix.O];
      const hits = allNumbers.filter((n: number) => drawnNumbers.includes(n)).length;
      return { shortId: card.shortId, remaining: 24 - hits };
    }).filter(c => c.remaining <= 4).sort((a, b) => a.remaining - b.remaining).slice(0, 10);
  }, [cards, drawnNumbers]);

  const animateDraw = async (finalNumber: number) => {
    setSpinning(true);
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 60));
      setDisplayNumber(Math.floor(Math.random() * 75) + 1);
    }
    setDisplayNumber(finalNumber);
    setSpinning(false);
  };

  const handleDraw = () => {
    startTransition(async () => {
      const res = await drawNextNumber(eventId);
      if (res?.success) {
        await animateDraw(res.latest);
        mutate({ ...data, drawnNumbers: res.drawnNumbers, latest: res.latest }, false);
      }
    });
  };

  const handleReset = () => {
    if (!confirm("Isso vai zerar a mesa. Tem certeza?")) return;
    startTransition(async () => {
      await resetGame(eventId);
      setDisplayNumber(null);
      setAuditResult(null);
      mutate({ drawnNumbers: [], latest: null, showBoard: true }, false);
    });
  };

  const handleToggleBoard = () => {
    startTransition(async () => {
      await toggleBoardVisibility(eventId, !showBoard);
      mutate({ ...data, showBoard: !showBoard }, false);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/projector?event=${eventId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditCode) return;
    setAuditLoading(true); setAuditError(""); setAuditResult(null);
    const res = await checkCard(auditCode);
    if (res.success && res.card && res.card.eventId === eventId) setAuditResult(res.card);
    else setAuditError(res.card?.eventId !== eventId ? "Cartela de outro evento!" : "Cartela não encontrada.");
    setAuditLoading(false);
  };

  const currentBall = formatBall(displayNumber);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#113a20] via-[#081a0e] to-black text-white p-4 md:p-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-10 gap-6">
        <h1 className="text-3xl font-black text-[#fef08a] tracking-wide drop-shadow-[0_2px_10px_rgba(254,240,138,0.2)]">🎰 {eventName}</h1>
        <div className="flex flex-wrap items-center justify-center gap-4 xl:gap-6 bg-black/40 px-6 py-3 rounded-2xl border border-emerald-900/50 shadow-xl backdrop-blur-sm">
          <div className="flex gap-4">{sponsors.slice(0, 3).map((s) => s.logoUrl ? <img key={s.id} src={s.logoUrl} className="h-8 opacity-80 object-contain" alt={s.name} /> : null)}</div>
          <div className="hidden sm:block h-6 w-px bg-emerald-900/50"></div>
          <button onClick={() => window.open(`/projector?event=${eventId}`, 'Telao_Bingo', 'width=1280,height=720,toolbar=no,location=no,status=no,menubar=no,scrollbars=no')} className="flex items-center gap-2 text-sm font-bold text-emerald-200/70 hover:text-[#fef08a] transition-colors"><MonitorPlay size={18} /> <span className="hidden sm:inline">Telão Pop-up</span></button>
          <div className="hidden sm:block h-6 w-px bg-emerald-900/50"></div>
          <button onClick={handleCopyLink} className={`flex items-center gap-2 text-sm font-bold transition-colors ${copied ? "text-[#fef08a]" : "text-emerald-200/70 hover:text-[#fef08a]"}`}>{copied ? <CheckCircle2 size={18} /> : <Copy size={18} />} <span className="hidden sm:inline">{copied ? "Copiado!" : "Link do Telão"}</span></button>
          <div className="hidden sm:block h-6 w-px bg-emerald-900/50"></div>
          <LogoutButton callbackUrl="/entrar" variant="dark" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-[1400px] mx-auto">

        {/* COLUNA 1: SORTEIO E AUDITORIA */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center justify-center bg-black/40 p-8 rounded-3xl border border-emerald-900/50 shadow-2xl backdrop-blur-sm">
            <h2 className="text-emerald-400/60 font-black uppercase tracking-widest text-sm mb-6">Mesa de Sorteio</h2>
            
            {/* BOLA 3D COM LETRA E NÚMERO */}
            <div className="w-56 h-56 rounded-full flex items-center justify-center relative bg-[radial-gradient(circle_at_35%_25%,_#fef08a_0%,_#eab308_25%,_#a16207_80%,_#422006_100%)] shadow-[inset_-16px_-16px_32px_rgba(0,0,0,0.6),_inset_8px_8px_16px_rgba(255,255,255,0.4),_0_20px_40px_rgba(0,0,0,0.6)] border border-[#ca8a04]/30">
              <div className={`flex flex-col items-center justify-center leading-none ${spinning ? "animate-pulse blur-[1px]" : ""}`}>
                <span className="text-3xl font-bold text-black/40 -mb-2 tracking-widest">{currentBall.letter}</span>
                <span className="text-[100px] font-black text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)]">{currentBall.number}</span>
              </div>
            </div>

            <button onClick={handleDraw} disabled={isPending || drawnNumbers.length >= 75} className="w-full py-5 mt-8 bg-gradient-to-b from-[#fef08a] to-[#ca8a04] text-black font-black text-xl rounded-2xl shadow-[0_10px_20px_rgba(202,138,4,0.3),_inset_0_2px_0_rgba(255,255,255,0.5)] hover:scale-[1.02] hover:-translate-y-1 active:scale-95 active:translate-y-0 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:hover:translate-y-0">
              {isPending ? "Girando globo..." : "🎯 Sortear Pedra"}
            </button>

            <div className="w-full pt-6 mt-4 border-t border-emerald-900/30 text-center flex flex-col gap-3">
               <span className="text-emerald-200/50 font-mono text-sm">Pedras aclamadas: <strong className="text-[#fef08a] text-lg">{drawnNumbers.length}</strong> / 75</span>
               <button onClick={handleToggleBoard} disabled={isPending} className="mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-900/50 hover:bg-emerald-900/30 text-emerald-400 text-xs font-bold uppercase transition-colors">
                 {showBoard ? <Eye size={16} /> : <EyeOff size={16} className="text-amber-500" />} {showBoard ? "Ocultar Grade no Telão" : "Mostrar Grade no Telão"}
               </button>
               <button onClick={handleReset} disabled={isPending} className="text-red-400/50 hover:text-red-400 text-xs transition-colors mt-2">⚠️ Resetar globo de sorteio</button>
            </div>
          </div>

          {/* AUDITORIA */}
          <div className="bg-black/40 p-6 rounded-3xl border border-emerald-900/50 shadow-xl backdrop-blur-sm">
             <h2 className="text-emerald-400/60 font-black uppercase tracking-widest text-sm mb-4">Auditoria BINGO!</h2>
             <form onSubmit={handleAudit} className="flex gap-2">
               <input type="text" placeholder="Código. Ex: A9B2X1" value={auditCode} onChange={(e) => setAuditCode(e.target.value.toUpperCase())} className="flex-1 w-full min-w-0 bg-black/50 border border-emerald-900/50 rounded-xl px-3 text-[#fef08a] font-mono uppercase outline-none focus:border-[#ca8a04] transition-colors placeholder:text-emerald-900" maxLength={6}/>
               <button type="submit" disabled={auditLoading || !auditCode} className="bg-emerald-800 hover:bg-emerald-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50 shrink-0"><Search size={20} /></button>
             </form>
             {auditError && <div className="mt-4 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-xs rounded-xl flex items-center gap-2"><XCircle size={16} /> {auditError}</div>}
             {auditResult && (
               <div className="mt-4 p-4 bg-black/60 rounded-xl border border-emerald-900/30">
                 <p className="text-center text-[#fef08a] font-mono text-xs mb-3 font-bold tracking-widest">CARTELA: {auditResult.shortId}</p>
                 <div className="grid grid-cols-5 gap-1">
                   {["B", "I", "N", "G", "O"].map((l) => <div key={l} className="text-center font-black text-[10px] text-emerald-500 mb-1">{l}</div>)}
                   {[0, 1, 2, 3, 4].map((rowIndex) => (
                     ["B", "I", "N", "G", "O"].map((letter) => {
                       const num = (auditResult.matrix as any)[letter][rowIndex];
                       const isCenter = letter === "N" && rowIndex === 2;
                       const isHit = drawnNumbers.includes(num);
                       return (
                         <div key={`${letter}-${rowIndex}`} className={`aspect-square flex items-center justify-center text-[11px] font-bold rounded-md border ${isCenter ? "bg-[#ca8a04] text-black border-[#ca8a04]" : isHit ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-black/50 text-emerald-900 border-emerald-900/30"}`}>
                           {isCenter ? "⭐" : num}
                         </div>
                       );
                     })
                   ))}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* COLUNA 2 e 3: A GRID DO JOGO */}
        <div className="xl:col-span-2 bg-black/40 p-6 md:p-8 rounded-3xl border border-emerald-900/50 shadow-2xl backdrop-blur-sm h-fit">
          <div className="flex flex-col gap-4">
            {board.map((row) => (
              <div key={row.letter} className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 bg-gradient-to-br from-[#fef08a] to-[#ca8a04] text-black rounded-xl flex items-center justify-center text-xl md:text-3xl font-black shadow-lg border border-yellow-200/50">{row.letter}</div>
                <div className="flex-1 grid grid-cols-5 sm:grid-cols-15 gap-1 md:gap-2">
                  {Array.from({ length: 15 }, (_, i) => i + row.range[0]).map((num) => {
                    const isDrawn = drawnNumbers.includes(num);
                    return <div key={num} className={`h-10 md:h-14 rounded-lg flex items-center justify-center text-sm md:text-lg font-bold transition-all duration-300 border ${isDrawn ? "bg-gradient-to-b from-[#fef08a] to-[#ca8a04] text-black scale-105 border-yellow-200/50 shadow-[0_0_15px_rgba(202,138,4,0.4)]" : "bg-black/40 text-emerald-900 border-emerald-900/30"}`}>{num}</div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA 4: O RANKING AO VIVO */}
        <div className="bg-black/40 p-6 rounded-3xl border border-emerald-900/50 shadow-xl backdrop-blur-sm h-fit">
          <h2 className="text-emerald-400/60 font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
            <Trophy size={18} className="text-[#ca8a04]" /> Na Cara do Gol
          </h2>
          <div className="flex flex-col gap-3">
            {!cards.length ? (
              <div className="text-center text-emerald-900 text-xs py-4">Sincronizando cartelas...</div>
            ) : ranking.length === 0 ? (
              <div className="text-center text-emerald-900/50 text-xs py-4 border border-emerald-900/30 rounded-xl bg-black/30">Nenhuma cartela quente ainda.</div>
            ) : (
              ranking.map((r, idx) => (
                <div key={r.shortId} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${r.remaining === 0 ? "bg-emerald-900/50 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-black/50 border-emerald-900/30"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-900 font-black text-lg w-4">{idx + 1}º</span>
                    <span className="font-mono font-bold text-[#fef08a] tracking-wider text-lg">{r.shortId}</span>
                  </div>
                  {r.remaining === 0 ? <span className="bg-emerald-500 text-black text-xs font-black px-3 py-1 rounded animate-pulse shadow-lg uppercase tracking-widest">Bateu!</span> : <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Falta {r.remaining}</span>}
                </div>
              ))
            )}
          </div>
          <p className="text-center text-emerald-900/60 text-[10px] mt-6 uppercase font-bold tracking-widest">Top 10 - Cartela Cheia</p>
        </div>

      </div>
    </div>
  );
}