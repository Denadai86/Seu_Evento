// src/features/tesouraria/components/TreasuryClient.tsx
"use client";

import { useState, useTransition } from "react";
import { assignCardsToStaff, returnCardsFromStaff } from "../actions";
import { PackagePlus, PackageMinus, Users, TrendingUp } from "lucide-react";

export default function TreasuryClient({ eventId, initialStaff }: { 
  eventId: string; 
  initialStaff: any[] 
}) {
  const [activeStaff, setActiveStaff] = useState<any>(null);
  const [modalType, setModalType] = useState<"assign" | "return" | null>(null);
  const [batchInput, setBatchInput] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const openModal = (staff: any, type: "assign" | "return") => {
    setActiveStaff(staff);
    setModalType(type);
    setBatchInput("");
    setMessage("");
  };

  const handleProcess = async () => {
    if (!batchInput.trim() || !activeStaff) return;

    const codes = batchInput.toUpperCase().split(/[\s,]+/).filter(Boolean);

    startTransition(async () => {
      let res;
      if (modalType === "assign") {
        res = await assignCardsToStaff(eventId, activeStaff.id, codes);
      } else {
        res = await returnCardsFromStaff(eventId, activeStaff.id, codes);
      }

      if (res.success) {
        setMessage(`✅ ${res.count} cartelas processadas com sucesso!`);
        setBatchInput("");
        // Refresh manual (ou usar router.refresh se estiver usando)
        window.location.reload();
      } else {
        setMessage(`❌ ${res.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialStaff.map((staff: any) => {
          const assigned = staff.cards.length;
          const sold = staff.cards.filter((c: any) => c.isPaid).length;
          const pending = assigned - sold;

          return (
            <div key={staff.id} className="bg-slate-900 border border-slate-700 rounded-3xl p-6 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <Users className="text-slate-400" size={28} />
                <div>
                  <h3 className="font-bold text-lg text-white">{staff.user.name}</h3>
                  <p className="text-xs text-slate-500">ID: {staff.id.slice(0,8)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                <div>
                  <p className="text-2xl font-black text-blue-400">{assigned}</p>
                  <p className="text-[10px] text-slate-500">Atribuídas</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-400">{sold}</p>
                  <p className="text-[10px] text-slate-500">Vendidas</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-orange-400">{pending}</p>
                  <p className="text-[10px] text-slate-500">Pendentes</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openModal(staff, "assign")}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <PackagePlus size={18} /> Entregar
                </button>
                <button
                  onClick={() => openModal(staff, "return")}
                  disabled={pending === 0}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <PackageMinus size={18} /> Devolver
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalType && activeStaff && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-xl font-black mb-6">
              {modalType === "assign" ? "Entregar Lote" : "Devolver Cartelas"}
            </h3>
            <p className="text-slate-400 mb-4">Voluntário: <strong>{activeStaff.user.name}</strong></p>

            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="Cole os códigos separados por vírgula ou espaço..."
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-2xl p-4 font-mono text-sm resize-y"
            />

            {message && <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">{message}</div>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalType(null)} className="flex-1 py-3 border border-slate-700 rounded-2xl">Cancelar</button>
              <button 
                onClick={handleProcess}
                disabled={isPending || !batchInput.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-2xl font-bold disabled:opacity-50"
              >
                {isPending ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}