// src/actions/sponsor.ts
"use server";

import  prisma  from "@/lib/prisma"; // Ajustado para pegar a instância global do seu projeto
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

async function requireTenantAccess() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Não autorizado");
  return session.user.tenantId;
}

// ✅ UPLOAD PARA VERCEL BLOB (Novo)
export async function uploadSponsorLogo(formData: FormData) {
  const tenantId = await requireTenantAccess(); // Segurança: Apenas logados
  
  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo enviado.");

  // Validação de segurança
  if (file.size > 2 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 2MB.");
  if (!file.type.startsWith("image/")) throw new Error("Apenas imagens são permitidas.");

  // Faz o upload para o Blob organizando por pastas: sponsors/tenantId/timestamp-nomearquivo
  const blob = await put(`sponsors/${tenantId}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return blob.url; // Retorna a URL pública gerada
}

// ✅ CREATE (Mantido o seu código)
// ✅ CREATE (Agora suporta criação atômica de Prêmio/Rodada)
export async function addSponsor(
  eventId: string,
  name: string,
  contribution: number = 0,
  logoUrl?: string,
  prizeData?: { roundName: string; prizeName: string; type: "QUINA" | "FULL_HOUSE" } // Novo parâmetro
) {
  const tenantId = await requireTenantAccess();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true, tenant: { select: { subdomain: true } } }
  });

  if (!event) throw new Error("Evento não encontrado");

  // SE O PATROCINADOR DOOU PRENDA, CRIA OS DOIS JUNTOS
  if (prizeData && prizeData.prizeName.trim() !== "") {
    // 1. Descobre qual a próxima ordem da rodada
    const lastPrize = await prisma.prize.findFirst({
      where: { eventId },
      orderBy: { order: 'desc' }
    });
    const nextOrder = lastPrize ? lastPrize.order + 1 : 1;

    // 2. Transação atômica (Ou salva os dois, ou não salva nenhum)
    const result = await prisma.$transaction(async (tx) => {
      const newSponsor = await tx.sponsor.create({
        data: { name: name.trim(), logoUrl, contribution, eventId }
      });

      await tx.prize.create({
        data: {
          eventId,
          name: prizeData.roundName.trim() || `Rodada ${name}`, // Ex: Rodada Quitanda
          prizeName: prizeData.prizeName.trim(),                // Ex: Saco de Laranja
          type: prizeData.type,
          order: nextOrder
        }
      });

      return newSponsor;
    });

    revalidatePath(`/${event.tenant.subdomain}/dashboard/${eventId}`);
    return result;
  }

  // FLUXO NORMAL (Sem prêmio)
  const sponsor = await prisma.sponsor.create({
    data: { name: name.trim(), logoUrl, contribution, eventId },
  });

  revalidatePath(`/${event.tenant.subdomain}/dashboard/${eventId}`);
  return sponsor;
}

// ✅ UPDATE (Mantido o seu código)
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
      // Só atualiza a logo se uma nova URL for enviada
      ...(logoUrl !== undefined && { logoUrl }),
    },
  });

  revalidatePath(`/${sponsor.event.tenant.subdomain}/dashboard/${sponsor.event.id}`);
  return updated;
}

// ✅ DELETE (Mantido o seu código)
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