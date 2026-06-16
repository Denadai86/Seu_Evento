// src/app/[subdomain]/dashboard/[eventId]/tesouraria/TesourariaClient.tsx
"use client";

import { useState, useTransition } from "react";
import { assignCardsToStaff, returnCardsFromStaff, registerCardPayment } from "@/actions/tesouraria";
import { Package, Users, PackagePlus, PackageMinus, Ticket, CheckCircle2, CircleDollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TesourariaClient({ 
  eventId, 
  initialStaff,
  availableCardsCount
}: { 
  eventId: string; 
  initialStaff: any[];
  availableCardsCount: number;
}) {
  const router = useRouter();
  const [activeStaff, setActiveStaff] = useState<any>(null);
  
  // 🔥 Adicionado o tipo "pay" para o acerto financeiro
  const [modalType, setModalType] = useState<"assign" | "return" | "pay" | null>(null);
  
  const [batchInput, setBatchInput] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openModal = (staff: any, type: "assign" | "return" | "pay") => {
    setActiveStaff(staff);
    setModalType(type);
    setBatchInput("");
    setMessage(null);
  };

  const handleProcess = async () => {
    if (!batchInput.trim() || !activeStaff) return;

    const codes = batchInput.toUpperCase().split(/[\s,]+/).filter(Boolean);

    startTransition(async () => {
      let res;
      
      // 🔥 Roteamento da Ação com base no Modal
      if (modalType === "assign") {
        res = await assignCardsToStaff(eventId, activeStaff.id, codes);
      } else if (modalType === "return") {
        res = await returnCardsFromStaff(eventId, activeStaff.id, codes);
      } else {
        res = await registerCardPayment(eventId, activeStaff.id, codes);
      }

      if (res.success) {
        setMessage({ text: `${res.count} cartelas processadas com sucesso!`, type: "success" });
        setBatchInput("");
        router.refresh(); 
        setTimeout(() => setModalType(null), 2000);
      } else {
        setMessage({ text: res.error, type: "error" });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* KPI DO ESTOQUE CENTRAL */}
      <div className="bg-[#111827] border border-emerald-500/30 rounded-3xl p-8 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-900/30 text-emerald-400 rounded-2xl flex items-center justify-center">
            <Package size={32} />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Fábrica (Estoque Livre)</p>
            <p className="text-4xl font-black text-white">{availableCardsCount} <span className="text-lg text-slate-500 font-normal">cartelas disponíveis</span></p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Vendedores Ativos no Evento</h2>

      {initialStaff.length === 0 ? (
         <div className="text-center bg-[#111827] border border-slate-800 rounded-3xl p-10">
           <p className="text-slate-400">Nenhum voluntário escalado com permissão de venda.</p>
           <p className="text-sm text-slate-500 mt-2">Vá na Central de RH e adicione a permissão de "Vender (PDV)" aos voluntários.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialStaff.map((staff: any) => {
            const assigned = staff.cards.length;
            const sold = staff.cards.filter((c: any) => c.isPaid).length;
            const pending = assigned - sold;

            return (
              <div key={staff.id} className="bg-[#111827] border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Users size={20} /></div>
                    <div>
                      <h3 className="font-bold text-lg text-white leading-tight">{staff.user.name}</h3>
                      <p className="text-xs font-mono text-emerald-500/70">@{staff.user.username}</p>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-slate-800 rounded-xl p-4 space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 flex items-center gap-2"><Ticket size={16}/> No Bolso</span>
                      <span className="font-bold text-white">{assigned}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Vendidas/Pagas</span>
                      <span className="font-bold text-emerald-400">{sold}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                      <span className="text-slate-500">Devolvíveis / Pendentes</span>
                      <span className="font-bold text-amber-500">{pending}</span>
                    </div>
                  </div>
                </div>

                {/* 🔥 GRID COM OS 3 BOTÕES DE AÇÃO */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openModal(staff, "assign")}
                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <PackagePlus size={16} /> Entregar
                  </button>
                  <button
                    onClick={() => openModal(staff, "pay")}
                    disabled={pending === 0}
                    className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <CircleDollarSign size={16} /> Receber
                  </button>
                  <button
                    onClick={() => openModal(staff, "return")}
                    disabled={pending === 0}
                    className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border border-amber-600/20 disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <PackageMinus size={16} /> Devolver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE BATCH INPUT */}
      {modalType && activeStaff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl p-6 w-full max-w-md relative">
            <h3 className="text-2xl font-black text-white mb-1">
              {modalType === "assign" && "Entregar Lote"}
              {modalType === "return" && "Recolher Cartelas"}
              {modalType === "pay" && "Registrar Pagamento"}
            </h3>
            <p className="text-slate-400 text-sm mb-6">Operando cartelas de: <strong className="text-emerald-400">@{activeStaff.user.username}</strong></p>

            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">
              Códigos das Cartelas (shortId)
            </label>
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="Ex: 001, 002, 003 ou cole uma coluna inteira..."
              className="w-full h-32 bg-black border border-slate-800 rounded-xl p-4 font-mono text-sm text-white focus:border-emerald-500 outline-none resize-none mb-4 custom-scrollbar"
            />

            {message && (
              <div className={`p-4 rounded-xl mb-4 text-sm font-bold ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setModalType(null)} 
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleProcess}
                disabled={isPending || !batchInput.trim()}
                className={`flex-1 py-4 rounded-xl font-black text-white transition-all disabled:opacity-50 
                  ${modalType === "assign" ? "bg-emerald-600 hover:bg-emerald-500" : ""}
                  ${modalType === "return" ? "bg-amber-600 hover:bg-amber-500" : ""}
                  ${modalType === "pay" ? "bg-blue-600 hover:bg-blue-500" : ""}
                `}
              >
                {isPending ? "Processando..." : "Confirmar Lote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}