// src/app/[subdomain]/dashboard/[eventId]/TicketPriceEditor.tsx
"use client";

import { useState, useTransition } from "react";
import { updateTicketPrice } from "@/actions/event";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Tag } from "lucide-react";

export default function TicketPriceEditor({ eventId, initialPrice }: { eventId: string, initialPrice: number }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Converte de centavos (ex: 2500) para real (25.00) para o input
  const [priceInput, setPriceInput] = useState((initialPrice / 100).toFixed(2));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    // Converte de volta para centavos de forma segura
    const cents = Math.round(parseFloat(priceInput.replace(',', '.')) * 100);
    
    if (isNaN(cents) || cents < 0) {
      alert("Valor inválido");
      return;
    }

    startTransition(async () => {
      try {
        await updateTicketPrice(eventId, cents);
        setIsEditing(false);
        router.refresh(); // Atualiza a tela para recalcular o "Total em Caixa" imediatamente
      } catch (error) {
        alert("Erro ao atualizar o preço.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 shadow-inner">
      <Tag size={16} className="text-slate-500" />
      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Valor da Cartela:</span>
      
      {isEditing ? (
        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
          <span className="text-emerald-400 font-bold text-sm">R$</span>
          <input
            type="number"
            step="0.50"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="bg-slate-900 border border-emerald-500/50 rounded-md px-2 py-1 w-20 text-sm text-white outline-none focus:border-emerald-400 transition"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} disabled={isPending} className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded transition ml-1 disabled:opacity-50">
            <Check size={16} />
          </button>
          <button onClick={() => { setIsEditing(false); setPriceInput((initialPrice / 100).toFixed(2)); }} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button 
          onClick={() => setIsEditing(true)} 
          className="flex items-center gap-2 text-emerald-400 font-black text-sm hover:text-emerald-300 hover:bg-emerald-400/10 px-2 py-1 rounded-md transition group"
        >
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialPrice / 100)}
          <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition" />
        </button>
      )}
    </div>
  );
}