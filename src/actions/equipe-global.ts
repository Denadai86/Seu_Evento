// src/actions/equipe-global.ts

"use server";

import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/requireTenant"; // Importação crucial

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR STAFF (VENDEDOR/VOLUNTÁRIO)
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ MUDANÇA DE ASSINATURA: tenantId removido dos parâmetros!
export async function createTenantStaff(name: string) {
  try {
    // 🛡️ SEGURANÇA: O tenantId vem do servidor. Ninguém consegue forjar.
    const tenantId = await requireTenant();

    const baseUsername = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${baseUsername}${randomSuffix}`;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await hash(pin, 12);

    await prisma.user.create({
      data: {
        name: name.trim(),
        username: username.toUpperCase(),
        password: hashedPin,
        role: "STAFF",
        tenantId: tenantId, // Vinculação garantida ao tenant correto
      },
    });

    revalidatePath("/dashboard/equipe");
    return { success: true, username: username.toUpperCase(), pin };
  } catch (error: any) {
    console.error("[CREATE_STAFF_ERROR]", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VINCULAR/DESVINCULAR STAFF DE UM EVENTO ESPECÍFICO
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ MUDANÇA DE ASSINATURA: tenantId removido dos parâmetros!
export async function toggleStaffInEvent(
  userId: string,
  eventId: string,
  isAssigned: boolean,
  permissions: { canSell: boolean; canOperate: boolean; canVerify: boolean }
) {
  try {
    const tenantId = await requireTenant();

    // 🛡️ SEGURANÇA DUPLA: Temos que garantir que tanto o Evento quanto o Usuário pertencem à ONG logada
    const [eventExists, userExists] = await Promise.all([
      prisma.event.findFirst({ where: { id: eventId, tenantId } }),
      prisma.user.findFirst({ where: { id: userId, tenantId } })
    ]);

    if (!eventExists) throw new Error("Evento não encontrado ou acesso negado.");
    if (!userExists) throw new Error("Usuário não encontrado ou não pertence à sua equipe.");

    if (!isAssigned) {
      await prisma.eventStaff.deleteMany({
        where: { userId, eventId }, // Já validamos a posse acima, então isso é seguro
      });
    } else {
      // Como você mencionou que pode não haver unique constraint, mantive a sua lógica,
      // mas agora ela opera sob o guarda-chuva de segurança do servidor.
      const updated = await prisma.eventStaff.updateMany({
        where: { userId, eventId },
        data: {
          canSell: permissions.canSell,
          canOperate: permissions.canOperate,
          canVerify: permissions.canVerify,
        },
      });

      if (updated.count === 0) {
        await prisma.eventStaff.create({
          data: {
            userId,
            eventId,
            canSell: permissions.canSell,
            canOperate: permissions.canOperate,
            canVerify: permissions.canVerify,
          },
        });
      }
    }

    revalidatePath("/dashboard/equipe");
    return { success: true };
  } catch (error: any) {
    console.error("[TOGGLE_STAFF_ERROR]", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESETAR PIN DE UM MEMBRO DA EQUIPE
// ─────────────────────────────────────────────────────────────────────────────
export async function resetGlobalStaffPin(userId: string) {
  try {
    const tenantId = await requireTenant();

    // 🛡️ SEGURANÇA: Impede que o Admin da ONG 'A' resete a senha do usuário da ONG 'B'
    const userToReset = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });

    if (!userToReset) {
      throw new Error("Acesso negado. O usuário não pertence à sua organização.");
    }

    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await hash(newPin, 12);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPin },
    });

    return { success: true, newPin, username: user.username };
  } catch (error: any) {
    console.error("[RESET_PIN_ERROR]", error);
    return { success: false, error: error.message };
  }
}