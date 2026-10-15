// src/app/[subdomain]/dashboard/[eventId]/tesouraria/TesourariaClient.tsx
"use client";

import { useState, useTransition } from "react";
import {
  assignCardsToStaff, returnCardsFromStaff, registerCardPayment,
  assignCardsByQuantity, previewRemainingPayment, registerPaymentForAllRemaining,
} from "@/actions/tesouraria";
import { Package, Users, PackagePlus, PackageMinus, Ticket, CheckCircle2, CircleDollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TesourariaClient({ 
  eventId, 
  initialStaff,
  availableCardsCount,
  priceOptions = [],
  canChoosePhase = true
}: { 
  eventId: string; 
  initialStaff: any[];
  availableCardsCount: number;
  priceOptions?: { value: string; label: string }[];
  canChoosePhase?: boolean;
}) {
  const router = useRouter();
  const [activeStaff, setActiveStaff] = useState<any>(null);
  
  // 🔥 Adicionado o tipo "pay" para o acerto financeiro
  const [modalType, setModalType] = useState<"assign" | "return" | "pay" | null>(null);
  
  const [batchInput, setBatchInput] = useState("");
  const [tierId, setTierId] = useState(""); // "" = fase vigente agora
  // Entrega: por quantidade (padrão, sem digitar código) ou por códigos
  const [assignMode, setAssignMode] = useState<"qty" | "codes">("qty");
  const [qty, setQty] = useState(50);
  const [qtyType, setQtyType] = useState<"QUINA" | "FULL_HOUSE">("QUINA");
  const [delivered, setDelivered] = useState<{ count: number; first: string; last: string; codes: string[] } | null>(null);
  // Acerto: por códigos ou "tudo o que ficou com o voluntário"
  const [payAll, setPayAll] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openModal = (staff: any, type: "assign" | "return" | "pay") => {
    setActiveStaff(staff);
    setModalType(type);
    setBatchInput("");
    setMessage(null);
    setDelivered(null);
    setPayAll(false);
    setAssignMode("qty");
  };

  const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Pode confirmar? Depende do modo (quantidade/códigos/acerto de tudo).
  const needsCodes = modalType === "return" || (modalType === "assign" && assignMode === "codes") || (modalType === "pay" && !payAll);
  const canSubmit = needsCodes ? !!batchInput.trim() : modalType === "assign" ? qty >= 1 : true;

  const handleProcess = async () => {
    if (!activeStaff || !canSubmit) return;

    // ── Entrega por QUANTIDADE: sem digitar código ──
    if (modalType === "assign" && assignMode === "qty") {
      startTransition(async () => {
        const res = await assignCardsByQuantity(eventId, activeStaff.id, qty, qtyType);
        if (res.success && "codes" in res) {
          setDelivered({ count: res.count, first: res.first, last: res.last, codes: res.codes });
          setMessage(null);
          router.refresh();
        } else {
          setMessage({ text: res.error ?? "Não foi possível entregar.", type: "error" });
        }
      });
      return;
    }

    // ── Acerto de TUDO o que ficou com o voluntário (com prévia para conferir antes) ──
    if (modalType === "pay" && payAll) {
      startTransition(async () => {
        const preview = await previewRemainingPayment(eventId, activeStaff.id, tierId || undefined);
        if (!preview.success || !("amount" in preview)) {
          setMessage({ text: preview.error ?? "Não foi possível calcular o acerto.", type: "error" });
          return;
        }
        const detail = preview.fullHouse > 0 ? ` (${preview.quina} quina + ${preview.fullHouse} cheia)` : "";
        const ok = window.confirm(
          `Registrar o pagamento de ${preview.count} cartelas${detail} de ${activeStaff.user.name}?\n\nValor: ${brl(preview.amount)}\n\nConfirme só depois de devolver as cartelas NÃO vendidas.`
        );
        if (!ok) return;

        const res = await registerPaymentForAllRemaining(eventId, activeStaff.id, tierId || undefined);
        if (res.success && "amount" in res) {
          setMessage({ text: `${res.count} cartelas processadas com sucesso — ${brl(res.amount)} recebidos!`, type: "success" });
          router.refresh();
          setTimeout(() => setModalType(null), 2500);
        } else {
          setMessage({ text: res.error ?? "Erro ao registrar o pagamento.", type: "error" });
        }
      });
      return;
    }

    // ── Fluxos por códigos (entrega, devolução e acerto) ──
    if (!batchInput.trim()) return;
    const codes = batchInput.toUpperCase().split(/[\s,]+/).filter(Boolean);

    startTransition(async () => {
      let res;

      if (modalType === "assign") {
        res = await assignCardsToStaff(eventId, activeStaff.id, codes);
      } else if (modalType === "return") {
        res = await returnCardsFromStaff(eventId, activeStaff.id, codes);
      } else {
        res = await registerCardPayment(eventId, activeStaff.id, codes, tierId || undefined);
      }

      if (res.success) {
        const money =
          "amount" in res && typeof res.amount === "number"
            ? ` — ${brl(res.amount)} recebidos`
            : "";
        setMessage({ text: `${res.count} cartelas processadas com sucesso${money}!`, type: "success" });
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
          <div className="bg-[#111827] border border-slate-700 rounded-3xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-white mb-1">
              {modalType === "assign" && "Entregar Cartelas"}
              {modalType === "return" && "Recolher Cartelas"}
              {modalType === "pay" && "Registrar Pagamento"}
            </h3>
            <p className="text-slate-400 text-sm mb-6">Operando cartelas de: <strong className="text-emerald-400">@{activeStaff.user.username}</strong></p>

            {/* ENTREGAR: por quantidade (padrão) ou por códigos */}
            {modalType === "assign" && !delivered && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {([["qty", "Por quantidade"], ["codes", "Por códigos"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setAssignMode(value); setMessage(null); }}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                      assignMode === value ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {modalType === "assign" && assignMode === "qty" && !delivered && (
              <div className="mb-4 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Tipo de cartela</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["QUINA", "Quina"], ["FULL_HOUSE", "Cartela Cheia"]] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setQtyType(value)}
                        className={`py-3 rounded-xl text-sm font-black transition-all border ${
                          qtyType === value ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full bg-black border border-slate-800 rounded-xl p-4 text-2xl font-black text-white focus:border-emerald-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  O sistema separa as próximas cartelas livres, na ordem da impressão. Entregue ao voluntário as próximas
                  da pilha (imprima cada tipo separado).
                </p>
              </div>
            )}

            {/* Resultado da entrega por quantidade */}
            {delivered && (
              <div className="mb-4 space-y-3">
                <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold">
                  ✅ {delivered.count} cartelas entregues a {activeStaff.user.name}: de <span className="font-mono">{delivered.first}</span> até{" "}
                  <span className="font-mono">{delivered.last}</span>
                </div>
                <textarea
                  readOnly
                  value={delivered.codes.join("  ")}
                  className="w-full h-24 bg-black border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 resize-none"
                />
                <a
                  href={`/dashboard/${eventId}/extrato?staff=${activeStaff.id}`}
                  target="_blank"
                  className="block text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  Imprimir extrato deste voluntário
                </a>
              </div>
            )}

            {/* ACERTO: o tesoureiro usa SEMPRE a fase vigente (só o administrador escolhe outra) */}
            {modalType === "pay" && !canChoosePhase && priceOptions.length > 0 && (
              <div className="mb-4 p-3 rounded-xl border border-slate-700 bg-black/30">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Preço aplicado neste acerto</p>
                <p className="text-sm text-white">{priceOptions[0].label}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  O acerto usa sempre a fase de preço vigente. Só o administrador pode escolher outra fase. Tudo fica registrado na auditoria.
                </p>
              </div>
            )}

            {/* ACERTO: escolha da fase de preço (só administrador) */}
            {modalType === "pay" && canChoosePhase && priceOptions.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                  Preço aplicado neste acerto
                </label>
                <select
                  value={tierId}
                  onChange={(e) => setTierId(e.target.value)}
                  className="w-full bg-black border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                >
                  {priceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cartela vendida em papel na pré-venda deve ser acertada pelo preço da pré-venda, mesmo que o acerto seja só no dia do evento.
                </p>
              </div>
            )}

            {/* ACERTO: tudo o que ficou com o voluntário */}
            {modalType === "pay" && (
              <label className="flex items-start gap-3 mb-4 p-4 rounded-xl border border-slate-700 bg-black/30 cursor-pointer">
                <input type="checkbox" checked={payAll} onChange={(e) => setPayAll(e.target.checked)} className="mt-1 accent-emerald-500" />
                <span className="text-sm text-slate-300">
                  <strong className="text-white">Todas as cartelas que continuam com o voluntário</strong>
                  <span className="block text-[11px] text-slate-500 mt-1">
                    Use depois de <em>recolher</em> as cartelas NÃO vendidas: o que sobrou foi vendido. Você confere a quantidade e o valor antes de confirmar.
                  </span>
                </span>
              </label>
            )}

            {needsCodes && (
              <>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                  Códigos das Cartelas (shortId)
                </label>
                <textarea
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder="Ex: 001, 002, 003 ou cole uma coluna inteira..."
                  className="w-full h-32 bg-black border border-slate-800 rounded-xl p-4 font-mono text-sm text-white focus:border-emerald-500 outline-none resize-none mb-4"
                />
              </>
            )}

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
                {delivered ? "Fechar" : "Cancelar"}
              </button>
              {!delivered && (
                <button
                  onClick={handleProcess}
                  disabled={isPending || !canSubmit}
                  className={`flex-1 py-4 rounded-xl font-black text-white transition-all disabled:opacity-50
                    ${modalType === "assign" ? "bg-emerald-600 hover:bg-emerald-500" : ""}
                    ${modalType === "return" ? "bg-amber-600 hover:bg-amber-500" : ""}
                    ${modalType === "pay" ? "bg-blue-600 hover:bg-blue-500" : ""}
                  `}
                >
                  {isPending
                    ? "Processando..."
                    : modalType === "assign" && assignMode === "qty"
                    ? `Entregar ${qty} cartelas`
                    : modalType === "pay" && payAll
                    ? "Conferir e receber"
                    : "Confirmar Lote"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
