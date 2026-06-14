// src/actions/equipe.ts
"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/requireTenant";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdminRole() {
  const session = await auth();
  if (session?.user?.role !== "ORG_ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Apenas administradores podem gerenciar a equipe.");
  }
}

function generateUsername(fullName: string): string {
  const parts = fullName.trim().toUpperCase().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 8);
  return `${parts[0].substring(0, 3)}${parts[parts.length - 1].substring(0, 5)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CRIAR MEMBRO E ALOCAR NO EVENTO DIRETO (Fluxo Rápido)
// ─────────────────────────────────────────────────────────────────────────────
export async function createAndAssignStaff(
  eventId: string,
  name: string,
  permissions: { canSell: boolean; canOperate: boolean; canVerify: boolean }
) {
  const tenantId = await requireTenant();
  await requireAdminRole();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) throw new Error("Evento inválido ou acesso negado.");

  let baseUsername = generateUsername(name);
  let finalUsername = baseUsername;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
    finalUsername = `${baseUsername}${counter}`;
    counter++;
  }

  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedPin = await bcrypt.hash(pin, 10);

 const result = await prisma.$transaction(async (tx) => {
  const newUser = await tx.user.create({
    data: {
      name: name.trim(),
      username: finalUsername,
      password: hashedPin,
      role: "STAFF",
      tenantId,
    },
  });

  await tx.eventStaff.create({
    data: {
      eventId,
      userId: newUser.id,
      canSell: permissions.canSell ?? true,
      canOperate: permissions.canOperate ?? false,
      canVerify: permissions.canVerify ?? false,
    },
  });

  return { 
    username: finalUsername, 
    pin 
  };
});

  revalidatePath(`/${tenant.subdomain}/dashboard/${eventId}`, "page");
  return { success: true, ...result };
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. ALTERAR PERMISSÕES DURANTE O EVENTO
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleStaffCapability(
  eventStaffId: string,
  capability: "canSell" | "canOperate" | "canVerify",
  newValue: boolean
) {
  const tenantId = await requireTenant();
  await requireAdminRole();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const staff = await prisma.eventStaff.findFirst({
    where: { id: eventStaffId, event: { tenantId } },
  });

  if (!staff) throw new Error("Acesso negado.");

  await prisma.eventStaff.update({
    where: { id: eventStaffId },
    data: { [capability]: newValue },
  });

  revalidatePath(`/${tenant.subdomain}/dashboard/${staff.eventId}`, "page");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ESTOQUE: ENTREGAR CARTELAS PARA O VOLUNTÁRIO (Ex-assignCardsToSeller)
// ─────────────────────────────────────────────────────────────────────────────
export async function assignCardsToStaff(eventId: string, eventStaffId: string, quantity: number) {
  const tenantId = await requireTenant();
  await requireAdminRole();

  const availableCards = await prisma.card.findMany({
    where: { eventId, eventStaffId: null, event: { tenantId } },
    take: quantity,
    select: { id: true },
  });

  if (availableCards.length < quantity) {
    return { success: false, error: `Há apenas ${availableCards.length} cartelas livres no estoque.` };
  }

  const cardIds = availableCards.map((c) => c.id);

  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { eventStaffId },
  });

  revalidatePath("/");
  return { success: true, count: cardIds.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ESTOQUE: DEVOLVER CARTELAS NÃO VENDIDAS
// ─────────────────────────────────────────────────────────────────────────────
export async function returnCardsFromStaff(eventStaffId: string, quantity: number) {
  const tenantId = await requireTenant();
  await requireAdminRole();

  const returnable = await prisma.card.findMany({
    where: { eventStaffId, isPaid: false, event: { tenantId } },
    take: quantity,
    select: { id: true },
  });

  if (returnable.length < quantity) {
    return { success: false, error: "Quantidade inválida para devolução." };
  }

  const cardIds = returnable.map((c) => c.id);
  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { eventStaffId: null },
  });

  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REMOVER DA ESCALA DO EVENTO
// ─────────────────────────────────────────────────────────────────────────────
export async function removeStaffFromEvent(eventStaffId: string) {
  const tenantId = await requireTenant();
  await requireAdminRole();

  const paidCount = await prisma.card.count({ where: { eventStaffId, isPaid: true } });
  if (paidCount > 0) {
    return { success: false, error: "Vínculos financeiros existem. Não pode ser removido da escala." };
  }

  await prisma.card.updateMany({
    where: { eventStaffId },
    data: { eventStaffId: null },
  });

  await prisma.eventStaff.delete({ where: { id: eventStaffId } });
  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. RESETAR SENHA (PIN) DO MEMBRO DA EQUIPE
// ─────────────────────────────────────────────────────────────────────────────
export async function resetStaffPassword(userId: string) {
  const tenantId = await requireTenant();
  await requireAdminRole();

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { username: true, name: true },
  });

  if (!user) {
    return { success: false, error: "Usuário não encontrado ou sem permissão." };
  }

  const newPin = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedPin = await bcrypt.hash(newPin, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPin },
  });

  return { 
    success: true, 
    username: user.username,
    name: user.name,
    newPin 
  };
}