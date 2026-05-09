// src/app/[subdomain]/dashboard/[eventId]/SellerManager.tsx
"use client";

import { useState, useTransition } from "react";
import { createSeller, assignCardsToSeller, markSellerAsPaid, returnCardsFromSeller, deleteSeller } from "@/actions/seller";
import { Users, ChevronDown, ChevronUp, Wallet, PackagePlus, PackageMinus, CheckCircle2, Trash2 } from "lucide-react";

export default function SellerManager({ eventId, initialSellers }: { eventId: string, initialSellers: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [newSellerName, setNewSellerName] = useState("");
  const [transferAmount, setTransferAmount] = useState<number | "">("");
  const [returnAmount, setReturnAmount] = useState<number | "">("");
  const [payAmount, setPayAmount] = useState<number | "">(""); // 🔥 Novo estado para pagamento parcial

  const handleCreateSeller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName) return;
    startTransition(async () => {
      await createSeller(eventId, newSellerName);
      setNewSellerName("");
    });
  };

  const handleAssignCards = (sellerId: string) => {
    if (!transferAmount || transferAmount <= 0) return;
    startTransition(async () => {
      const res = await assignCardsToSeller(eventId, sellerId, Number(transferAmount));
      if (!res.success) alert(res.error);
      setTransferAmount("");
    });
  };

  const handleReturnCards = (sellerId: string) => {
    if (!returnAmount || returnAmount <= 0) return;
    startTransition(async () => {
      const res = await returnCardsFromSeller(sellerId, Number(returnAmount));
      if (!res.success) alert(res.error);
      setReturnAmount("");
    });
  };

  // 🔥 Nova função que recebe a quantidade
  const handleMarkAsPaid = (sellerId: string) => {
    if (!payAmount || payAmount <= 0) return;
    if (!confirm(`Confirmar o recebimento em dinheiro de ${payAmount} cartelas?`)) return;
    startTransition(async () => {
      const res = await markSellerAsPaid(sellerId, Number(payAmount));
      if (!res?.success) alert(res?.error);
      setPayAmount("");
    });
  };

  const handleDeleteSeller = (sellerId: string, sellerName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o vendedor ${sellerName}? Cartelas não pagas retornarão ao estoque.`)) return;
    startTransition(async () => {
      const res = await deleteSeller(sellerId);
      if (!res.success) alert(res.error);
    });
  };

  return (
    <div className="flex flex-col h-full">
      
      <form onSubmit={handleCreateSeller} className="flex gap-2 mb-6 shrink-0">
        <input 
          type="text" placeholder="Nome do Vendedor..." value={newSellerName} onChange={(e) => setNewSellerName(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-colors"
          disabled={isPending}
        />
        <button type="submit" disabled={isPending || !newSellerName} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center">
          +
        </button>
      </form>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {initialSellers.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Nenhum vendedor cadastrado.</p>
        ) : (
          initialSellers.map((seller) => {
            const isExpanded = expandedId === seller.id;
            const totalCards = seller.cards.length;
            const paidCards = seller.cards.filter((c: any) => c.isPaid).length;
            const pendingCards = totalCards - paidCards;
            const isFullyPaid = totalCards > 0 && pendingCards === 0;

            return (
              <div key={seller.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden transition-all shrink-0">
                
                <div className="flex items-center justify-between p-1">
                  <div onClick={() => setExpandedId(isExpanded ? null : seller.id)} className="p-3 flex-1 flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 transition-colors rounded-xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isFullyPaid ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {isFullyPaid ? <CheckCircle2 size={20} /> : <Users size={20} />}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{seller.name}</h3>
                      <p className="text-xs text-slate-500">
                        {totalCards} cartelas {totalCards > 0 ? <span className="text-emerald-500/70">({paidCards} pagas)</span> : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center pr-3 gap-2 text-slate-500">
                    <button onClick={() => handleDeleteSeller(seller.id, seller.name)} disabled={isPending} className="p-2 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition-colors" title="Excluir Vendedor"><Trash2 size={16} /></button>
                    <div onClick={() => setExpandedId(isExpanded ? null : seller.id)} className="p-2 cursor-pointer">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                  </div>
                </div>

                {/* CORPO EXPANDIDO COM GRID DE 3 COLUNAS */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* 1. Entregar */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Entregar Lote</label>
                        <div className="flex gap-1">
                          <input type="number" min="1" placeholder="Qtd" value={transferAmount} onChange={(e) => setTransferAmount(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 text-center" />
                          <button onClick={() => handleAssignCards(seller.id)} disabled={isPending || !transferAmount} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/50 px-3 rounded-lg transition-colors flex items-center justify-center shrink-0" title="Repassar">
                            <PackagePlus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* 2. Devolver */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Devolver</label>
                        <div className="flex gap-1">
                          <input type="number" min="1" max={pendingCards} placeholder="Qtd" value={returnAmount} onChange={(e) => setReturnAmount(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 text-center" />
                          <button onClick={() => handleReturnCards(seller.id)} disabled={isPending || !returnAmount || pendingCards === 0} className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/50 px-3 rounded-lg transition-colors flex items-center justify-center shrink-0 disabled:opacity-30" title="Devolver">
                            <PackageMinus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* 3. Receber Dinheiro (Baixa Parcial) */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 mb-1 block">Receber $</label>
                        <div className="flex gap-1">
                          <input type="number" min="1" max={pendingCards} placeholder="Qtd" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} className="w-full bg-emerald-950/20 border border-emerald-900/50 rounded-lg px-2 py-2 text-sm text-emerald-400 outline-none focus:border-emerald-500 text-center" />
                          <button onClick={() => handleMarkAsPaid(seller.id)} disabled={isPending || !payAmount || pendingCards === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 px-3 rounded-lg transition-colors flex items-center justify-center shrink-0 disabled:opacity-30" title="Dar Baixa Financeira">
                            <Wallet size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}