// src/app/[subdomain]/dashboard/page.tsx
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import EventList from "./EventList";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
import { Calendar, Users, Activity, UserCheck, ArrowRight, Plus, XCircle } from "lucide-react";
import { closeEventAndGenerateReport } from "@/actions/closeEvent";
import CloseEventButton from "./CloseEventButton";

export default async function TenantDashboardPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        include: { staff: true },
      },
      users: {
        where: { role: "STAFF" },
        select: { id: true },
      },
    },
  });

  if (!tenant) redirect("/");

  const totalEvents = tenant.events.length;
  const activeEvents = tenant.events.filter(e => e.status === "ACTIVE").length;
  const totalStaff = tenant.users.length;

  const activeEvent = tenant.events.find(e => e.status === "ACTIVE");

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0b0f14]/95 backdrop-blur-lg border-b border-emerald-900/30 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-black text-xl">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{tenant.name}</h1>
              <p className="text-emerald-500/70 text-sm font-mono -mt-1">{subdomain}</p>
            </div>
          </div>
          <LogoutButton callbackUrl="/entrar" variant="dark" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        {/* KPIs - Mais modernos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <KpiCard 
            icon={<Calendar className="w-8 h-8" />} 
            label="Total de Eventos" 
            value={totalEvents} 
            color="emerald" 
          />
          <KpiCard 
            icon={<Activity className="w-8 h-8" />} 
            label="Eventos Ativos" 
            value={activeEvents} 
            color="amber" 
          />
          <KpiCard 
            icon={<Users className="w-8 h-8" />} 
            label="Voluntários" 
            value={totalStaff} 
            color="blue" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Lista de Eventos - Principal */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">Meus Eventos</h2>
              <Link 
                href="/dashboard/novo-evento" 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl transition-all"
              >
                <Plus size={20} /> Novo Evento
              </Link>
            </div>
            <EventList initialEvents={tenant.events} />
          </div>

          {/* Sidebar - Ações Rápidas */}
          <div className="lg:col-span-4 space-y-6">
            {/* Evento Ativo */}
            {activeEvent && (
              <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="uppercase text-xs font-bold tracking-widest text-emerald-400">Evento em Andamento</span>
                </div>
                <h3 className="text-xl font-black text-white mb-1">{activeEvent.name}</h3>
                
                <div className="flex gap-3 mt-6">
                  <Link
                    href={`/${subdomain}/dashboard/${activeEvent.id}/equipe`}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-3.5 rounded-2xl text-center transition-all"
                  >
                    Equipe
                  </Link>
                  <Link
                    href={`/${subdomain}/dashboard/${activeEvent.id}/tesouraria`}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-3.5 rounded-2xl text-center transition-all"
                  >
                    Tesouraria
                  </Link>
                </div>

                {/* Botão de Fechamento */}
                <CloseEventButton eventId={activeEvent.id} eventName={activeEvent.name} />
              </div>
            )}

            {/* Gestão de Equipe */}
            <div className="bg-[#111827] border border-blue-900/30 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <UserCheck className="text-blue-400" size={28} />
                <h3 className="text-xl font-black">Escala da Equipe</h3>
              </div>
              {activeEvent ? (
                <Link
                  href={`/${subdomain}/dashboard/${activeEvent.id}/equipe`}
                  className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl text-center transition-all"
                >
                  Gerenciar Equipe
                </Link>
              ) : (
                <p className="text-slate-400 text-sm">Ative um evento para gerenciar a equipe.</p>
              )}
            </div>

            {/* Tesouraria Rápida */}
            {activeEvent && (
              <Link
                href={`/${subdomain}/dashboard/${activeEvent.id}/tesouraria`}
                className="block bg-slate-800 hover:bg-slate-700 border border-slate-700 p-8 rounded-3xl transition-all group"
              >
                <div className="font-bold text-xl mb-2 group-hover:text-emerald-400">Tesouraria</div>
                <p className="text-slate-400">Controle de lotes e devoluções</p>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente KPI
function KpiCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: 'emerald' | 'amber' | 'blue' 
}) {
  const colorMap = {
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-950/30",
    amber:   "text-amber-400 border-amber-500/20 bg-amber-950/30",
    blue:    "text-blue-400 border-blue-500/20 bg-blue-950/30",
  } as const;

  return (
    <div className={`border ${colorMap[color]} p-8 rounded-3xl flex items-center gap-6 transition-all hover:scale-[1.02]`}>
      <div className="text-5xl opacity-80">{icon}</div>
      <div>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-5xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}