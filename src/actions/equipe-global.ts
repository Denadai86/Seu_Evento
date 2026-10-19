// src/actions/equipe-global.ts

"use server";

import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireOrgAdmin } from "@/lib/requireTenant"; // Importação crucial
import { secureInt } from "@/lib/random";
import { logAudit } from "@/lib/audit";

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR STAFF (VENDEDOR/VOLUNTÁRIO)
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ MUDANÇA DE ASSINATURA: tenantId removido dos parâmetros!
export async function createTenantStaff(name: string) {
  try {
    // 🛡️ SEGURANÇA: O tenantId vem do servidor. Ninguém consegue forjar.
    const tenantId = await requireOrgAdmin();

    const baseUsername = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const randomSuffix = secureInt(1000, 9999);
    const username = `${baseUsername}${randomSuffix}`;
    const pin = secureInt(100000, 999999).toString();
    const hashedPin = await hash(pin, 12);

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        username: username.toUpperCase(),
        password: hashedPin,
        role: "STAFF",
        tenantId: tenantId, // Vinculação garantida ao tenant correto
      },
    });

    revalidatePath("/dashboard/equipe");
    return { success: true, username: username.toUpperCase(), pin, userId: created.id };
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
  permissions: { canSell: boolean; canOperate: boolean; canVerify: boolean; canTreasury?: boolean; canAudit?: boolean }
) {
  try {
    const tenantId = await requireOrgAdmin();

    // 🛡️ SEGURANÇA DUPLA: Temos que garantir que tanto o Evento quanto o Usuário pertencem à ONG logada
    const [eventExists, userExists] = await Promise.all([
      prisma.event.findFirst({ where: { id: eventId, tenantId } }),
      prisma.user.findFirst({ where: { id: userId, tenantId } })
    ]);

    if (!eventExists) throw new Error("Evento não encontrado ou acesso negado.");
    if (!userExists) throw new Error("Usuário não encontrado ou não pertence à sua equipe.");

    const flags = (p: { canSell?: boolean; canOperate?: boolean; canVerify?: boolean; canTreasury?: boolean; canAudit?: boolean } | null | undefined) => ({
      canSell: !!p?.canSell, canOperate: !!p?.canOperate, canVerify: !!p?.canVerify, canTreasury: !!p?.canTreasury, canAudit: !!p?.canAudit,
    });
    // Estado ANTES: o log mostra exatamente o que mudou (quem ganhou ou perdeu qual permissão).
    const beforeRow = await prisma.eventStaff.findFirst({
      where: { userId, eventId },
      select: { canSell: true, canOperate: true, canVerify: true, canTreasury: true, canAudit: true },
    });

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
          canTreasury: !!permissions.canTreasury,
          canAudit: !!permissions.canAudit,
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
            canTreasury: !!permissions.canTreasury,
            canAudit: !!permissions.canAudit,
          },
        });
      }
    }

    await logAudit({
      tenantId,
      action: "STAFF_PERMISSIONS_CHANGED",
      eventId,
      metadata: {
        targetUserId: userId,
        targetName: userExists.name,
        targetUsername: userExists.username,
        assigned: isAssigned,
        before: beforeRow ? flags(beforeRow) : null,
        after: isAssigned ? flags(permissions) : null,
      },
    });

    revalidatePath("/dashboard/equipe");
    revalidatePath(`/dashboard/${eventId}/equipe`);
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
    const tenantId = await requireOrgAdmin();

    // 🛡️ SEGURANÇA: Impede que o Admin da ONG 'A' resete a senha do usuário da ONG 'B'
    const userToReset = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });

    if (!userToReset) {
      throw new Error("Acesso negado. O usuário não pertence à sua organização.");
    }

    const newPin = secureInt(100000, 999999).toString();
    const hashedPin = await hash(newPin, 12);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPin },
    });

    // Redefinir o PIN dá acesso à conta da pessoa: é um dos pontos mais sensíveis para fraude interna.
    // Registra em CADA evento em que ela trabalha, para aparecer na auditoria de cada um.
    const staffedEvents = await prisma.eventStaff.findMany({ where: { userId }, select: { eventId: true } });
    const targets = staffedEvents.length > 0 ? staffedEvents.map((e) => e.eventId) : [undefined];
    for (const evId of targets) {
      await logAudit({
        tenantId,
        action: "PIN_RESET",
        eventId: evId,
        metadata: { targetUserId: userId, targetName: userToReset.name, targetUsername: userToReset.username },
      });
    }

    return { success: true, newPin, username: user.username };
  } catch (error: any) {
    console.error("[RESET_PIN_ERROR]", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COPIAR A EQUIPE DE OUTRO EVENTO
// Traz as pessoas (com as mesmas permissões) que ainda NÃO estão no evento de destino. Quem já está lá
// não é alterado. Cada pessoa trazida fica registrada na auditoria, como se fosse uma escalação normal.
// ─────────────────────────────────────────────────────────────────────────────
export async function copyEventTeam(fromEventId: string, toEventId: string) {
  try {
    const tenantId = await requireOrgAdmin();
    if (fromEventId === toEventId) throw new Error("Escolha um evento diferente para copiar.");

    const [from, to] = await Promise.all([
      prisma.event.findFirst({ where: { id: fromEventId, tenantId }, select: { id: true, name: true } }),
      prisma.event.findFirst({ where: { id: toEventId, tenantId }, select: { id: true } }),
    ]);
    if (!from || !to) throw new Error("Evento não encontrado ou acesso negado.");

    const [source, existing] = await Promise.all([
      prisma.eventStaff.findMany({
        where: { eventId: fromEventId, user: { tenantId } },
        select: {
          userId: true, canSell: true, canOperate: true, canVerify: true, canTreasury: true, canAudit: true,
          user: { select: { name: true, username: true } },
        },
      }),
      prisma.eventStaff.findMany({ where: { eventId: toEventId }, select: { userId: true } }),
    ]);

    const already = new Set(existing.map((e) => e.userId));
    const seen = new Set<string>();
    const toAdd = source.filter((s) => {
      if (already.has(s.userId) || seen.has(s.userId)) return false;
      seen.add(s.userId);
      return true;
    });

    if (toAdd.length > 0) {
      await prisma.eventStaff.createMany({
        data: toAdd.map((s) => ({
          userId: s.userId,
          eventId: toEventId,
          canSell: s.canSell,
          canOperate: s.canOperate,
          canVerify: s.canVerify,
          canTreasury: s.canTreasury,
          canAudit: s.canAudit,
        })),
      });

      for (const s of toAdd) {
        await logAudit({
          tenantId,
          action: "STAFF_PERMISSIONS_CHANGED",
          eventId: toEventId,
          metadata: {
            targetUserId: s.userId,
            targetName: s.user.name,
            targetUsername: s.user.username,
            assigned: true,
            before: null,
            after: { canSell: s.canSell, canOperate: s.canOperate, canVerify: s.canVerify, canTreasury: s.canTreasury, canAudit: s.canAudit },
            copiedFrom: from.name,
          },
        });
      }
    }

    revalidatePath("/dashboard/equipe");
    revalidatePath(`/dashboard/${toEventId}/equipe`);
    return { success: true, added: toAdd.length, skipped: source.length - toAdd.length };
  } catch (error: any) {
    console.error("[COPY_EVENT_TEAM_ERROR]", error);
    return { success: false, error: error.message as string };
  }
}
