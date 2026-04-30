"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { hash, compare } from "bcryptjs";
import { createSession } from "../lib/session"; // Certifique-se de que criamos este arquivo no Passo 3 anterior

// --- SETUP DO PRISMA (Evita conexões duplicadas no modo Dev) ---
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


// ============================================================================
// BLOCO 1: HUB MESTRE (Gestão do SaaS e Inquilinos)
// ============================================================================

export async function getAllOrganizations() {
  return await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createOrganization(name: string, slug: string, clientEmail: string) {
  // 1. Gera uma senha temporária leve (ex: bingo123!)
  const tempPassword = Math.random().toString(36).slice(-6) + "!";
  
  // 2. Criptografa a senha para salvar no banco (NUNCA salvamos senha em texto puro)
  const hashedPassword = await hash(tempPassword, 10);

  try {
    // 3. Salva a Organização e já cria o Usuário Dono (Admin) atrelado a ela
    const org = await prisma.organization.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        users: { 
          create: { 
            email: clientEmail.toLowerCase().trim(),
            password: hashedPassword,
            role: "ORG_ADMIN" 
          } 
        }
      }
    });

    // 4. Retorna os dados para a tela Mestre
    return { 
      success: true, 
      org, 
      credentials: { 
        email: clientEmail, 
        password: tempPassword, 
        loginUrl: `http://${slug}.localhost:3000/entrar`
      } 
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error("Este e-mail ou subdomínio já estão em uso.");
    }
    throw new Error("Erro interno ao criar o ambiente do cliente.");
  }
}

export async function deleteOrganization(id: string) {
  return await prisma.organization.delete({
    where: { id }
  });
}

export async function updateOrgLogo(organizationId: string, logoUrl: string) {
  return await prisma.organization.update({
    where: { id: organizationId },
    data: { logoUrl }
  });
}


// ============================================================================
// BLOCO 2: AUTENTICAÇÃO UNIFICADA (Nossa Substituição do Clerk)
// ============================================================================

export async function loginTenantAdmin(subdomain: string, email: string, pass: string) {
  // 1. Procura o usuário que pertence a este subdomínio específico
  const user = await prisma.user.findFirst({
    where: { 
      email: email.toLowerCase().trim(),
      organization: { slug: subdomain }
    }
  });

  if (!user) return { success: false, message: "Acesso negado. E-mail ou subdomínio incorretos." };

  // 2. Verifica se a senha bate com a criptografia do banco
  const isValidPassword = await compare(pass, user.password);
  if (!isValidPassword) return { success: false, message: "Senha incorreta." };

  // 3. Gera o Cookie de segurança (JWT)
  await createSession(user.id, subdomain, user.role);
  
  return { success: true };
}


// ============================================================================
// BLOCO 3: GESTÃO DE OPERADORES (Locutores)
// ============================================================================

export async function createOperator(orgId: string, username: string, pass: string) {
  return await prisma.operator.create({
    data: { 
      organizationId: orgId, 
      username: username.toLowerCase(), 
      password: pass // Como é acesso restrito temporário, mantemos simples
    }
  });
}

export async function deleteOperator(id: string) {
  return await prisma.operator.delete({ where: { id } });
}

export async function loginOperator(subdomain: string, username: string, pass: string) {
  const org = await prisma.organization.findUnique({ where: { slug: subdomain } });
  if (!org) return { success: false, message: "Organização não encontrada" };

  const op = await prisma.operator.findFirst({
    where: { organizationId: org.id, username: username.toLowerCase(), password: pass }
  });

  if (op) {
    const cookieStore = await cookies();
    cookieStore.set(`auth_${subdomain}`, op.id, { maxAge: 60 * 60 * 24 }); // Cookie simples de 24h
    return { success: true };
  }
  return { success: false, message: "Usuário ou senha inválidos" };
}


// ============================================================================
// BLOCO 4: MOTOR DO BINGO (A Regra de Negócio)
// ============================================================================

export async function createEvent(organizationId: string, name: string) {
  return await prisma.event.create({
    data: {
      name: name,
      organizationId: organizationId,
      status: "DRAFT", 
    }
  });
}

export async function getActiveEvent(orgId?: string) {
  const where = orgId ? { organizationId: orgId } : {};
  return await prisma.event.findFirst({
    where,
    include: { organization: true, sponsors: true }
  });
}

export async function getEventCards(eventId: string) {
  return await prisma.event.findUnique({
    where: { id: eventId },
    include: { cards: true, sponsors: true }
  });
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
  
  return { 
    success: true, 
    sampleId: cardsToCreate.length > 0 ? cardsToCreate[0].shortId : null 
  };
}

export async function drawNumber(eventId: string, number: number) {
  // Atualiza o evento empurrando o novo número para a array e ativando o status
  return await prisma.event.update({
    where: { id: eventId },
    data: {
      drawnNumbers: { push: number },
      status: "ACTIVE"
    }
  });
}

export async function drawNumberToDB(eventId: string, number: number) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.drawnNumbers.includes(number)) return { success: false };
  
  const newDrawnNumbers = [...event.drawnNumbers, number];
  await prisma.event.update({ where: { id: eventId }, data: { drawnNumbers: newDrawnNumbers } });
  return { success: true, drawnNumbers: newDrawnNumbers };
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

export async function checkCard(shortId: string) {
  const idFormatted = shortId.trim().toUpperCase();
  const card = await prisma.card.findFirst({
    where: { shortId: idFormatted },
    include: { event: { include: { organization: true } } }
  });
  return card ? { success: true, card } : { success: false, message: "Cartela não encontrada." };
}

export async function getGameThermometer(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { cards: { where: { isSold: true } } }
  });
  if (!event) return { success: false };
  
  const stats = event.cards.map(c => ({ shortId: c.shortId, totalHits: 0 }));
  return { success: true, rankings: { topFull: stats.slice(0, 3) } };
}

// === Helpers Privados do Bingo ===
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


// ============================================================================
// BLOCO 5: PATROCINADORES (Monetização Extra)
// ============================================================================

export async function addSponsor(eventId: string, name: string, logoUrl?: string) {
  return await prisma.sponsor.create({
    data: { 
      name: name, 
      eventId: eventId,
      logoUrl: logoUrl 
    }
  });
}

export async function removeSponsor(sponsorId: string) {
  return await prisma.sponsor.delete({
    where: { id: sponsorId }
  });
}