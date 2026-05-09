// src/app/[subdomain]/dashboard/page.tsx

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import EventList from "./EventList";
import OperatorManager from "./OperatorManager";
import LogoutButton from "@/components/LogoutButton";
import { Calendar, Users, Activity, Settings, LayoutDashboard } from "lucide-react";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function TenantDashboardPage({ params }: PageProps) {
  const { subdomain } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      events: {
        orderBy: { createdAt: "desc" },
      },
      users: true,
    },
  });

  if (!tenant) redirect("/");

  const operators = tenant.users.filter((u) => u.role === "OPERATOR");

  const metrics = {
    totalEvents: tenant.events.length,
    activeEvents: tenant.events.filter((e) => e.status === "ACTIVE").length,
    totalOperators: operators.length,
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-20">
      
      {/* 🚀 HEADER PREMIUM */}
      <header className="sticky top-0 z-50 bg-[#0b0f14]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">{tenant.name}</h1>
            <p className="text-emerald-500/70 text-sm font-bold uppercase tracking-widest mt-1">
              {tenant.subdomain}.acaoleve.com
            </p>
          </div>

          <div className="flex items-center gap-6">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl.replace("/upload/", "/upload/c_pad,w_150,h_150/")}
                alt={`Logo ${tenant.name}`}
                className="h-12 w-12 object-contain rounded-xl border border-emerald-900/50 bg-black/50 p-1 shadow-sm"
              />
            ) : (
              <div className="h-12 w-12 bg-emerald-900/40 rounded-xl border border-emerald-500/20 flex items-center justify-center text-xl font-black text-emerald-400">
                {tenant.name.charAt(0)}
              </div>
            )}
            
            <div className="h-6 w-px bg-slate-800"></div>
            <LogoutButton callbackUrl="/entrar" variant="dark" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">

        {/* 📊 ESTATÍSTICAS RÁPIDAS (Top Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-[#111827] border border-emerald-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/40 text-emerald-400 flex items-center justify-center">
              <Calendar size={32} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Eventos Criados</p>
              <p className="text-4xl font-black text-white">{metrics.totalEvents}</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-emerald-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-900/40 text-amber-400 flex items-center justify-center">
              <Activity size={32} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Eventos Ativos</p>
              <p className="text-4xl font-black text-white">{metrics.activeEvents}</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-emerald-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-900/40 text-blue-400 flex items-center justify-center">
              <Users size={32} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Locutores da Equipe</p>
              <p className="text-4xl font-black text-white">{metrics.totalOperators}</p>
            </div>
          </div>

        </div>

        {/* 🧩 BENTO GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* MÓDULO 1: MEUS EVENTOS (Ocupa 2 colunas) */}
          <div className="lg:col-span-2 bg-[#111827] border border-emerald-900/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Efeito de brilho de fundo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <LayoutDashboard className="text-emerald-400" size={28} />
              <h2 className="text-2xl font-black text-white">Gestão de Eventos</h2>
            </div>

            <div className="relative z-10">
              {/* O componente EventList vai ser renderizado aqui */}
              <EventList initialEvents={tenant.events} />
            </div>
          </div>

          {/* SIDEBAR: EQUIPE E FUTURO */}
          <div className="flex flex-col gap-6">
            
            {/* MÓDULO 2: LOCUTORES / EQUIPE */}
            <div className="bg-gradient-to-br from-[#111827] to-[#0d131a] border border-blue-900/30 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Users className="text-blue-400" size={24} />
                <h2 className="text-xl font-black text-white">Equipe</h2>
              </div>
              
              {/* O componente OperatorManager vai ser renderizado aqui */}
              <OperatorManager initialOperators={operators} />
            </div>

            {/* 🔮 MÓDULO 3: FUTURO (plugável) */}
            <div className="bg-[#111827]/50 p-8 rounded-3xl border border-dashed border-slate-700 text-center flex flex-col items-center justify-center gap-4">
              <Settings className="text-slate-500" size={32} />
              <div>
                <h3 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-1">Módulos Futuros</h3>
                <p className="text-slate-600 text-xs">Financeiro • Relatórios • Analytics B2B</p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}