// src/app/[subdomain]/print/page.tsx
//
// IMPRESSÃO DAS CARTELAS. O desenho vem do modelo escolhido pelo organizador (src/lib/cardDesign.ts) e é o MESMO
// componente da amostra: o que aparece na amostra é o que sai no papel. ?mode=bw|color e ?theme=… trocam só nesta
// impressão (o mesmo evento pode ir colorido para a gráfica e preto e branco para a copiadora).

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "./PrintButton";
import QRCode from "qrcode";
import { requireReportAccess } from "@/lib/requireReportAccess";
import { isCardType, CARD_TYPE_LABEL } from "@/lib/cardPricing";
import { siteConfig } from "@/config/site";
import { buildVerifyUrl } from "@/lib/verifyUrl";
import CardFace from "@/components/print/CardFace";
import { CARD_CSS } from "@/components/print/cardCss";
import { layoutProfile, parseCardDesign, prizeLine, type CardKind } from "@/lib/cardDesign";
import type { BingoMatrix } from "@/lib/bingoRules";

// --- Configuração de Layouts ---
type Layout = "a4-4" | "a4-2" | "a4-1" | "a4-6" | "a6";
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

// --- QR Code: o endereço vem de uma função testada (src/lib/verifyUrl.ts) ---
async function generateQRCode(shortId: string, eventId: string, subdomain: string): Promise<string> {
  const verifyUrl = buildVerifyUrl({
    subdomain,
    rootDomain: siteConfig.rootDomain,
    eventId,
    shortId,
    isLocal: process.env.NODE_ENV === "development",
    protocol: process.env.NEXT_PUBLIC_PROTOCOL,
  });
  return await QRCode.toDataURL(verifyUrl, { width: 140, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
}

interface PrintPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ eventId?: string; layout?: string; type?: string; mode?: string; theme?: string }>;
}

export default async function PrintView({ params, searchParams }: PrintPageProps) {
  const { subdomain } = await params;
  const { eventId, layout: rawLayout = "a4-4", type: rawType, mode: rawMode, theme: rawTheme } = await searchParams;

  if (!eventId) notFound();

  const layout: Layout = VALID_LAYOUTS.includes(rawLayout as Layout) ? (rawLayout as Layout) : "a4-4";

  // 🔐 As cartelas (números e QR) só saem para o ORG_ADMIN do tenant (ou Super Admin, só leitura).
  const tenant = await requireReportAccess(subdomain);

  // ?type=QUINA | FULL_HOUSE imprime só aquele tipo (a gráfica recebe cada tipo separado).
  const typeFilter = isCardType(rawType) ? rawType : null;

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    include: {
      tenant: true,
      cards: { where: typeFilter ? { type: typeFilter } : {}, orderBy: { shortId: "asc" } },
      sponsors: true,
      prizes: { orderBy: { order: "asc" }, select: { type: true, prizeName: true } },
    },
  });

  if (!event || event.cards.length === 0) {
    return <div className="p-10 text-center text-red-500">Nenhuma cartela encontrada.</div>;
  }

  // Modelo salvo + troca só para esta impressão (?mode, ?theme). parseCardDesign nunca quebra.
  const design = parseCardDesign({
    ...((event.cardDesign as Record<string, unknown> | null) ?? {}),
    ...(rawMode ? { mode: rawMode } : {}),
    ...(rawTheme ? { theme: rawTheme } : {}),
  });
  const profile = layoutProfile(layout);
  const prizesText = prizeLine(event.prizes);
  const sponsors = event.sponsors.map((s) => ({ id: s.id, name: s.name, logoUrl: s.logoUrl }));

  const { gridClass, cardClass, perPage, pageSize } = getLayoutConfig(layout);
  const pages = chunk(event.cards, perPage);

  const cardsWithQR = await Promise.all(
    event.cards.map(async (card) => ({ ...card, qrCode: await generateQRCode(card.shortId, eventId, subdomain) }))
  );
  const qrById = new Map(cardsWithQR.map((c) => [c.id, c.qrCode]));

  // Links da barra: preservam o que já foi escolhido.
  const href = (over: Record<string, string>) => {
    const q = new URLSearchParams({ eventId, layout, ...(typeFilter ? { type: typeFilter } : {}), mode: design.mode, theme: design.theme, ...over });
    return `/print?${q.toString()}`;
  };
  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition ${active ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`;

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-black font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        ${CARD_CSS}
        @media print {
          @page { margin: 10mm; size: ${pageSize}; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      {/* Barra de Controle */}
      <div className="print:hidden sticky top-0 bg-slate-900 text-white p-4 shadow-xl z-50 flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="font-bold">Impressão: {LAYOUT_LABELS[layout]}</h1>
          <p className="text-xs text-slate-400">
            {typeFilter ? `${CARD_TYPE_LABEL[typeFilter]} • ` : ""}{event.cards.length} cartelas • {pages.length} página{pages.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href({ mode: "color" })} className={chip(design.mode === "color")}>Colorido</Link>
          <Link href={href({ mode: "bw" })} className={chip(design.mode === "bw")}>Preto e branco</Link>
          <Link href={`/dashboard/${eventId}/modelo`} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-2">
            Editar o modelo
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="p-4 md:p-8 print:p-0">
        {pages.map((pageCards, pageIndex) => (
          <div key={pageIndex} className={`${gridClass} ${pageIndex < pages.length - 1 ? "break-after-page" : ""}`}>
            {pageCards.map((card) => (
              // A linha tracejada fica só como guia de corte; a moldura e as cores são da própria cartela.
              <div key={card.id} className={`p-[3mm] border border-dashed border-slate-300 print:border-slate-400 bg-white ${cardClass}`}>
                <CardFace
                  design={design}
                  kind={card.type as CardKind}
                  matrix={card.matrix as BingoMatrix}
                  shortId={card.shortId}
                  qrCodeDataUrl={qrById.get(card.id)!}
                  eventName={event.name}
                  organization={event.tenant.name}
                  sponsors={sponsors}
                  prizesText={prizesText}
                  compact={profile.compact}
                  scale={profile.scale}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
