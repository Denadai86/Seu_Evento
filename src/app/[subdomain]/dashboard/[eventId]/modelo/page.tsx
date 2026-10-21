// src/app/[subdomain]/dashboard/[eventId]/modelo/page.tsx
//
// MODELO DA CARTELA: o organizador escolhe o tema, colorido ou preto e branco, e vê a AMOSTRA ao vivo, antes de
// imprimir (e até antes de gerar as cartelas). O visual não fica gravado na cartela: trocar não exige gerar de novo.

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireReportAccess } from "@/lib/requireReportAccess";
import { siteConfig } from "@/config/site";
import { buildVerifyUrl } from "@/lib/verifyUrl";
import { parseCardDesign, prizeLine } from "@/lib/cardDesign";
import CardDesignEditor from "./CardDesignEditor";

export const metadata = { title: "Modelo da cartela" };

export default async function ModeloPage({ params }: { params: Promise<{ subdomain: string; eventId: string }> }) {
  const { subdomain, eventId } = await params;
  const tenant = await requireReportAccess(subdomain);

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: {
      name: true,
      cardDesign: true,
      tenant: { select: { name: true } },
      sponsors: { select: { id: true, name: true, logoUrl: true } },
      prizes: { orderBy: { order: "asc" }, select: { type: true, prizeName: true } },
      _count: { select: { cards: true } },
    },
  });
  if (!event) notFound();

  // QR de amostra (aponta para um código que não existe: serve só para o desenho)
  const sampleQr = await QRCode.toDataURL(
    buildVerifyUrl({ subdomain, rootDomain: siteConfig.rootDomain, eventId, shortId: "AMOSTRA", isLocal: process.env.NODE_ENV === "development" }),
    { width: 140, margin: 1 }
  );

  return (
    <CardDesignEditor
      eventId={eventId}
      eventName={event.name}
      organization={event.tenant.name}
      initialDesign={parseCardDesign(event.cardDesign)}
      sponsors={event.sponsors}
      prizesText={prizeLine(event.prizes)}
      sampleQr={sampleQr}
      cardCount={event._count.cards}
    />
  );
}
