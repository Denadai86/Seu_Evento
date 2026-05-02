"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireTenantAccess() {
  const session = await auth();

  if (!session || !session.user?.tenantId) {
    throw new Error("Não autorizado");
  }

  return session.user.tenantId;
}

// ✅ CREATE
export async function addSponsor(
  eventId: string,
  name: string,
  logoUrl?: string
) {
  const tenantId = await requireTenantAccess();

  // 🔒 garante que o evento pertence ao tenant
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenantId,
    },
  });

  if (!event) {
    throw new Error("Evento não encontrado");
  }

  const sponsor = await prisma.sponsor.create({
    data: {
      name: name.trim(),
      logoUrl,
      eventId,
    },
  });

  revalidatePath(`/dashboard/${eventId}`);

  return sponsor;
}

// ✅ DELETE
export async function removeSponsor(sponsorId: string) {
  const tenantId = await requireTenantAccess();

  const sponsor = await prisma.sponsor.findFirst({
    where: {
      id: sponsorId,
      event: {
        tenantId,
      },
    },
  });

  if (!sponsor) {
    throw new Error("Sponsor não encontrado");
  }

  await prisma.sponsor.delete({
    where: { id: sponsorId },
  });

  revalidatePath(`/dashboard/${sponsor.eventId}`);

  return { success: true };
}