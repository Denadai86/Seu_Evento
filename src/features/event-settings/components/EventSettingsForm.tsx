// src/features/event-settings/components/EventSettingsForm.tsx
"use client";

import { updateEventSettings } from "../actions";
import { useTransition } from "react";

export function EventSettingsForm({ event }: { event: any }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const res = await updateEventSettings(event.id, formData);
      if (res.success) alert("Configurações salvas!");
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase">Nome do Evento</label>
        <input 
          name="name" 
          defaultValue={event.name} 
          className="w-full bg-black/50 border border-slate-700 rounded-xl p-3 mt-1 text-white"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase">Preço da Cartela (R$)</label>
        <input 
          name="ticketPrice" 
          type="number" 
          step="0.01"
          defaultValue={event.ticketPrice} 
          className="w-full bg-black/50 border border-slate-700 rounded-xl p-3 mt-1 text-white font-mono"
        />
      </div>

      <button 
        disabled={isPending}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl transition-all disabled:opacity-50"
      >
        {isPending ? "SALVANDO..." : "SALVAR CONFIGURAÇÕES"}
      </button>
    </form>
  );
}