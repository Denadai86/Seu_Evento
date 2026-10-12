"use client";

// src/app/[subdomain]/projector/ProjectorView.tsx

import { useState, useEffect, useRef, useMemo } from "react";
import useSWR from "swr";
import { Trophy, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { listenProjector } from "@/lib/projectorSync";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro na rede");
  return res.json();
};

const formatBall = (num: number | null) => {
  if (!num) return { letter: "", number: "--" };
  if (num <= 15) return { letter: "B", number: num };
  if (num <= 30) return { letter: "I", number: num };
  if (num <= 45) return { letter: "N", number: num };
  if (num <= 60) return { letter: "G", number: num };
  return { letter: "O", number: num };
};

export default function ProjectorView({ eventId, eventName, initialDrawn, sponsors }: any) {
  // ✅ FIX 1: useRef para rastrear o último número sem stale closure
  const latestRef = useRef<number | null>(
    initialDrawn?.[initialDrawn.length - 1] ?? null
  );
  const [displayNumber, setDisplayNumber] = useState<number | null>(
    initialDrawn?.[initialDrawn.length - 1] ?? null
  );
  // ✅ FIX 2: estado de animação que dispara keyframe ao sortear número novo
  const [ballKey, setBallKey] = useState(0);

  const { data, mutate } = useSWR(`/api/bingo/state?eventId=${eventId}`, fetcher, {
    refreshInterval: 1500,
    fallbackData: {
      drawnNumbers: initialDrawn || [],
      latest: null,
      showBoard: true,
      bingoConfirmed: false,
      pendingWinnerName: "",
      currentPrize: null,
      sponsors: sponsors || [],
      currentSponsor: null,
      nextSponsor: null,
    },
  });

  // ✅ FIX 1+2: useEffect detecta número novo via ref (sem stale closure)
  // e dispara animação incrementando a key da bola (força remount + CSS animation)
  useEffect(() => {
    const latest = data?.latest;
    if (latest && latest !== latestRef.current) {
      latestRef.current = latest;
      setDisplayNumber(latest);
      setBallKey((k) => k + 1); // ← remonta a bola → dispara @keyframes ballRoll
    } else if (!latest && latestRef.current !== null) {
      // mesa zerada (reset ou fim de rodada): limpa a bola em vez de deixar a última pedra na tela
      latestRef.current = null;
      setDisplayNumber(null);
    }
  }, [data?.latest]);

  // 📡 Locutor no mesmo navegador: atualiza NA HORA (sem esperar o polling de 1,5 s).
  // O polling segue valendo como reserva se o telão estiver em outro aparelho.
  useEffect(() => {
    return listenProjector(eventId, (msg) => {
      if (msg.type === "draw" && Array.isArray(msg.drawnNumbers)) {
        const drawn = msg.drawnNumbers;
        mutate(
          (prev: any) => ({
            ...(prev ?? {}),
            drawnNumbers: drawn,
            latest: drawn[drawn.length - 1] ?? null,
            currentSponsor: msg.currentSponsor ?? null,
            nextSponsor: msg.nextSponsor ?? null,
          }),
          { revalidate: true }
        );
      } else {
        mutate();
      }
    });
  }, [eventId, mutate]);

  const drawnNumbers: number[] = data?.drawnNumbers || [];
  const bingoConfirmed = data?.bingoConfirmed;
  const winnerName = data?.pendingWinnerName || "Ganhador";
  const currentPrize = data?.currentPrize;
  const showBoard = data?.showBoard !== false;
  const currentBall = formatBall(displayNumber);

  // Patrocinadores: lista viva da API (cai para a lista do carregamento da página)
  const liveSponsors: any[] = data?.sponsors?.length ? data.sponsors : sponsors || [];
  const currentSponsor = data?.currentSponsor ?? null;

  // Tudo escala com a altura da janela (vh) para caber sem precisar diminuir o zoom.
  const BALL = showBoard ? "clamp(150px, 44vh, 400px)" : "clamp(200px, 56vh, 520px)";
  const CELL = "clamp(26px, 6.8vh, 64px)";

  const board = useMemo(() => [
    { letter: "B", range: [1, 15] },
    { letter: "I", range: [16, 30] },
    { letter: "N", range: [31, 45] },
    { letter: "G", range: [46, 60] },
    { letter: "O", range: [61, 75] },
  ], []);

  // Confetti ao confirmar bingo
  useEffect(() => {
    if (!bingoConfirmed) return;
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
    }, 250);
    return () => clearInterval(interval);
  }, [bingoConfirmed]);

  return (
    <>
      {/* ✅ FIX 2: keyframes injetados via <style> — sem necessidade de config Tailwind */}
      <style>{`
        @keyframes ballRoll {
          0%   { transform: scale(0.6) rotate(-200deg); opacity: 0.3; }
          55%  { transform: scale(1.08) rotate(12deg);  opacity: 1;   }
          75%  { transform: scale(0.96) rotate(-4deg);  opacity: 1;   }
          100% { transform: scale(1)   rotate(0deg);    opacity: 1;   }
        }
        .ball-animate {
          animation: ballRoll 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        @keyframes sponsorIn {
          0%   { opacity: 0; transform: translateY(18px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        /* entra logo DEPOIS da bola (0.35s) — não atrasa o número, só dá o "show" */
        .sponsor-animate {
          animation: sponsorIn 0.6s ease-out 0.35s both;
        }
      `}</style>

      <div className="relative h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#113a20] via-[#081a0e] to-black text-white overflow-hidden font-sans">

        {/* Conteúdo principal — desfoca se houver bingo */}
        <div className={`h-full flex flex-col transition-all duration-1000 ${bingoConfirmed ? "blur-2xl opacity-20 scale-95 pointer-events-none" : "opacity-100"}`}>

          {/* HEADER (compacto) */}
          <div className="shrink-0 flex flex-col items-center pt-4 pb-2 gap-2">
            <h1
              className="font-black text-[#fef08a] tracking-widest uppercase drop-shadow-[0_2px_20px_rgba(254,240,138,0.3)]"
              style={{ fontSize: "clamp(1.5rem, 5vh, 3rem)" }}
            >
              {eventName}
            </h1>

            {currentPrize && (
              <div className="flex items-center gap-4 bg-violet-900/40 border border-violet-500/40 px-5 py-2 rounded-2xl">
                <Trophy size={22} className="text-violet-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-0.5">
                    Rodada da Vez • {currentPrize.name}
                  </p>
                  <p className="text-violet-200 font-black text-xl">
                    {currentPrize.prizeName}
                    <span className="text-sm font-normal opacity-60 ml-2">
                      ({currentPrize.type === "QUINA" ? "Quina" : "Cartela Cheia"})
                    </span>
                  </p>
                  {currentPrize.sponsor && (
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-violet-300/90">
                      oferecido por
                      {currentPrize.sponsor.logoUrl && (
                        <img src={currentPrize.sponsor.logoUrl} alt={currentPrize.sponsor.name} className="h-6 object-contain" />
                      )}
                      <strong className="font-black text-violet-100">{currentPrize.sponsor.name}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PALCO: bola + grade (ocupa o espaço que sobra entre header e rodapé) */}
          <div className="flex-1 min-h-0 flex flex-row items-center justify-center gap-10 px-8">

            {/* BOLA */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              {/*
                key={ballKey} força React a remontar o elemento quando um novo número chega.
                O remount reinicia o CSS animation, produzindo o efeito de rolagem a cada sorteio.
              */}
              <div
                key={ballKey}
                className="ball-animate rounded-full flex items-center justify-center relative bg-[radial-gradient(circle_at_35%_25%,_#fef08a_0%,_#eab308_25%,_#a16207_80%,_#422006_100%)] shadow-[inset_-16px_-16px_32px_rgba(0,0,0,0.6),_inset_8px_8px_16px_rgba(255,255,255,0.4),_0_30px_60px_rgba(0,0,0,0.7)] border border-[#ca8a04]/30"
                style={{ width: BALL, height: BALL }}
              >
                <div className="flex flex-col items-center justify-center leading-none">
                  <span
                    className="font-bold text-black/40 -mb-1 tracking-widest"
                    style={{ fontSize: `calc(${BALL} * 0.125)` }}
                  >
                    {currentBall.letter}
                  </span>
                  <span
                    className="font-black text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)] leading-none"
                    style={{ fontSize: `calc(${BALL} * 0.45)` }}
                  >
                    {currentBall.number}
                  </span>
                </div>
              </div>

              <div className="text-center text-[#fef08a]/50 font-mono" style={{ fontSize: "clamp(14px, 2.4vh, 20px)" }}>
                Pedras: <strong className="text-[#fef08a]">{drawnNumbers.length}</strong> / 75
              </div>
            </div>

            {/* GRADE B-I-N-G-O */}
            {showBoard && (
              <div
                className="flex-1 min-w-0 max-w-5xl bg-black/40 rounded-3xl border border-emerald-900/50 shadow-2xl backdrop-blur-sm"
                style={{ padding: "clamp(12px, 2.4vh, 32px)" }}
              >
                <div className="flex flex-col" style={{ gap: "clamp(6px, 1.2vh, 12px)" }}>
                  {board.map((row) => (
                    <div key={row.letter} className="flex items-center gap-3">
                      <div
                        className="shrink-0 bg-gradient-to-br from-[#fef08a] to-[#ca8a04] text-black rounded-xl flex items-center justify-center font-black shadow-lg border border-yellow-200/50"
                        style={{ width: CELL, height: CELL, fontSize: `calc(${CELL} * 0.55)` }}
                      >
                        {row.letter}
                      </div>
                      <div className="flex-1 grid grid-cols-15 gap-2">
                        {Array.from({ length: 15 }, (_, i) => i + row.range[0]).map((num) => {
                          const isDrawn = drawnNumbers.includes(num);
                          return (
                            <div
                              key={num}
                              style={{ height: CELL, fontSize: `calc(${CELL} * 0.32)` }}
                              className={`rounded-lg flex items-center justify-center font-bold transition-all duration-300 border ${
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

          {/* 🎯 RODAPÉ DE PATROCÍNIO — largura total, fora da coluna da bola (não rouba altura) */}
          {liveSponsors.length > 0 && (
            <div className="shrink-0 px-8 pb-4 pt-2">
              <div
                className="mx-auto max-w-6xl flex items-center justify-between gap-8 rounded-3xl border border-yellow-500/25 bg-black/50 px-8 py-3 shadow-[0_0_40px_rgba(202,138,4,0.12)]"
                style={{ minHeight: "11vh" }}
              >
                {currentSponsor ? (
                  <div key={`sponsor-${ballKey}`} className="sponsor-animate flex items-center gap-5 min-w-0">
                    <p
                      className="shrink-0 font-bold uppercase tracking-[0.3em] text-yellow-200/60 leading-snug"
                      style={{ fontSize: "clamp(10px, 1.4vh, 14px)" }}
                    >
                      Pedra<br />oferecida por
                    </p>
                    {currentSponsor.logoUrl && (
                      <img
                        src={currentSponsor.logoUrl}
                        alt={currentSponsor.name}
                        className="object-contain shrink-0"
                        style={{ maxHeight: "9vh", maxWidth: "22vw" }}
                      />
                    )}
                    <p
                      className="font-black text-[#fef08a] truncate leading-tight"
                      style={{ fontSize: "clamp(20px, 4vh, 40px)" }}
                    >
                      {currentSponsor.name}
                    </p>
                  </div>
                ) : (
                  <p
                    className="shrink-0 font-bold uppercase tracking-[0.3em] text-yellow-200/50"
                    style={{ fontSize: "clamp(10px, 1.4vh, 14px)" }}
                  >
                    Apoio
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 min-w-0">
                  {liveSponsors.slice(0, 6).map((sp: any) => {
                    const isCurrent = sp.id === currentSponsor?.id;
                    const cls = `transition-all duration-500 ${isCurrent ? "opacity-100 scale-110" : "opacity-40"}`;
                    return sp.logoUrl ? (
                      <img
                        key={sp.id}
                        src={sp.logoUrl}
                        alt={sp.name}
                        className={`object-contain ${cls}`}
                        style={{ height: "clamp(24px, 4.5vh, 44px)" }}
                      />
                    ) : (
                      <span key={sp.id} className={`font-bold text-yellow-100 ${cls}`} style={{ fontSize: "clamp(12px, 2vh, 18px)" }}>
                        {sp.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
                    {winnerName.split(" (Fiscal:")[0].split(" (Ref:")[0]}
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
                {currentPrize?.sponsor && (
                  <div className="flex flex-col items-center gap-3 pt-6">
                    <p className="text-sm font-bold uppercase tracking-[0.35em] text-violet-300/70">
                      Prêmio oferecido por
                    </p>
                    {currentPrize.sponsor.logoUrl && (
                      <img
                        src={currentPrize.sponsor.logoUrl}
                        alt={currentPrize.sponsor.name}
                        className="h-24 object-contain"
                      />
                    )}
                    <p className="text-3xl font-black text-white">{currentPrize.sponsor.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}