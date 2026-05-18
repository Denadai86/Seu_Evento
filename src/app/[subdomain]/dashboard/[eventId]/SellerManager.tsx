// src/app/[subdomain]/dashboard/[eventId]/SellerManager.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processBatchSale } from "@/actions/venda"; // Ajuste o caminho se necessário
import { Trash2, Plus, CheckCircle2, X, Receipt, Search } from "lucide-react";

export default function SellerManager({ eventId, initialSellers }: any) {
  const [sellers, setSellers] = useState(initialSellers || []);
  const [newSellerName, setNewSellerName] = useState("");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados do Modal de Acerto de Contas
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [batchInput, setBatchInput] = useState("");
  const [settleMessage, setSettleMessage] = useState("");

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName.trim()) return;
    
    // Aqui você chama sua action de criar vendedor (se já tiver)
    // Exemplo visual:
    alert(`Ação para criar vendedor: ${newSellerName}`);
    setNewSellerName("");
  };

  const handleOpenSettleModal = (seller: any) => {
    setSelectedSeller(seller);
    setBatchInput("");
    setSettleMessage("");
    setSettleModalOpen(true);
  };

  const handleSettleUp = async () => {
    if (!batchInput.trim()) return;

    // Pega o texto "A1B2, C3D4 E5F6" e transforma num array limpo: ["A1B2", "C3D4", "E5F6"]
    const cardsArray = batchInput
      .toUpperCase()
      .split(/[\s,]+/) // Divide por espaço, vírgula ou quebra de linha
      .filter(code => code.length > 0);

    if (cardsArray.length === 0) return;

    startTransition(async () => {
      try {
        // Assume que Acerto de Contas de rua é sempre entregue em DINHEIRO (CASH) para a secretária
        // Ajuste "CASH" para "DINHEIRO" se for o que estiver no seu schema.prisma
        const res = await processBatchSale(eventId, cardsArray, "CASH", selectedSeller.id);
        
        if (res.success) {
          setSettleMessage(`✅ Acerto concluído! ${cardsArray.length} cartelas baixadas.`);
          setBatchInput("");
          router.refresh(); // Atualiza o Dashboard financeiro por trás
          
          setTimeout(() => {
            setSettleModalOpen(false);
          }, 2000);
        } else {
          setSettleMessage(`❌ Erro: ${res.error}`);
        }
      } catch (error: any) {
        setSettleMessage(`❌ Erro crítico: ${error.message}`);
      }
    });
  };

  return (
    <div className="flex flex-col h-full relative">
      
      {/* ADD VENDEDOR */}
      <form onSubmit={handleAddSeller} className="flex gap-2 mb-4 shrink-0">
        <input 
          type="text" 
          value={newSellerName}
          onChange={(e) => setNewSellerName(e.target.value)}
          placeholder="Nome do Vendedor..." 
          className="flex-1 bg-black/40 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
        />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-colors">
          <Plus size={20} />
        </button>
      </form>

      {/* LISTA DE VENDEDORES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
        {sellers.map((seller: any) => {
          const cardsSold = seller.cards?.filter((c: any) => c.isPaid).length || 0;
          
          return (
            <div key={seller.id} className="bg-black/20 border border-slate-800 p-3 rounded-xl flex items-center justify-between group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                  {seller.name.substring(0, 2)}
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-slate-200 truncate">{seller.name}</p>
                  <p className="text-xs text-slate-500">{cardsSold} cartelas baixadas</p>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {/* 🔥 BOTÃO DE ACERTO DE CONTAS */}
                <button 
                  onClick={() => handleOpenSettleModal(seller)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold px-2"
                  title="Acerto de Contas (Dar baixa em lote)"
                >
                  <Receipt size={14} /> Baixa
                </button>
                <button className="text-slate-600 hover:text-red-400 p-1.5 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {sellers.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-4">Nenhum vendedor cadastrado.</p>
        )}
      </div>

      {/* 🚀 MODAL DE ACERTO DE CONTAS (BACKOFFICE) */}
      {settleModalOpen && selectedSeller && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setSettleModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Receipt size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Acerto de Contas</h3>
                <p className="text-slate-400 text-xs">Baixa de canhotos do(a) <strong className="text-slate-200">{selectedSeller.name}</strong></p>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-2">
              Digite ou bipe os códigos das cartelas vendidas (separe por vírgula, espaço ou linha):
            </p>

            <textarea 
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="Ex: A1B2, C3D4&#10;E5F6"
              className="w-full bg-black/50 border border-slate-700 rounded-xl p-4 text-white font-mono uppercase tracking-wider outline-none focus:border-emerald-500 transition-colors min-h-[120px] resize-none mb-4"
            />

            {settleMessage && (
              <div className={`p-3 rounded-xl text-sm font-bold mb-4 ${settleMessage.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {settleMessage}
              </div>
            )}

            <button 
              onClick={handleSettleUp}
              disabled={isPending || !batchInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isPending ? "Processando Lote..." : "Confirmar Recebimento em Dinheiro"}
            </button>
            
            <p className="text-[10px] text-center text-slate-500 mt-4 uppercase tracking-widest">
              O valor será creditado no Caixa Geral
            </p>
          </div>
        </div>
      )}
    </div>
  );
}