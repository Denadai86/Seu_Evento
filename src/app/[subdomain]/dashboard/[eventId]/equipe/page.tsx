// src/app/[subdomain]/dashboard/[eventId]/equipe/page.tsx
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import StaffClient from "./StaffClient";
import { notFound } from "next/navigation";

export default async function EquipePage({
  params,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
}) {
  const { eventId } = await params;
  const tenantId = await requireTenant();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { name: true, isActive: true },
  });

  if (!event) return notFound();

  const staffList = await prisma.eventStaff.findMany({
    where: { eventId },
    include: {
      user: {
        select: { id: true, name: true, username: true },
      },
      cards: {
        select: { isPaid: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const formattedStaff = staffList.map((staff) => ({
    id: staff.id,
    userId: staff.userId,
    name: staff.user.name ?? "Sem Nome",
    username: staff.user.username ?? "",
    canSell: staff.canSell,
    canOperate: staff.canOperate,
    canVerify: staff.canVerify,
    cardsTotal: staff.cards.length,
    cardsSold: staff.cards.filter((c) => c.isPaid).length,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Gestão da Equipe</h1>
        <p className="text-slate-400">
          Evento: <span className="font-bold text-emerald-400">{event.name}</span>
        </p>
      </div>

      <StaffClient 
        eventId={eventId} 
        initialStaff={formattedStaff} 
        isEventActive={event.isActive}
      />
    </div>
  );
}