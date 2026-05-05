"use client";

import { useState } from "react";
import { generateBatchCards } from "@/actions/bingo";
import { Printer, Loader2, CheckCircle2 } from "lucide-react";

export default function GenerateCardsButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [quantity, setQuantity] = useState(100);
  const [loading, setLoading] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 5000) {
      alert("Para garantir a performance, gere lotes entre 1 e 5000 cartelas.");
      return;
    }

    if (!confirm(`Isso irá apagar as cartelas antigas e gerar ${quantity} novas cartelas únicas. Tem certeza?`)) {
      return;
    }

    setLoading(true);
    setGeneratedCount(null);

    try {
      // Chama a nossa nova action super-rápida e segura no servidor
      const res = await generateBatchCards(eventId, quantity);
      
      if (res.success && res.totalCreated) {
        setGeneratedCount(res.totalCreated);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao gerar cartelas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
            Qtd. de Cartelas
          </label>
          <input
            type="number"
            value={quantity}
            min={1}
            max={5000}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-800 transition-all text-lg"
          />
        </div>

        <div className="flex-[2] flex items-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 font-black py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                PROCESSANDO LOTE...
              </>
            ) : (
              "GERAR NOVAS CARTELAS"
            )}
          </button>
        </div>
      </div>

      {generatedCount !== null && (
        <div className="mt-4 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-emerald-700 font-black text-lg mb-2 flex items-center justify-center gap-2">
            <CheckCircle2 size={24} />
            {generatedCount} cartelas geradas com sucesso!
          </h3>
          <p className="text-emerald-600 text-sm mb-6 font-medium">
            O lote matemático foi criado e salvo no banco de dados.
          </p>

          <a
            href={`/imprimir?event=${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-emerald-500 text-white font-black py-4 px-8 rounded-xl hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-1"
          >
            <Printer size={20} />
            ABRIR TELA DE IMPRESSÃO
          </a>
          <p className="text-emerald-600/60 text-xs mt-3 font-medium">
            Dica: Na próxima tela, aperte Ctrl+P (ou Cmd+P) e escolha "Salvar como PDF".
          </p>
        </div>
      )}
    </div>
  );
}