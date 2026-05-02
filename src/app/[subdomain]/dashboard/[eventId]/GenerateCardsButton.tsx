"use client";

import { useState } from "react";
import { generateBatchCards, getEventCards } from "@/actions/bingo";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { BingoCardPDF } from "@/components/BingoCardPDF";

type Card = {
  id: string;
  shortId: string;
  matrix: {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
  };
};

type Sponsor = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

type ReadyData = {
  cards: Card[];
  sponsors: Sponsor[];
};

export default function GenerateCardsButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [quantity, setQuantity] = useState(100);
  const [loading, setLoading] = useState(false);
  const [readyEventData, setReadyEventData] = useState<ReadyData | null>(null);

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 5000) {
      alert("Escolha entre 1 e 5000 cartelas.");
      return;
    }

    if (!confirm(`Gerar ${quantity} cartelas e apagar as antigas?`)) {
      return;
    }

    setLoading(true);
    setReadyEventData(null);

    try {
      await generateBatchCards(eventId, quantity);

      const data = await getEventCards(eventId);

      // 🔥 NORMALIZAÇÃO PROFISSIONAL (mata null)
      const safeData: ReadyData = {
        cards: data.cards,
        sponsors: data.sponsors.map((s: Sponsor) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logoUrl ?? undefined,
        })),
      };

      setReadyEventData(safeData);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar cartelas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
            Qtd. de Cartelas
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 focus:border-emerald-500 outline-none font-bold text-slate-800"
          />
        </div>

        <div className="flex-[2] flex items-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-slate-900 text-white hover:bg-slate-800 font-black py-4 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "GERANDO..." : "GERAR CARTELAS"}
          </button>
        </div>
      </div>

      {readyEventData && readyEventData.cards.length > 0 && (
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="text-emerald-700 font-bold mb-3">
            ✅ {readyEventData.cards.length} cartelas geradas!
          </p>

          <PDFDownloadLink
            document={
              <BingoCardPDF
                cards={readyEventData.cards}
                eventName={eventName}
                sponsors={readyEventData.sponsors}
              />
            }
            fileName={`cartelas-${eventName
              .replace(/\s+/g, "-")
              .toLowerCase()}.pdf`}
            className="inline-block w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition shadow-lg"
          >
            {({ loading }) =>
              loading ? "PREPARANDO PDF..." : "⬇️ BAIXAR PDF"
            }
          </PDFDownloadLink>
        </div>
      )}
    </div>
  );
}