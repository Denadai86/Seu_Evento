"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireTenantAccess() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Não autorizado");
  return session.user.tenantId;
}

// ✅ CREATE
export async function addSponsor(
  eventId: string,
  name: string,
  contribution: number = 0,
  logoUrl?: string
) {
  const tenantId = await requireTenantAccess();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true, tenant: { select: { subdomain: true } } }
  });

  if (!event) throw new Error("Evento não encontrado");

  const sponsor = await prisma.sponsor.create({
    data: {
      name: name.trim(),
      logoUrl,
      contribution,
      eventId,
    },
  });

  revalidatePath(`/${event.tenant.subdomain}/dashboard/${eventId}`);
  return sponsor;
}

// ✅ UPDATE
export async function updateSponsor(
  sponsorId: string,
  name: string,
  contribution: number = 0,
  logoUrl?: string
) {
  const tenantId = await requireTenantAccess();

  const sponsor = await prisma.sponsor.findFirst({
    where: { 
      id: sponsorId,
      event: { tenantId }
    },
    include: {
      event: {
        select: { 
          id: true,
          tenant: { select: { subdomain: true } }
        }
      }
    }
  });

  if (!sponsor) throw new Error("Patrocinador não encontrado");

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

// ✅ DELETE
export async function removeSponsor(sponsorId: string) {
  const tenantId = await requireTenantAccess();

  const sponsor = await prisma.sponsor.findFirst({
    where: { 
      id: sponsorId,
      event: { tenantId }
    },
    include: {
      event: {
        select: { 
          id: true,
          tenant: { select: { subdomain: true } }
        }
      }
    }
  });

  if (!sponsor) throw new Error("Patrocinador não encontrado");

  await prisma.sponsor.delete({ where: { id: sponsorId } });

  revalidatePath(`/${sponsor.event.tenant.subdomain}/dashboard/${sponsor.event.id}`);
  
  return { success: true };
}
