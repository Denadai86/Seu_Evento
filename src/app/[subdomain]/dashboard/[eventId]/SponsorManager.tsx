//src/app/[subdomain]/dashboar/[eventoId]/SponsorManager.tsx


"use client";

import { useState, useTransition } from "react";
import { addSponsor, removeSponsor, updateSponsor } from "@/actions/sponsor";
import { Plus, Trash2, Edit3 } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
  contribution: number;        // em centavos
}

interface Props {
  eventId: string;
  initialSponsors: Sponsor[];
}

export default function SponsorManager({ eventId, initialSponsors }: Props) {
  const [sponsors, setSponsors] = useState(initialSponsors);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contribution: "", file: null as File | null });

  const totalContribution = sponsors.reduce((sum, s) => sum + s.contribution, 0);

  const resetForm = () => {
    setForm({ name: "", contribution: "", file: null });
    setEditingId(null);
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

      const contribution = parseInt(form.contribution) * 100 || 0; // converte R$ para centavos

      if (editingId) {
        const updated = await updateSponsor(editingId, form.name, contribution, logoUrl);
        setSponsors(prev => prev.map(s => s.id === editingId ? updated : s));
      } else {
        const newSponsor = await addSponsor(eventId, form.name, contribution, logoUrl);
        setSponsors(prev => [...prev, newSponsor]);
      }

      resetForm();
    });
  };

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 p-5 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <input
              type="text"
              placeholder="Nome da empresa"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
            />
          </div>

          <div className="md:col-span-3">
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">R$</span>
              <input
                type="number"
                placeholder="Valor"
                value={form.contribution}
                onChange={(e) => setForm({ ...form, contribution: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white"
              />
            </div>
          </div>

          <div className="md:col-span-4 flex gap-2">
            <input
              type="file"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              accept="image/*"
              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-slate-700 file:text-white"
            />
            <button
              type="submit"
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-500 px-6 rounded-xl font-bold disabled:opacity-50"
            >
              {editingId ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>
      </form>

      {/* Lista de Patrocinadores */}
      <div className="space-y-3">
        {sponsors.length === 0 && (
          <p className="text-slate-500 italic text-center py-8">Nenhum patrocinador cadastrado ainda.</p>
        )}

        {sponsors.map((sponsor) => (
          <div key={sponsor.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
            {sponsor.logoUrl && (
              <img src={sponsor.logoUrl} alt={sponsor.name} className="w-12 h-12 object-contain bg-slate-800 rounded-lg" />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{sponsor.name}</p>
              <p className="text-emerald-400 text-sm">
                R$ {(sponsor.contribution / 100).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => {
                setEditingId(sponsor.id);
                setForm({
                  name: sponsor.name,
                  contribution: (sponsor.contribution / 100).toString(),
                  file: null
                });
              }}>
                <Edit3 size={18} className="text-slate-400 hover:text-white" />
              </button>
              <button onClick={() => {
                if (confirm("Remover patrocinador?")) {
                  startTransition(async () => {
                    await removeSponsor(sponsor.id);
                    setSponsors(prev => prev.filter(s => s.id !== sponsor.id));
                  });
                }
              }}>
                <Trash2 size={18} className="text-red-400 hover:text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalContribution > 0 && (
        <p className="text-xs text-slate-500 text-center">
          Total captado: <span className="text-emerald-400 font-bold">R$ {(totalContribution / 100).toLocaleString('pt-BR')}</span>
        </p>
      )}
    </div>
  );
}