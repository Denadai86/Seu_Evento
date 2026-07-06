// src/app/[subdomain]/vendas/page.tsx
import prisma from "@/lib/prisma";
import PDVClient from "./PDVClient";
import StaffNav from "@/components/staff/StaffNav";

export default async function VendasPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  const activeEvent = await prisma.event.findFirst({
    where: {
      tenant: { subdomain },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      ticketPrice: true,
      pixKey: true,
      staff: {
        where: { canSell: true },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex flex-col items-center justify-center text-white p-6 text-center pb-20">
        <h1 className="text-2xl font-black mb-2">Nenhum Evento Ativo</h1>
        <p className="text-slate-400 text-sm">
          Peça para o administrador iniciar o evento no painel principal.
        </p>
        <StaffNav />
      </div>
    );
  }

  const eventData = {
    ...activeEvent,
    ticketPrice: activeEvent.ticketPrice || 2500,
    pixKey: activeEvent.pixKey || "",
    sellers: activeEvent.staff.map((s) => ({
      id: s.id,
      name: s.user.name || "Vendedor",
      userId: s.userId,
    })),
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans flex flex-col">
      {/* HEADER — compacto, sem logout (está no StaffNav) */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
        <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500">
          Caixa Rápido
        </p>
        <p className="text-sm font-bold text-white truncate leading-tight">
          {activeEvent.name}
        </p>
      </header>

      <main className="flex-1 flex flex-col pb-16">
        {/* pb-16 = altura do StaffNav */}
        <PDVClient activeEvent={eventData} />
      </main>

      <StaffNav eventId={activeEvent.id} />
    </div>
  );
}
