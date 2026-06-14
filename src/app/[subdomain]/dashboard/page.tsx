// src/app/[subdomain]/dashboard/page.tsx
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import EventList from "./EventList";
import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";
import { Calendar, Users, Activity, Plus } from "lucide-react";
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
          <LogoutButton/>
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-900/20"
              >
                <Plus size={20} /> Novo Evento
              </Link>
            </div>
            <EventList initialEvents={tenant.events} />
          </div>

          {/* Sidebar - Ações Rápidas */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* NOVO: Link Global de RH (Aparece sempre!) */}
            <div className="bg-gradient-to-br from-[#111827] to-[#0d131a] border border-blue-900/50 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-blue-500/10 blur-[50px] rounded-full transition-transform group-hover:scale-150"></div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-blue-900/30 text-blue-400 rounded-xl border border-blue-500/20">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Equipe Global</h3>
                  <p className="text-slate-400 text-xs mt-1">Gerencie os voluntários da ONG.</p>
                </div>
              </div>
              <Link
                href="/dashboard/equipe"
                className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] relative z-10"
              >
                Central de RH
              </Link>
            </div>

            {/* Painel do Evento Ativo */}
            {activeEvent ? (
              <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="uppercase text-xs font-bold tracking-widest text-emerald-400">Evento em Andamento</span>
                </div>
                <h3 className="text-xl font-black text-white mb-1">{activeEvent.name}</h3>
                <p className="text-slate-400 text-sm mb-6">Controle operacional e financeiro do dia.</p>
                
                <div className="space-y-3">
                  <Link
                    href={`/dashboard/${activeEvent.id}/tesouraria`}
                    className="block w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4 rounded-xl text-center transition-all border border-white/5"
                  >
                    Tesouraria PDV
                  </Link>

                  {/* Botão de Fechamento */}
                  <div className="pt-2">
                    <CloseEventButton eventId={activeEvent.id} eventName={activeEvent.name} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                <Activity className="text-slate-600 mb-4" size={40} />
                <p className="text-slate-500 font-bold">Nenhum evento ativo.</p>
                <p className="text-slate-600 text-sm mt-1">Inicie um evento para liberar o PDV e a Tesouraria.</p>
              </div>
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