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

function PrintOptions({ eventId }: { eventId: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {printOptions.map(({ layout, label, description, color, icon: Icon }) => (
        <a
          key={layout}
          href={`/print?eventId=${eventId}&layout=${layout}`}
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
}: {
  eventId: string;
  eventName: string;
}) {
  const [amount, setAmount] = useState(100);
  const [isPending, startTransition] = useTransition();
  const [successCount, setSuccessCount] = useState(0);

  const handleGenerate = () => {
    if (amount <= 0 || amount > 5000) return alert("Quantidade inválida");
    startTransition(async () => {
      const res = await generateCards(eventId, amount);
      if (res.success) {
        setSuccessCount(amount);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      
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
          ✅ {successCount} cartelas criadas e adicionadas ao estoque com sucesso!
        </div>
      )}

{/* Módulo de Impressão (Central de Saída) */}
<div className="pt-6 border-t border-slate-800">
  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
    <Printer size={16} /> Central de Impressão
  </h3>

  <PrintOptions eventId={eventId} />
</div>

    </div>
  );
}