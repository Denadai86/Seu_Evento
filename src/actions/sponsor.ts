// src/actions/sponsor.ts
"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD DE LOGO PARA VERCEL BLOB
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadSponsorLogo(formData: FormData) {
  const tenantId = await requireTenant();

  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo enviado.");
  if (file.size > 2 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 2MB.");
  if (!file.type.startsWith("image/")) throw new Error("Apenas imagens são permitidas.");

  const blob = await put(`sponsors/${tenantId}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return blob.url;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR PATROCINADOR
// Suporta criação atômica de Prêmio/Rodada vinculado ao patrocinador
// ─────────────────────────────────────────────────────────────────────────────
export async function addSponsor(
  eventId: string,
  name: string,
  contribution: number = 0,
  logoUrl?: string,
  prizeData?: {
    roundName: string;
    prizeName: string;
    type: "QUINA" | "FULL_HOUSE";
  }
) {
  const tenantId = await requireTenant();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true, tenant: { select: { subdomain: true } } },
  });
  if (!event) throw new Error("Evento não encontrado ou acesso negado.");

  // Se o patrocinador trouxe prenda, cria patrocinador + rodada na mesma transação
  if (prizeData && prizeData.prizeName.trim() !== "") {
    const lastPrize = await prisma.prize.findFirst({
      where: { eventId },
      orderBy: { order: "desc" },
    });
    const nextOrder = lastPrize ? lastPrize.order + 1 : 1;

    const result = await prisma.$transaction(async (tx) => {
      const newSponsor = await tx.sponsor.create({
        data: { name: name.trim(), logoUrl, contribution, eventId },
      });
      await tx.prize.create({
        data: {
          eventId,
          name: prizeData.roundName.trim() || `Rodada ${name.trim()}`,
          prizeName: prizeData.prizeName.trim(),
          type: prizeData.type,
          order: nextOrder,
        },
      });
      return newSponsor;
    });

    revalidatePath(`/${event.tenant.subdomain}/dashboard/${eventId}`);
    return result;
  }

  // Fluxo sem prêmio
  const sponsor = await prisma.sponsor.create({
    data: { name: name.trim(), logoUrl, contribution, eventId },
  });

  revalidatePath(`/${event.tenant.subdomain}/dashboard/${eventId}`);
  return sponsor;
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITAR PATROCINADOR
// ─────────────────────────────────────────────────────────────────────────────
export async function updateSponsor(
  sponsorId: string,
  name: string,
  contribution: number = 0,
  logoUrl?: string
) {
  const tenantId = await requireTenant();

  const sponsor = await prisma.sponsor.findFirst({
    where: { id: sponsorId, event: { tenantId } },
    include: { event: { select: { id: true, tenant: { select: { subdomain: true } } } } },
  });
  if (!sponsor) throw new Error("Patrocinador não encontrado ou acesso negado.");

  const updated = await prisma.sponsor.update({
    where: { id: sponsorId },
    data: {
      name: name.trim(),
      contribution,
      ...(logoUrl !== undefined && { logoUrl }),
    },
  });

  revalidatePath(`/${sponsor.event.tenant.subdomain}/dashboard/${sponsor.event.id}`);
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER PATROCINADOR
// ─────────────────────────────────────────────────────────────────────────────
export async function removeSponsor(sponsorId: string) {
  const tenantId = await requireTenant();

  const sponsor = await prisma.sponsor.findFirst({
    where: { id: sponsorId, event: { tenantId } },
    include: { event: { select: { id: true, tenant: { select: { subdomain: true } } } } },
  });
  if (!sponsor) throw new Error("Patrocinador não encontrado ou acesso negado.");

  await prisma.sponsor.delete({ where: { id: sponsorId } });

  revalidatePath(`/${sponsor.event.tenant.subdomain}/dashboard/${sponsor.event.id}`);
  return { success: true };
}
