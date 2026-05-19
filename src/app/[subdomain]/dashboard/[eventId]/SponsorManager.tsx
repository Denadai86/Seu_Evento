// src/app/[subdomain]/dashboard/[eventId]/SponsorManager.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { addSponsor, removeSponsor } from "@/actions/sponsor";
import { Plus, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Sponsor {
  id: string;
  name: string;
  contribution: number;
}

export default function SponsorManager({ eventId, initialSponsors = [] }: { eventId: string, initialSponsors: Sponsor[] }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [name, setName] = useState("");
  const [contribution, setContribution] = useState("");

  useEffect(() => {
    setSponsors(initialSponsors);
  }, [initialSponsors]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const cleanContribution = contribution.replace(',', '.').replace(/[^0-9.]/g, '');
    const cents = cleanContribution ? Math.round(parseFloat(cleanContribution) * 100) : 0;

    startTransition(async () => {
      try {
        // 🔥 CORREÇÃO: Passamos undefined em vez de null para o logoUrl
        const res = await addSponsor(eventId, name, cents);
        
        // 🔥 CORREÇÃO: Checamos se o 'res' existe e tem um ID válido retornado pelo Prisma
        if (res && res.id) {
          toast.success("Patrocinador registrado com sucesso!");
          setName("");
          setContribution("");
          router.refresh(); 
        } else {
          toast.error("Erro ao adicionar patrocinador.");
        }
      } catch (error) {
        toast.error("Erro ao conectar com o servidor.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover este patrocinador?")) return;
    startTransition(async () => {
      await removeSponsor(id);
      toast.success("Patrocinador removido.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="Nome da Empresa (Ex: Padaria do Zé)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
          required
        />
        <input
          type="text"
          placeholder="Doação R$ (Opcional)"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          className="w-1/3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
        />
        <button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-500 text-white px-3 rounded-xl transition disabled:opacity-50">
          <Plus size={18} />
        </button>
      </form>

      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
        {sponsors.length === 0 ? (
          <p className="text-center text-slate-500 text-xs py-4 italic">Nenhum patrocinador cadastrado.</p>
        ) : (
          sponsors.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-black/40 border border-slate-800 p-3 rounded-xl">
              <div>
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  <Megaphone size={14} className="text-amber-500" /> {s.name}
                </p>
                {s.contribution > 0 && (
                  <p className="text-xs text-emerald-400 font-mono mt-0.5">
                    + R$ {(s.contribution / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <button onClick={() => handleDelete(s.id)} disabled={isPending} className="text-slate-500 hover:text-red-400 p-2 transition disabled:opacity-50">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}