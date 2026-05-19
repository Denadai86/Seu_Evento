// src/app/[subdomain]/dashboard/[eventId]/TicketPriceEditor.tsx
"use client";

import { useState, useTransition } from "react";
import { updateTicketPrice } from "@/actions/event";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Tag } from "lucide-react";
import { toast } from "sonner"; // 🔥 Olha o Sonner aqui!

export default function TicketPriceEditor({ eventId, initialPrice }: { eventId: string, initialPrice: number }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Converte de centavos para real
  const [priceInput, setPriceInput] = useState((initialPrice / 100).toFixed(2));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    // 🔥 BLINDAGEM MÁXIMA ANTI-ERRO DE DIGITAÇÃO:
    // 1. Troca vírgula por ponto.
    // 2. Remove letras ou qualquer símbolo que não seja número ou ponto.
    const cleanString = priceInput.replace(',', '.').replace(/[^0-9.]/g, '');
    
    // 3. Garante que se o usuário digitou "10.50.30", só conte o primeiro ponto.
    const parts = cleanString.split('.');
    const safeString = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
    
    // 4. Agora converte para centavos com segurança
    const cents = Math.round(parseFloat(safeString) * 100);
    
    if (isNaN(cents) || cents <= 0) {
      toast.error("Preço inválido! Digite um valor maior que zero.");
      setPriceInput((initialPrice / 100).toFixed(2)); // Restaura pro valor antigo se ele fez besteira
      return;
    }

    startTransition(async () => {
      try {
        await updateTicketPrice(eventId, cents);
        setIsEditing(false);
        setPriceInput((cents / 100).toFixed(2)); // Atualiza o campo com a nova máscara
        toast.success("Preço da cartela atualizado com sucesso!");
        router.refresh(); 
      } catch (error) {
        toast.error("Ocorreu um erro ao atualizar o preço.");
      }
    });
  };

  return (
    <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-xl border border-emerald-900/50 shadow-inner">
      <div className="bg-emerald-500/20 p-1.5 rounded-lg text-emerald-400">
        <Tag size={16} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
          Preço da Cartela
        </span>
        
        {isEditing ? (
          <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
            <span className="text-emerald-400 font-bold text-sm">R$</span>
            <input
              type="text" // Mudamos para text para o usuário poder usar a vírgula do teclado sem bugar!
              inputMode="decimal"
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
            className="flex items-center gap-2 text-emerald-400 font-black text-sm hover:text-emerald-300 hover:bg-emerald-900/20 px-2 py-0.5 -ml-2 rounded transition"
          >
            R$ {(initialPrice / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <Pencil size={12} className="opacity-50" />
          </button>
        )}
      </div>
    </div>
  );
}