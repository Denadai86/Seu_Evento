"use server";

import { PrismaClient } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- 1. GESTÃO DE SAAS (HUB / ADMIN) ---

export async function createOrganization(name: string, slug: string) {
  const user = await currentUser();
  if (!user) throw new Error("Não autenticado");

  return await prisma.organization.create({
    data: {
      name,
      slug: slug.toLowerCase(),
      // A MÁGICA ESTÁ AQUI: connectOrCreate resolve o erro de ID duplicado!
      users: { 
        connectOrCreate: {
          where: { id: user.id },
          create: { 
            id: user.id, 
            email: user.emailAddresses[0].emailAddress, 
            role: "ORG_ADMIN" 
          }
        } 
      }
    }
  });
}

export async function getAllOrganizations() {
  return await prisma.organization.findMany();
}

export async function updateOrgLogo(organizationId: string, logoUrl: string) {
  return await prisma.organization.update({
    where: { id: organizationId },
    data: {
      logoUrl: logoUrl
    }
  });
}

// --- 2. MOTOR DO BINGO (O que faz seu sistema funcionar) ---

export async function getActiveEvent(orgId?: string) {
  // Se orgId for passado, filtra por ele. Senão, pega o primeiro.
  const where = orgId ? { organizationId: orgId } : {};
  return await prisma.event.findFirst({
    where,
    include: { organization: true, sponsors: true }
  });
}

export async function checkCard(shortId: string) {
  const idFormatted = shortId.trim().toUpperCase();
  const card = await prisma.card.findFirst({
    where: { shortId: idFormatted },
    include: { event: { include: { organization: true } } }
  });
  return card ? { success: true, card } : { success: false, message: "Cartela não encontrada." };
}

export async function drawNumberToDB(eventId: string, number: number) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.drawnNumbers.includes(number)) return { success: false };
  
  const newDrawnNumbers = [...event.drawnNumbers, number];
  await prisma.event.update({ where: { id: eventId }, data: { drawnNumbers: newDrawnNumbers } });
  return { success: true, drawnNumbers: newDrawnNumbers };
}

export async function generateBatchCards(eventId: string, quantity: number) {
  await prisma.card.deleteMany({ where: { eventId } });
  const cardsToCreate = [];
  
  for (let i = 0; i < quantity; i++) {
    cardsToCreate.push({
      eventId,
      shortId: generateRandomId(4),
      matrix: {
        B: generateColumn(1, 15, 5), I: generateColumn(16, 30, 5), 
        N: generateColumn(31, 45, 5), G: generateColumn(46, 60, 5), O: generateColumn(61, 75, 5)
      },
      isSold: true
    });
  }
  await prisma.card.createMany({ data: cardsToCreate });
  
  // A MÁGICA AQUI: Retornamos o shortId da primeira cartela do array (ou undefined se a quantidade for 0)
  return { 
    success: true, 
    sampleId: cardsToCreate.length > 0 ? cardsToCreate[0].shortId : null 
  };
}

//export async function resetEvent(eventId: string) {
  //await prisma.event.update({ where: { id: eventId }, data: { drawnNumbers: [] } });
  //return { success: true };
//}

export async function getGameThermometer(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { cards: { where: { isSold: true } } }
  });
  if (!event) return { success: false };
  // Lógica simplificada de ranking
  const stats = event.cards.map(c => ({ shortId: c.shortId, totalHits: 0 }));
  return { success: true, rankings: { topFull: stats.slice(0, 3) } };
}

// Helpers
function generateRandomId(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function generateColumn(min: number, max: number, count: number) {
  const nums = new Set<number>();
  while (nums.size < count) nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
  return Array.from(nums);
}

// src/app/actions.ts
// ... (mantenha o que já tem e adicione esta):

export async function deleteOrganization(id: string) {
  return await prisma.organization.delete({
    where: { id }
  });
}

// Adicione no final do seu src/app/actions.ts

export async function createEvent(organizationId: string, name: string) {
  const newEvent = await prisma.event.create({
    data: {
      name: name,
      organizationId: organizationId,
      status: "DRAFT", // DRAFT = Rascunho (ainda não começou)
    }
  });
  return newEvent;
}

// Adicione no final do src/app/actions.ts
export async function getEventCards(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { 
      cards: true,
      sponsors: true 
    }
  });
  return event;
}


// --- 3. PATROCINADORES (A Mina de Ouro) ---

// src/app/actions.ts

export async function addSponsor(eventId: string, name: string, logoUrl?: string) {
  return await prisma.sponsor.create({
    data: { 
      name: name, 
      eventId: eventId,
      logoUrl: logoUrl // Agora salvamos o link da imagem
    }
  });
}

export async function removeSponsor(sponsorId: string) {
  return await prisma.sponsor.delete({
    where: { id: sponsorId }
  });
}

// Adicione ao final do src/app/actions.ts

export async function drawNumber(eventId: string, number: number) {
  return await prisma.event.update({
    where: { id: eventId },
    data: {
      drawnNumbers: {
        push: number // Adiciona o número ao array de sorteados
      },
      status: "ACTIVE"
    }
  });
}

export async function resetEvent(eventId: string) {
  return await prisma.event.update({
    where: { id: eventId },
    data: {
      drawnNumbers: [],
      status: "DRAFT"
    }
  });
}

import { cookies } from "next/headers";

// 1. Criar Locutor (Usado pelo ADM da Paróquia)
export async function createOperator(orgId: string, username: string, pass: string) {
  return await prisma.operator.create({
    data: { organizationId: orgId, username: username.toLowerCase(), password: pass }
  });
}

// 2. Deletar Locutor
export async function deleteOperator(id: string) {
  return await prisma.operator.delete({ where: { id } });
}

// 3. Login do Locutor (Gera um Cookie de 24h)
export async function loginOperator(subdomain: string, username: string, pass: string) {
  const org = await prisma.organization.findUnique({ where: { slug: subdomain } });
  if (!org) return { success: false, message: "Organização não encontrada" };

  const op = await prisma.operator.findFirst({
    where: { organizationId: org.id, username: username.toLowerCase(), password: pass }
  });

  if (op) {
    const cookieStore = await cookies();
    cookieStore.set(`auth_${subdomain}`, op.id, { maxAge: 60 * 60 * 24 }); // 24 horas
    return { success: true };
  }
  return { success: false, message: "Usuário ou senha inválidos" };
}


