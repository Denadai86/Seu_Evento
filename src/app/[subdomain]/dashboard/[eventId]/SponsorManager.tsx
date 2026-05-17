// src/app/[subdomain]/dashboard/[eventId]/SponsorManager.tsx
"use client";

import { useState, useTransition } from "react";
import { addSponsor, removeSponsor } from "@/actions/sponsor";
import { Plus, Trash2, Gift, X, UploadCloud } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
  contribution: number;
}

interface Props {
  eventId: string;
  initialSponsors: Sponsor[];
}

export default function SponsorManager({ eventId, initialSponsors }: Props) {
  const [sponsors, setSponsors] = useState(initialSponsors);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false); // 🔥 Controle de UX para caber no Bento Box
  
  const [form, setForm] = useState({ name: "", contribution: "", file: null as File | null });
  const [hasPrize, setHasPrize] = useState(false);
  const [prizeForm, setPrizeForm] = useState({ roundName: "", prizeName: "", type: "QUINA" });

  const totalContribution = sponsors.reduce((sum, s) => sum + s.contribution, 0);

  const resetForm = () => {
    setForm({ name: "", contribution: "", file: null });
    setHasPrize(false);
    setPrizeForm({ roundName: "", prizeName: "", type: "QUINA" });
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    startTransition(async () => {
      let logoUrl = undefined;

      if (form.file) {
        const fd = new FormData();
        fd.append("file", form.file);
        fd.append("upload_preset", "acaoleve_sponsors");

        const res = await fetch("https://api.cloudinary.com/v1_1/dq096xyrs/image/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        logoUrl = data.secure_url;
      }

      const contribution = parseInt(form.contribution) * 100 || 0;
      
      const prizeData = hasPrize ? {
        roundName: prizeForm.roundName || `Rodada ${form.name}`,
        prizeName: prizeForm.prizeName,
        type: prizeForm.type as "QUINA" | "FULL_HOUSE"
      } : undefined;

      // Chama a nova função conectada ao banco
      const newSponsor = await addSponsor(eventId, form.name, contribution, logoUrl, prizeData);
      setSponsors(prev => [...prev, newSponsor]);
      
      resetForm();
    });
  };

  // MODO LISTA (Padrão)
  if (!isFormOpen) {
    return (
      <div className="space-y-4 flex flex-col h-full">
        <button 
          onClick={() => setIsFormOpen(true)}
          className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Novo Patrocinador
        </button>

        <div className="space-y-2 pb-4">
          {sponsors.length === 0 && (
            <p className="text-slate-500 italic text-center py-6 text-sm">Nenhuma cota vendida ainda.</p>
          )}

          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="bg-black/20 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              {sponsor.logoUrl ? (
                <img src={sponsor.logoUrl} alt={sponsor.name} className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
              ) : (
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-500">{sponsor.name.charAt(0)}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-200 text-sm truncate">{sponsor.name}</p>
                {sponsor.contribution > 0 && (
                  <p className="text-emerald-400 text-xs font-mono">R$ {(sponsor.contribution / 100).toLocaleString('pt-BR')}</p>
                )}
              </div>
              <button onClick={() => {
                if (confirm("Remover? Isso não apagará o prêmio caso tenha sido criado.")) {
                  startTransition(async () => {
                    await removeSponsor(sponsor.id);
                    setSponsors(prev => prev.filter(s => s.id !== sponsor.id));
                  });
                }
              }}>
                <Trash2 size={16} className="text-slate-500 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>

        {totalContribution > 0 && (
          <div className="mt-auto pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">Total Captado</p>
            <p className="text-xl text-emerald-400 font-black text-center">R$ {(totalContribution / 100).toLocaleString('pt-BR')}</p>
          </div>
        )}
      </div>
    );
  }

  // MODO FORMULÁRIO (Criando Patrocinador + Prenda)
  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex flex-col gap-4 relative">
      <button type="button" onClick={resetForm} className="absolute top-4 right-4 text-slate-500 hover:text-white">
        <X size={20} />
      </button>
      
      <h3 className="font-bold text-white mb-2">Novo Patrocinador</h3>

      <input type="text" placeholder="Nome da empresa" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-white text-sm" />
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-3 text-slate-500 text-sm">R$</span>
          <input type="number" placeholder="Valor" value={form.contribution} onChange={(e) => setForm({ ...form, contribution: e.target.value })} className="w-full bg-slate-800 border-none rounded-xl pl-9 pr-3 py-3 text-white text-sm" />
        </div>
        <div className="flex-1 relative overflow-hidden bg-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-700 transition cursor-pointer">
          <input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
          <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
            <UploadCloud size={16} /> {form.file ? "Logo OK" : "Logo"}
          </div>
        </div>
      </div>

      {/* A MÁGICA DA PRENDA (CROSS-SELL) */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mt-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-amber-400 mb-2">
          <input type="checkbox" checked={hasPrize} onChange={(e) => setHasPrize(e.target.checked)} className="rounded border-amber-500/50 bg-slate-900 text-amber-500 focus:ring-amber-500" />
          <Gift size={16} /> Doou uma prenda para rodada?
        </label>
        
        {hasPrize && (
          <div className="space-y-3 pt-2">
            <input type="text" placeholder={`Ex: Rodada ${form.name || "da Empresa"}`} value={prizeForm.roundName} onChange={(e) => setPrizeForm({ ...prizeForm, roundName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs" />
            <input type="text" placeholder="Prêmio (Ex: 1 Saco de Laranja)" required value={prizeForm.prizeName} onChange={(e) => setPrizeForm({ ...prizeForm, prizeName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs" />
            <select value={prizeForm.type} onChange={(e) => setPrizeForm({ ...prizeForm, type: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs">
              <option value="QUINA">Prêmio Menor (Quina)</option>
              <option value="FULL_HOUSE">Prêmio Principal (Cartela Cheia)</option>
            </select>
          </div>
        )}
      </div>

      <button type="submit" disabled={isPending} className="w-full bg-amber-600 hover:bg-amber-500 py-3 rounded-xl font-bold text-white transition disabled:opacity-50 mt-2">
        {isPending ? "Salvando..." : "Salvar Tudo"}
      </button>
    </form>
  );
}