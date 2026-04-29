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
      users: { create: { id: user.id, email: user.emailAddresses[0].emailAddress, role: "ORG_ADMIN" } }
    }
  });
}

export async function getAllOrganizations() {
  return await prisma.organization.findMany();
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
  return { success: true };
}

export async function resetEvent(eventId: string) {
  await prisma.event.update({ where: { id: eventId }, data: { drawnNumbers: [] } });
  return { success: true };
}

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