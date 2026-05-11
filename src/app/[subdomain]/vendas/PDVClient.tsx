"use client";

import { useState, useTransition } from "react";
import { processBatchSale } from "@/actions/seller";
import { QrCode, Trash2, Banknote, CreditCard, CheckCircle2 } from "lucide-react";

export default function PDVClient({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleAddCard = (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        const id = inputValue.trim().toUpperCase();

        if (!id) return;
        if (cart.includes(id)) {
            alert("Esta cartela já está no carrinho!");
            return setInputValue("");
        }

        setCart([id, ...cart]);
        setInputValue("");
        setSuccessMessage(""); // Limpa mensagem anterior
    }

  const handleRemoveCard = (idToRemove: string) => {
    setCart(cart.filter(id => id !== idToRemove));
  };

  const handleCheckout = (paymentMethod: "PIX" | "DINHEIRO") => {
    if (cart.length === 0) return;
    
    startTransition(async () => {
      const res = await processBatchSale(eventId, cart, paymentMethod);
      if (res.success) {
        setSuccessMessage(res.message || "Venda confirmada!");
        setCart([]); // Limpa o carrinho
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full p-4 relative">
      
      {/* 1. MÓDULO DE ENTRADA (Digitar ou QR Code) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg">
        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">
          Adicionar Cartela
        </label>
        <form onSubmit={handleAddCard} className="flex gap-2">
          <input 
            type="text" 
            placeholder="ID da Cartela (ex: A9B2)" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-black/50 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-white uppercase outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600 placeholder:text-sm placeholder:font-normal"
          />
          <button 
            type="button"
            onClick={() => alert("Chamar o componente de câmera (QR Code) aqui!")}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 p-3 rounded-xl transition-colors border border-slate-700 flex items-center justify-center shrink-0"
          >
            <QrCode size={24} />
          </button>
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="bg-emerald-600 disabled:bg-slate-800 text-white font-bold px-4 rounded-xl transition-colors shrink-0"
          >
            +
          </button>
        </form>
      </div>

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl mb-4 text-center font-bold text-sm flex items-center justify-center gap-2 animate-in fade-in">
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {/* 2. O CARRINHO DE CARTELAS */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 flex flex-col mb-24 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-slate-400">Na Mão (Pendentes)</h2>
          <span className="bg-slate-800 text-emerald-400 text-xs font-black px-2 py-1 rounded-md">
            {cart.length} itens
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50">
              <QrCode size={40} className="mb-2" />
              <p className="text-sm font-bold">Carrinho vazio</p>
            </div>
          ) : (
            cart.map(id => (
              <div key={id} className="bg-black/40 border border-slate-800 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-left-2 duration-200">
                <span className="font-black text-slate-200 tracking-wider">{id}</span>
                <button onClick={() => handleRemoveCard(id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. MÓDULO DE PAGAMENTO (Fixo no rodapé) */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40">
        <div className="max-w-md mx-auto flex gap-3">
          <button 
            onClick={() => handleCheckout("DINHEIRO")}
            disabled={cart.length === 0 || isPending}
            className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white font-black py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
          >
            <Banknote size={24} />
            <span className="text-[10px] uppercase tracking-widest">Dinheiro</span>
          </button>
          
          <button 
            onClick={() => handleCheckout("PIX")}
            disabled={cart.length === 0 || isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-black py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-emerald-900/20"
          >
            <CreditCard size={24} />
            <span className="text-[10px] uppercase tracking-widest">PIX</span>
          </button>
        </div>
      </div>

    </div>
  );
}