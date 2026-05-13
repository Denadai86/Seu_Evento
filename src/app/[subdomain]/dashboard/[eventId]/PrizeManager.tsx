// src/app/[subdomain]/dashboard/[eventId]/PrizeManager.tsx
"use client";

import { useState, useTransition } from "react";
import { createPrize, deletePrize } from "@/actions/prize";
import { Trophy, Trash2, Plus, Target, CheckSquare } from "lucide-react";

export default function PrizeManager({ eventId, initialPrizes }: { eventId: string, initialPrizes: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [type, setType] = useState<"QUINA" | "FULL_HOUSE">("QUINA");
  
  // A ordem sugerida é sempre o próximo número disponível
  const nextOrder = initialPrizes.length > 0 
    ? Math.max(...initialPrizes.map(p => p.order)) + 1 
    : 1;

  const [order, setOrder] = useState<number>(nextOrder);

  const handleAddPrize = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createPrize(eventId, name, type, prizeName, order);
      if (res.success) {
        window.location.reload(); // 🔥 A mágica que resolve o erro do Next.js!
      } else {
        alert(res.error);
      }
    });
  };

  const handleDeletePrize = (id: string) => {
    if (!confirm("Tem a certeza que deseja remover esta rodada?")) return;
    startTransition(async () => {
      const res = await deletePrize(id);
      if (res.success) window.location.reload(); // 🔥 Aqui também!
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Formulário Compacto */}
      <form onSubmit={handleAddPrize} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-4 shrink-0 flex flex-col gap-3 shadow-inner">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nome</label>
            <input 
              type="text" placeholder="Ex: 1ª Rodada" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Prémio</label>
            <input 
              type="text" placeholder="Ex: R$ 500,00" value={prizeName} onChange={(e) => setPrizeName(e.target.value)} required
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo</label>
            <select 
              value={type} onChange={(e) => setType(e.target.value as "QUINA" | "FULL_HOUSE")}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500 appearance-none"
            >
              <option value="QUINA">Quina</option>
              <option value="FULL_HOUSE">Cheia</option>
            </select>
          </div>

          <div className="flex items-end">
            <button 
              type="submit" disabled={isPending || !name || !prizeName}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white h-[38px] rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>
      </form>

      {/* Lista de Rodadas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2">
        {initialPrizes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-6 opacity-50">
            <Trophy size={40} className="mb-2" />
            <p className="text-sm font-bold">Nenhuma rodada configurada.</p>
          </div>
        ) : (
          initialPrizes.map((prize) => (
            <div key={prize.id} className="bg-black/30 border border-slate-800 rounded-xl p-3 flex justify-between items-center transition-all hover:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${prize.type === "FULL_HOUSE" ? 'bg-amber-900/30 text-amber-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                  {prize.type === "FULL_HOUSE" ? <CheckSquare size={18} /> : <Target size={18} />}
                </div>
                <div>
                  <h3 className="text-slate-200 font-bold text-sm">{prize.name} <span className="text-slate-500 font-normal text-xs ml-1">• Ordem: {prize.order}</span></h3>
                  <p className="text-xs text-violet-400 font-bold tracking-wide">{prize.prizeName}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDeletePrize(prize.id)} disabled={isPending}
                className="p-2 text-slate-500 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition-colors"
                title="Eliminar Rodada"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}