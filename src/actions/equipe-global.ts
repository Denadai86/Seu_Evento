// src/actions/equipe-global.ts
"use server";

import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

// Recebe o tenantId de forma segura do Client
export async function createTenantStaff(tenantId: string, name: string) {
  try {
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

export async function toggleStaffInEvent(
  tenantId: string,
  userId: string,
  eventId: string,
  isAssigned: boolean,
  permissions: { canSell: boolean; canOperate: boolean; canVerify: boolean }
) {
  try {
    if (!isAssigned) {
      await prisma.eventStaff.deleteMany({
        where: { userId, eventId, event: { tenantId } },
      });
    } else {
      // Prisma upsert requires a unique identifier in `where`. If there's no
      // unique constraint on (userId, eventId) we updateMany and create when
      // no record was updated.
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
    return { success: false, error: error.message };
  }
}

export async function resetGlobalStaffPin(userId: string) {
  try {
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