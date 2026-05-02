// src/app/imprimir/page.tsx
"use client";

import { useEffect, useState } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { BingoCardPDF } from "@/components/BingoCardPDF";

type Data = {
  name: string;
  cards: any[];
  sponsors: any[];
};

export default function PrintPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔥 pega eventId da URL (?event=xxx)
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get("event");

        if (!eventId) {
          alert("EventId não informado na URL");
          return;
        }

        const res = await fetch(`/api/get-print-data?eventId=${eventId}`);

        if (!res.ok) {
          throw new Error("Erro ao buscar dados");
        }

        const json = await res.json();

        setData({
          name: json.name,
          cards: json.cards,
          sponsors: json.sponsors,
        });
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar dados de impressão");
      }
    };

    fetchData();
  }, []);

  if (!data) {
    return (
      <div className="p-10 font-bold text-center">
        Gerando cartelas... aguarde.
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <BingoCardPDF
          cards={data.cards}
          eventName={data.name}
          sponsors={data.sponsors}
        />
      </PDFViewer>
    </div>
  );
}