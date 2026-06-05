// src/app/[subdomain]/dashboard/[eventId]/tesouraria/page.tsx
import prisma from "@/lib/prisma";
import TreasuryClient from "@/features/tesouraria/components/TreasuryClient";
import { requireTenant } from "@/lib/requireTenant";

export default async function TesourariaPage({ 
  params 
}: { 
  params: Promise<{ subdomain: string; eventId: string }> 
}) {
  const { eventId } = await params;
  const tenantId = await requireTenant();

  // Validação de segurança + tenant
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
  });

  if (!event) {
    return <div className="p-10 text-red-400">Evento não encontrado ou sem acesso.</div>;
  }

  const eventStaff = await prisma.eventStaff.findMany({
    where: { eventId },
    include: {
      user: { select: { name: true, username: true } },
      cards: {
        select: { 
          id: true,
          shortId: true, 
          isSold: true, 
          isPaid: true,
          price: true 
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white">Tesouraria</h1>
          <p className="text-slate-400">Distribuição, devolução e controle de cartelas</p>
        </div>
        <div className="text-sm text-emerald-400 font-mono">
          {event.name}
        </div>
      </div>

      <TreasuryClient 
        eventId={eventId} 
        initialStaff={eventStaff}   // ← renomeado de initialSellers
      />
    </div>
  );
}
