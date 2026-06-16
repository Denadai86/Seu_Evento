// src/app/[subdomain]/dashboard/[eventId]/tesouraria/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import TesourariaClient from "./TesourariaClient";

export default async function TesourariaPage({ 
  params 
}: { 
  params: Promise<{ subdomain: string; eventId: string }> 
}) {
  const { subdomain, eventId } = await params;

  // 1. Resolve o tenant pela URL (Blindado contra bug do Super Admin)
  const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
  if (!tenant) return notFound();

  // 2. Busca o Evento e a Equipe (somente quem tem permissão canSell)
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
  });

  if (!event) return notFound();

  // 3. Busca a equipe escalada com suas cartelas
  const eventStaff = await prisma.eventStaff.findMany({
    where: { eventId, canSell: true },
    include: {
      user: { select: { name: true, username: true } },
      cards: {
        select: { id: true, shortId: true, isPaid: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // 4. KPI de Fábrica (Cartelas sem dono neste evento)
  const availableCardsCount = await prisma.card.count({
    where: { eventId, eventStaffId: null }
  });

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-20">
      <header className="sticky top-0 z-50 bg-[#0b0f14]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link 
            href={`/dashboard/${eventId}`}
            className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="w-10 h-10 bg-emerald-900/40 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Tesouraria & Estoque</h1>
            <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest">{event.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* Passando os dados para o Client Component mesclado */}
        <TesourariaClient 
          eventId={eventId} 
          initialStaff={eventStaff} 
          availableCardsCount={availableCardsCount} 
        />
      </main>
    </div>
  );
}