"use client";

import { useState } from "react";
import { generateBatchCards, getEventCards } from "../../.././actions"; 
import { PDFDownloadLink } from "@react-pdf/renderer";
// Atenção ao caminho do seu BingoCardPDF! Adapte se precisar.
import { BingoCardPDF } from "../../../.././components/BingoCardPDF"; 

export default function GenerateCardsButton({ eventId, eventName }: { eventId: string, eventName: string }) {
  const [quantity, setQuantity] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  
  // Guardamos as cartelas prontas aqui para jogar no PDF
  const [readyEventData, setReadyEventData] = useState<any>(null);

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 5000) {
      alert("Escolha uma quantidade entre 1 e 5000 cartelas.");
      return;
    }

    if (!confirm(`Atenção: Isso vai gerar ${quantity} novas cartelas e apagar as antigas. Continuar?`)) {
      return;
    }

    setLoading(true);
    setReadyEventData(null); // Esconde o botão de PDF antigo
    
    // 1. Gera as matrizes
    await generateBatchCards(eventId, quantity);
    
    // 2. Busca as matrizes prontas com o nome do evento e patrocinadores
    const data = await getEventCards(eventId);
    setReadyEventData(data);
    
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Qtd. de Cartelas</label>
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
            className="w-full bg-slate-900 text-white hover:bg-slate-800 font-black py-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "GERANDO..." : "GERAR CARTELAS"}
          </button>
        </div>
      </div>
      
      {/* Se as cartelas estão prontas, mostramos o botão de Baixar PDF */}
      {readyEventData && readyEventData.cards.length > 0 && (
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center animate-in fade-in slide-in-from-top-2">
          <p className="text-emerald-700 font-bold mb-3">✅ {readyEventData.cards.length} Cartelas geradas com sucesso!</p>
          
          {/* O PDFDownloadLink renderiza o seu arquivo BingoCardPDF por trás dos panos */}
          <PDFDownloadLink 
            document={
              <BingoCardPDF 
                cards={readyEventData.cards} 
                eventName={eventName} 
                sponsors={readyEventData.sponsors} 
              />
            } 
            fileName={`cartelas-${eventName.replace(/\s+/g, '-').toLowerCase()}.pdf`}
            className="inline-block w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
          >
            {/* O React PDF precisa dessa funçãozinha para mostrar o status */}
            {({ loading }) => (loading ? 'PREPARANDO PDF...' : '⬇️ BAIXAR CARTELAS EM PDF')}
          </PDFDownloadLink>
        </div>
      )}
    </div>
  );
}