// src/app/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  checkCard, getActiveEvent, drawNumberToDB, getGameThermometer, 
  resetEvent, generateBatchCards, addSponsor, deleteSponsor, updateOrgLogo 
} from "./actions";
import UploadButton from ".././components/UploadButton"; // Criar este componente conforme instrução anterior

export default function DashboardAdmin() {
  const [shortId, setShortId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rankings, setRankings] = useState<any>(null);

  const loadData = () => {
    getActiveEvent().then((res) => {
      if (res.success) {
        setActiveEvent(res.event);
        updateRankings(res.event.id);
      }
    });
  };

  useEffect(() => { loadData(); }, []);

  const updateRankings = async (eventId: string) => {
    const res = await getGameThermometer(eventId);
    if (res.success) setRankings(res.rankings);
  };

  const handleDrawNext = async () => {
    if (!activeEvent || activeEvent.drawnNumbers.length >= 75) return;
    setIsDrawing(true);
    let newNumber;
    do { newNumber = Math.floor(Math.random() * 75) + 1; } 
    while (activeEvent.drawnNumbers.includes(newNumber));

    const res = await drawNumberToDB(activeEvent.id, newNumber);
    if (res.success) {
      setActiveEvent({ ...activeEvent, drawnNumbers: res.drawnNumbers });
      updateRankings(activeEvent.id);
    }
    setIsDrawing(false);
  };

  const checkWinStatus = useMemo(() => {
    if (!result || !activeEvent) return null;
    const drawn = activeEvent.drawnNumbers;
    const matrix = result.matrix;
    const hits = {
      B: matrix.B.map((n: number) => drawn.includes(n)),
      I: matrix.I.map((n: number) => drawn.includes(n)),
      N: matrix.N.map((n: number, i: number) => i === 2 ? true : drawn.includes(n)),
      G: matrix.G.map((n: number) => drawn.includes(n)),
      O: matrix.O.map((n: number) => drawn.includes(n)),
    };
    const totalHits = Object.values(hits).flat().filter(h => h).length;
    return { isBingo: totalHits === 25, type: totalHits === 25 ? "BINGO!" : "EM JOGO", hits };
  }, [result, activeEvent]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8">
      <header className="flex justify-between items-center mb-12 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 italic">AÇÃO BINGO <span className="text-emerald-600">PRO</span></h1>
          <p className="text-slate-500 font-medium">Painel do Locutor • {activeEvent?.name}</p>
        </div>
        <div className="flex gap-3">
          <button 
            disabled={loading}
            onClick={async () => {
              const qty = prompt("Qtd de cartelas aleatórias?", "100");
              if(qty && activeEvent) {
                setLoading(true);
                const res = await generateBatchCards(activeEvent.id, parseInt(qty));
                setLoading(false);
                if(res.success) alert(`Gerado! Teste com a ID: ${res.sampleId}`);
                loadData();
              }
            }}
            className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl shadow-md hover:bg-amber-600"
          >
            {loading ? "Gerando..." : "🎲 Gerar Lote"}
          </button>
          <button onClick={() => confirm("Resetar rodada?") && resetEvent(activeEvent.id).then(loadData)} className="px-4 py-2 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50">Reset</button>
          <a href="/imprimir" target="_blank" className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-md">🖨️ PDF</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: CONFIGS E SORTEIO */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-3xl border shadow-sm text-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Sorteio Ativo</h2>
            <div className="text-7xl font-black text-emerald-600 mb-6 bg-slate-50 py-8 rounded-2xl border-2 border-slate-100 shadow-inner">
              {activeEvent?.drawnNumbers?.slice(-1)[0] || "--"}
            </div>
            <button onClick={handleDrawNext} disabled={isDrawing} className="w-full py-4 bg-emerald-600 text-white text-xl font-black rounded-2xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50">
              {isDrawing ? "SORTEANDO..." : "SORTEAR NÚMERO"}
            </button>
          </section>

          <section className="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Identidade Visual</h2>
            <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-2xl border border-dashed">
              {activeEvent?.organization?.logoUrl ? (
                <img src={activeEvent.organization.logoUrl} className="w-12 h-12 object-contain" />
              ) : (
                <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-[8px]">LOGO</div>
              )}
              <UploadButton label="Subir Logo Central" onUpload={(url) => updateOrgLogo(activeEvent.organization.id, url).then(loadData)} />
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Patrocinadores (Máx 4)</h2>
            <div className="space-y-2 mb-4">
              {activeEvent?.sponsors?.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-sm border">
                   <div className="flex items-center gap-2">
                     {s.logoUrl && <img src={s.logoUrl} className="w-6 h-6 object-contain" />}
                     <span className="font-bold">{s.name}</span>
                   </div>
                   <button onClick={() => deleteSponsor(s.id).then(loadData)} className="text-red-400 font-bold">✕</button>
                </div>
              ))}
            </div>
            <form onSubmit={async (e: any) => { 
              e.preventDefault(); 
              await addSponsor(activeEvent.id, e.target.name.value, e.target.logo.value); 
              e.target.reset();
              loadData(); 
            }} className="space-y-2">
              <input name="name" placeholder="Nome" className="w-full p-2 text-xs border rounded-lg" required />
              <input name="logo" placeholder="URL Logo (ou use o upload abaixo)" className="w-full p-2 text-xs border rounded-lg" />
              <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-700 transition-colors">Confirmar Parceiro</button>
            </form>
          </section>
        </div>

        {/* COLUNA DIREITA: AUDITORIA */}
        <div className="lg:col-span-8">
          <section className="bg-white p-8 rounded-[40px] border shadow-sm h-full">
            <div className="flex gap-4 mb-8">
              <input 
                type="text" 
                placeholder="ID DA CARTELA (EX: K8L2)" 
                value={shortId} 
                onChange={e => setShortId(e.target.value)} 
                className="flex-1 bg-slate-100 border-none rounded-2xl p-4 font-black text-2xl uppercase focus:ring-2 focus:ring-emerald-500" 
              />
              <button onClick={() => checkCard(shortId).then(res => res.success ? setResult(res.card) : alert(res.message))} className="bg-slate-900 text-white px-8 rounded-2xl font-bold">CONFERIR</button>
            </div>

            {result ? (
              <div className={`p-8 rounded-[32px] border-4 transition-all ${checkWinStatus?.isBingo ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-4xl font-black">{result.shortId}</h3>
                  <button onClick={() => {setResult(null); setShortId("");}} className="text-xs font-bold uppercase text-slate-400">Limpar</button>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {['B','I','N','G','O'].map(col => (
                    <div key={col} className="flex flex-col gap-3">
                      <div className="bg-slate-900 text-white py-3 rounded-xl font-black text-center">{col}</div>
                      {result.matrix[col].map((num: any, i: number) => {
                        const isHit = (col === 'N' && i === 2) || activeEvent?.drawnNumbers?.includes(num);
                        return (
                          <div key={i} className={`aspect-square flex items-center justify-center text-2xl font-black rounded-xl border-2 transition-all ${isHit ? 'bg-emerald-500 border-emerald-400 text-white scale-105 shadow-md' : 'bg-slate-50 text-slate-200 border-slate-100'}`}>
                            {col === 'N' && i === 2 ? (
                              activeEvent?.organization?.logoUrl ? <img src={activeEvent.organization.logoUrl} className="w-8 h-8 object-contain" /> : "★"
                            ) : num}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border-4 border-dashed rounded-[32px] text-slate-300">
                <span className="text-6xl mb-2">🔎</span>
                <p className="font-bold">Aguardando auditoria...</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}