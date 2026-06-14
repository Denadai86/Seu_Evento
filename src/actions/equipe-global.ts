// src/actions/equipe-global.ts
"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

// 1. Cria o Voluntário na ONG (Tenant)
export async function createTenantStaff(name: string) {
  try {
    const tenantId = await requireTenant();
    
    // Gera credenciais únicas e amigáveis
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
        tenantId,
      },
    });

    revalidatePath("/dashboard/equipe");
    return { success: true, username: username.toUpperCase(), pin };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Associa/Desassocia e Atualiza Permissões em um Evento Específico
export async function toggleStaffInEvent(
  userId: string,
  eventId: string,
  isAssigned: boolean,
  permissions: { canSell: boolean; canOperate: boolean; canVerify: boolean }
) {
  try {
    const tenantId = await requireTenant();

    if (!isAssigned) {
      // Remove do evento
      await prisma.eventStaff.deleteMany({
        where: { userId, eventId, event: { tenantId } },
      });
    } else {
      // Adiciona ou Atualiza no evento
      // Prisma upsert requires a unique where; if no compound unique exists, emulate upsert
      const updated = await prisma.eventStaff.updateMany({
        where: { userId, eventId, event: { tenantId } },
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
    return { success: false, error: error.message };
  }
}

// 3. Resetar PIN (Nível Global)
export async function resetGlobalStaffPin(userId: string) {
  try {
    await requireTenant();
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await hash(newPin, 12);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPin },
    });

    return { success: true, newPin, username: user.username };
  } catch (error: any) {
    return { success: false, error: "Falha ao resetar PIN." };
  }
}