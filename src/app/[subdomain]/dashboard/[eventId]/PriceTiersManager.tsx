// src/app/[subdomain]/dashboard/[eventId]/PriceTiersManager.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { createPriceTier, deletePriceTier } from "@/actions/priceTier";
import { activeTier } from "@/lib/priceTiers";

type TierView = {
  id: string;
  name: string;
  quinaPrice: number;
  fullHousePrice: number | null;
  startsAt: string | null; // ISO
};

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// "10,50" / "10.50" / "R$ 10" → centavos (0 se inválido)
function toCents(text: string): number {
  const clean = text.replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  const safe = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : parts[0];
  const cents = Math.round(parseFloat(safe) * 100);
  return Number.isFinite(cents) ? cents : 0;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function PriceTiersManager({
  eventId,
  tiers,
  defaultQuina,
  defaultFull,
}: {
  eventId: string;
  tiers: TierView[];
  defaultQuina: number;
  defaultFull: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [quina, setQuina] = useState("");
  const [full, setFull] = useState("");
  const [startsAt, setStartsAt] = useState("");

  // Só para destacar a fase vigente na tela. Quem decide o preço cobrado é sempre o servidor.
  const current = activeTier(
    tiers.map((t) => ({ ...t, startsAt: t.startsAt ? new Date(t.startsAt) : null })),
    new Date()
  );

  const sorted = [...tiers].sort(
    (a, b) => (a.startsAt ? new Date(a.startsAt).getTime() : -Infinity) - (b.startsAt ? new Date(b.startsAt).getTime() : -Infinity)
  );

  const handleCreate = () => {
    const quinaCents = toCents(quina);
    const fullCents = full.trim() ? toCents(full) : null;
    if (!name.trim()) return toast.error("Dê um nome para a fase (ex.: Pré-venda).");
    if (quinaCents <= 0) return toast.error("Informe o preço da cartela.");
    if (full.trim() && (fullCents ?? 0) <= 0) return toast.error("Preço da cartela cheia inválido.");

    startTransition(async () => {
      const res = await createPriceTier(eventId, {
        name,
        quinaPrice: quinaCents,
        fullHousePrice: fullCents,
        // datetime-local vem no horário do navegador; vira ISO (UTC) para o servidor comparar com "agora"
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      });
      if (!res.success) {
        toast.error(res.error ?? "Não foi possível criar a fase.");
        return;
      }
      toast.success("Fase de preço criada.");
      setName(""); setQuina(""); setFull(""); setStartsAt("");
      router.refresh();
    });
  };

  const handleDelete = (tier: TierView) => {
    if (!confirm(`Apagar a fase "${tier.name}"? As cartelas já vendidas não mudam de preço.`)) return;
    startTransition(async () => {
      const res = await deletePriceTier(eventId, tier.id);
      if (!res.success) {
        toast.error(res.error ?? "Não foi possível apagar.");
        return;
      }
      toast.success("Fase apagada.");
      router.refresh();
    });
  };

  const inputCls =
    "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors";

  return (
    <section className="bg-[#111827] border border-emerald-900/30 rounded-3xl p-8 shadow-2xl mb-6">
      <div className="flex items-center gap-3 mb-2">
        <CalendarClock className="text-emerald-400" size={26} />
        <h2 className="text-2xl font-black text-white">Fases de Preço</h2>
      </div>
      <p className="text-slate-400 text-sm mb-6 max-w-2xl">
        Cartelas mais baratas na pré-venda e mais caras perto do evento. O preço muda sozinho na data de cada fase e
        o caixa só aplica o valor vigente. Sem nenhuma fase vigente, vale o preço padrão
        ({brl(defaultQuina)}{defaultFull ? ` • cheia ${brl(defaultFull)}` : ""}). Cartelas já vendidas nunca mudam de preço.
      </p>

      {sorted.length === 0 ? (
        <p className="text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl p-4 mb-6">
          Nenhuma fase criada. Está valendo o preço padrão.
        </p>
      ) : (
        <ul className="space-y-2 mb-6">
          {sorted.map((tier) => {
            const isCurrent = current?.id === tier.id;
            return (
              <li
                key={tier.id}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                  isCurrent ? "border-emerald-500/60 bg-emerald-500/5" : "border-slate-800 bg-black/30"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-black text-white flex items-center gap-2">
                    {tier.name}
                    {isCurrent && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-black px-2 py-0.5 rounded">
                        Vigente
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-300">
                    Quina {brl(tier.quinaPrice)} • Cheia{" "}
                    {tier.fullHousePrice ? brl(tier.fullHousePrice) : `padrão${defaultFull ? ` (${brl(defaultFull)})` : ""}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tier.startsAt ? `a partir de ${fmtDate(tier.startsAt)}` : "desde o início"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(tier)}
                  disabled={isPending}
                  className="text-slate-500 hover:text-red-400 p-2 disabled:opacity-50"
                  aria-label={`Apagar fase ${tier.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nome</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Pré-venda" maxLength={40} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Quina (R$)</label>
          <input className={inputCls} value={quina} onChange={(e) => setQuina(e.target.value)} placeholder="10,00" inputMode="decimal" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Cheia (R$)</label>
          <input className={inputCls} value={full} onChange={(e) => setFull(e.target.value)} placeholder="padrão" inputMode="decimal" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Começa em</label>
          <input type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Deixe &quot;Começa em&quot; vazio na primeira fase (vale desde o início). Deixe &quot;Cheia&quot; vazio para usar o preço padrão da cartela cheia.
      </p>
    </section>
  );
}
