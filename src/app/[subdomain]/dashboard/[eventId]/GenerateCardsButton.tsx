// src/app/[subdomain]/dashboard/[eventId]/GenerateCardsButton.tsx
"use client";

import { useState, useTransition } from "react";
import { generateBatchCards as generateCards} from "@/actions/bingo";
import { Printer, FileText, Smartphone, BookOpen, Award } from "lucide-react";

// ======================== CONFIGURAÇÃO DE IMPRESSÃO ========================

const printOptions = [
  {
    layout: "a4-4",
    label: "Padrão A4",
    description: "4 por folha",
    color: "emerald",
    icon: FileText,
  },
  {
    layout: "a4-6",
    label: "Econômico A4",
    description: "6 por folha",
    color: "purple",
    icon: FileText,
  },
  {
    layout: "a4-2",
    label: "Modo Idoso",
    description: "2 por folha (A4)",
    color: "blue",
    icon: BookOpen,
  },
  {
    layout: "a4-1",
    label: "Premium A4",
    description: "1 por folha",
    color: "rose",
    icon: FileText,
  },
  {
    layout: "a6",
    label: "Padrão Gráfica",
    description: "A6 (10x15)",
    color: "amber",
    icon: Smartphone,
  },
] as const;

function PrintOptions({ eventId, type }: { eventId: string; type: "ALL" | "QUINA" | "FULL_HOUSE" }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {printOptions.map(({ layout, label, description, color, icon: Icon }) => (
        <a
          key={layout}
          href={`/print?eventId=${eventId}&layout=${layout}${type === "ALL" ? "" : `&type=${type}`}`}
          target="_blank"
          className={`
            bg-slate-900 border border-slate-700 
            hover:border-${color}-500/50 
            p-4 rounded-xl flex flex-col items-center text-center 
            transition-all group
          `}
        >
          <Icon 
            className={`text-slate-500 group-hover:text-${color}-400 mb-2 transition-colors`} 
            size={24} 
          />
          <span className="text-slate-200 font-bold text-sm">{label}</span>
          <span className="text-slate-500 text-[10px] uppercase mt-1">
            {description}
          </span>
        </a>
      ))}
    </div>
  );
}

export default function GenerateCardsButton({
  eventId,
  eventName,
  fullHousePrice = null,
}: {
  eventId: string;
  eventName: string;
  fullHousePrice?: number | null;
}) {
  const [amount, setAmount] = useState(100);
  const [type, setType] = useState<"QUINA" | "FULL_HOUSE">("QUINA");
  const [printType, setPrintType] = useState<"ALL" | "QUINA" | "FULL_HOUSE">("ALL");
  const [isPending, startTransition] = useTransition();
  const [successCount, setSuccessCount] = useState(0);
  const [lastType, setLastType] = useState<"QUINA" | "FULL_HOUSE">("QUINA");

  const handleGenerate = () => {
    if (amount <= 0 || amount > 5000) return alert("Quantidade inválida");
    if (type === "FULL_HOUSE" && !fullHousePrice) {
      return alert("Defina primeiro o preço da cartela cheia (no topo da página).");
    }
    startTransition(async () => {
      const res = await generateCards(eventId, amount, type);
      if (res.success) {
        setSuccessCount(amount);
        setLastType(type);
      } else {
        alert(res.error ?? "Não foi possível gerar as cartelas.");
      }
    });
  };

  const typeButton = (value: "QUINA" | "FULL_HOUSE", label: string) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={`flex-1 px-4 py-3 rounded-xl font-black text-sm transition-all border ${
        type === value
          ? "bg-emerald-600 border-emerald-500 text-white"
          : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      
      {/* Tipo de cartela: cada tipo concorre só aos prêmios do mesmo tipo e tem preço próprio */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Tipo de Cartela
        </label>
        <div className="flex gap-3">
          {typeButton("QUINA", "Quina")}
          {typeButton("FULL_HOUSE", "Cartela Cheia")}
        </div>
        {type === "FULL_HOUSE" && !fullHousePrice && (
          <p className="text-xs text-amber-400 mt-2">
            Defina o preço da cartela cheia no topo da página antes de gerar este tipo.
          </p>
        )}
      </div>

      {/* Módulo de Geração */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
            Qtd. de Novas Cartelas
          </label>
          <input
            type="number"
            min="1"
            max="5000"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-xl transition-all disabled:opacity-50 h-[50px]"
          >
            {isPending ? "Gerando..." : "+ Gerar Estoque"}
          </button>
        </div>
      </div>

      {successCount > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-sm text-center font-bold animate-in fade-in">
          ✅ {successCount} cartelas de {lastType === "FULL_HOUSE" ? "cartela cheia" : "quina"} criadas e adicionadas ao estoque com sucesso!
        </div>
      )}

{/* Módulo de Impressão (Central de Saída) */}
<div className="pt-6 border-t border-slate-800">
  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
    <Printer size={16} /> Central de Impressão
  </h3>

  <div className="flex flex-wrap gap-2 mb-4">
    {([["ALL", "Todas"], ["QUINA", "Só Quina"], ["FULL_HOUSE", "Só Cartela Cheia"]] as const).map(([value, label]) => (
      <button
        key={value}
        type="button"
        onClick={() => setPrintType(value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          printType === value
            ? "bg-slate-700 border-slate-500 text-white"
            : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500"
        }`}
      >
        {label}
      </button>
    ))}
  </div>

  <a
          href={`/dashboard/${eventId}/modelo`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/10 px-5 py-4 mb-4 transition"
        >
          <span>
            <span className="block font-black text-white">🎨 Modelo da cartela</span>
            <span className="block text-xs text-slate-400">Escolha o tema, colorido ou preto e branco, e veja a amostra antes de imprimir</span>
          </span>
          <span className="text-emerald-400 font-black text-sm shrink-0">Abrir →</span>
        </a>
        <PrintOptions eventId={eventId} type={printType} />
</div>

    </div>
  );
}