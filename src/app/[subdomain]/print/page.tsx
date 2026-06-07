// src/app/[subdomain]/print/page.tsx

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import QRCode from "qrcode";

// --- Tipos ---
type Layout = "a4-4" | "a4-2" | "a4-1" | "a4-6" | "a6";

type SponsorItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  contribution: number;
};

type CardWithQR = {
  id: string;
  shortId: string;
  matrix: any;
};

// --- Configuração de Layouts ---
const VALID_LAYOUTS: Layout[] = ["a4-4", "a4-2", "a4-1", "a4-6", "a6"];

const LAYOUT_LABELS: Record<Layout, string> = {
  "a4-4": "A4 — 4 cartelas (2×2)",
  "a4-2": "A4 — 2 cartelas (1×2)",
  "a4-1": "A4 — 1 cartela (premium)",
  "a4-6": "A4 — 6 cartelas (3×2)",
  "a6":   "A6 — 1 cartela (gráfica)",
};

function getLayoutConfig(layout: Layout) {
  switch (layout) {
    case "a4-4": return { gridClass: "grid grid-cols-2 gap-4",  cardClass: "h-[13.5cm]", perPage: 4, pageSize: "A4" };
    case "a4-2": return { gridClass: "grid grid-cols-1 gap-6",  cardClass: "h-[19cm]",   perPage: 2, pageSize: "A4" };
    case "a4-1": return { gridClass: "grid grid-cols-1",         cardClass: "h-[26cm]",   perPage: 1, pageSize: "A4" };
    case "a4-6": return { gridClass: "grid grid-cols-3 gap-3",  cardClass: "h-[9cm]",    perPage: 6, pageSize: "A4" };
    case "a6":   return { gridClass: "grid grid-cols-1",         cardClass: "h-[14cm] w-[10cm] mx-auto", perPage: 1, pageSize: "A6" };
  }
}

// --- QR Code Generator ---
async function generateQRCode(shortId: string, eventId: string, subdomain: string): Promise<string> {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";
  const protocol = process.env.NEXT_PUBLIC_PROTOCOL || "https://";
  const isLocal = process.env.NODE_ENV === "development";
  
  // Montagem dinâmica e correta do subdomínio
  const fullDomain = isLocal 
    ? `${subdomain}.localhost:3000` 
    : `${subdomain}.${rootDomain}`;

  const verifyUrl = `${protocol}${fullDomain}/verify?event=${eventId}&id=${shortId}`;

  return await QRCode.toDataURL(verifyUrl, {
    width: 140,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// --- Componentes ---
function SponsorBar({ sponsors }: { sponsors: SponsorItem[] }) {
  if (sponsors.length === 0) {
    return (
      <div className="mt-3 pt-2 border-t border-slate-300 text-center">
        <p className="text-[7px] uppercase tracking-widest text-slate-500">Apoio Cultural</p>
        <span className="text-[8px] text-slate-400 italic">Espaço para Patrocinador</span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-2 border-t border-slate-300 shrink-0">
      <p className="text-[7px] uppercase tracking-widest text-center text-slate-500 mb-1 font-bold">
        Apoio Cultural
      </p>
      <div className="flex justify-center items-center gap-3 h-6 overflow-hidden">
        {sponsors.map((s) => (
          <div key={s.id} className="flex-shrink-0">
            {s.logoUrl ? (
              <img src={s.logoUrl} className="h-5 object-contain grayscale" alt={s.name} />
            ) : (
              <span className="text-[8px] font-bold uppercase">{s.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QRCodeSection({ qrCodeDataUrl, shortId }: { qrCodeDataUrl: string; shortId: string }) {
  return (
    <div className="absolute top-2 right-2 flex flex-col items-end">
      <img src={qrCodeDataUrl} alt="QR Code" className="w-16 h-16 border border-black bg-white p-0.5" />
      <span className="text-[7px] font-mono text-black mt-0.5">{shortId}</span>
    </div>
  );
}

// --- Página Principal ---
interface PrintPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ eventId?: string; layout?: string }>;
}

export default async function PrintView({ params, searchParams }: PrintPageProps) {
  const { subdomain } = await params;
  const { eventId, layout: rawLayout = "a4-4" } = await searchParams;

  if (!eventId) notFound();

  const layout: Layout = VALID_LAYOUTS.includes(rawLayout as Layout) ? (rawLayout as Layout) : "a4-4";

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenant: { subdomain } },
    include: {
      tenant: true,
      cards: { orderBy: { shortId: "asc" } },
      sponsors: true,
    },
  });

  if (!event || event.cards.length === 0) {
    return <div className="p-10 text-center text-red-500">Nenhuma cartela encontrada.</div>;
  }

  const { gridClass, cardClass, perPage, pageSize } = getLayoutConfig(layout);
  const pages = chunk(event.cards, perPage);

  // Gera QR Codes para todas as cartelas
  const cardsWithQR = await Promise.all(
    event.cards.map(async (card) => ({
      ...card,
      qrCode: await generateQRCode(card.shortId, eventId, subdomain),
    }))
  );

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-black font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 10mm; size: ${pageSize}; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      {/* Barra de Controle */}
      <div className="print:hidden sticky top-0 bg-slate-900 text-white p-4 shadow-xl z-50 flex justify-between items-center">
        <div>
          <h1 className="font-bold">Impressão: {LAYOUT_LABELS[layout]}</h1>
          <p className="text-xs text-slate-400">
            {event.cards.length} cartelas • {pages.length} página{pages.length > 1 ? "s" : ""}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="p-4 md:p-8 print:p-0">
        {pages.map((pageCards, pageIndex) => (
          <div
            key={pageIndex}
            className={`${gridClass} ${pageIndex < pages.length - 1 ? "break-after-page" : ""}`}
          >
            {pageCards.map((card) => {
              const cardWithQR = cardsWithQR.find(c => c.id === card.id)!;

              return (
                <div
                  key={card.id}
                  className={`relative border-2 border-dashed border-slate-300 print:border-black p-4 bg-white flex flex-col ${cardClass}`}
                >
                  {/* QR Code no canto superior direito */}
                  <QRCodeSection qrCodeDataUrl={cardWithQR.qrCode} shortId={card.shortId} />

                  {/* Cabeçalho */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                    <div>
                      <h2 className="text-lg font-black uppercase tracking-tight leading-none">
                        {event.name}
                      </h2>
                      <p className="text-[9px] text-slate-600 font-bold tracking-widest mt-1">
                        ID: {card.shortId}
                      </p>
                    </div>
                  </div>

                  {/* Grade do Bingo */}
                  <div className="flex-1 flex flex-col border-2 border-black rounded-lg overflow-hidden">
                    <div className="grid grid-cols-5 bg-black text-white text-center font-black text-xl py-1">
                      {["B", "I", "N", "G", "O"].map((l) => <div key={l}>{l}</div>)}
                    </div>

                    <div className="flex-1 grid grid-cols-5 grid-rows-5 text-2xl font-black">
                      {([0,1,2,3,4] as const).map((row) =>
                        (["B","I","N","G","O"] as const).map((letter) => {
                          const isCenter = letter === "N" && row === 2;
                          const number = isCenter ? null : (card.matrix as any)[letter][row];

                          return (
                            <div
                              key={`${letter}-${row}`}
                              className={`border border-black flex items-center justify-center ${isCenter ? "bg-slate-200" : "bg-white"}`}
                            >
                              {isCenter ? "★" : number}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Patrocinadores */}
                  <SponsorBar sponsors={event.sponsors} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper chunk
function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}