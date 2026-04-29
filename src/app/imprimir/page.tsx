// src/app/imprimir/page.tsx
"use client";

import { useEffect, useState } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { BingoCardPDF } from "../../components/BingoCardPDF";
import { getActiveEvent } from "../actions";

export default function PrintPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Busca todas as cartelas do evento ativo
    const fetchData = async () => {
      // Como o getActiveEvent que temos só retorna o evento, vamos precisar de uma nova action
      // para trazer as cartelas e patrocinadores também.
      const res = await fetch('/api/get-print-data'); // Usaremos uma API simples para isso
      const json = await res.json();
      setData(json);
    };
    fetchData();
  }, []);

  if (!data) return <div className="p-10 font-bold">Gerando cartelas... aguarde.</div>;

  return (
    <div className="w-full h-screen">
      <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
        <BingoCardPDF 
          cards={data.cards} 
          eventName={data.event.name} 
          sponsors={data.event.sponsors} 
        />
      </PDFViewer>
    </div>
  );
}