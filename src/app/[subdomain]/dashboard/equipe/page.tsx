// src/app/[subdomain]/dashboard/equipe/page.tsx
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import GlobalStaffClient from "./GlobalStaffClient";
import { Users } from "lucide-react";

export default async function GlobalEquipePage() {
  const tenantId = await requireTenant();

  // 1. Busca todos os eventos da ONG
  const events = await prisma.event.findMany({
    where: { tenantId },
    select: { id: true, name: true, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // 2. Busca todos os voluntários desta ONG, e em quais eventos eles estão
  const users = await prisma.user.findMany({
    where: { tenantId, role: "STAFF" },
    include: {
      // 🔥 CORRIGIDO: O nome correto da relação no seu schema.prisma
      staffAssignments: {
        select: {
          eventId: true,
          canSell: true,
          canOperate: true,
          canVerify: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // 3. Mapeia o resultado do Prisma para o formato exato que a UI precisa
  const staffMembers = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    // 🔥 CORRIGIDO: Lendo de staffAssignments
    events: u.staffAssignments.map((es) => ({
      eventId: es.eventId,
      canSell: es.canSell,
      canOperate: es.canOperate,
      canVerify: es.canVerify,
    }))
  }));

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 p-8 font-sans pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-900/30 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Users size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Central de Voluntários</h1>
            <p className="text-slate-400 mt-1">Gerencie sua equipe e aloque-os rapidamente em qualquer evento.</p>
          </div>
        </div>

        <GlobalStaffClient staffMembers={staffMembers} events={events} tenantId={tenantId} />
      </div>
    </div>
  );
}