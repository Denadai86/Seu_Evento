// src/app/[subdomain]/dashboard/page.tsx

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import EventList from "./EventList";
import OperatorManager from "./OperatorManager";

export default async function TenantDashboardPage({
  params,
}: {
  params: { subdomain: string };
}) {
  const { subdomain } = params;

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

  // 🎯 separação de papéis (base do SaaS multi-role)
  const operators = tenant.users.filter((u) => u.role === "OPERATOR");

  // 📊 métricas rápidas (cara de produto pago)
  const metrics = {
    totalEvents: tenant.events.length,
    activeEvents: tenant.events.filter((e) => e.status === "ACTIVE").length,
    totalOperators: operators.length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-10 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800">
            {tenant.name}
          </h1>
          <p className="text-slate-500 text-sm font-mono mt-1">
            {tenant.subdomain}.acaoleve.com
          </p>
        </div>

        {tenant.logoUrl ? (
          <img
            src={tenant.logoUrl.replace(
              "/upload/",
              "/upload/c_pad,w_150,h_150/"
            )}
            alt={`Logo ${tenant.name}`}
            className="h-14 w-14 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          />
        ) : (
          <div className="h-14 w-14 bg-slate-100 rounded-xl border flex items-center justify-center text-xl font-black text-slate-400">
            {tenant.name.charAt(0)}
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-10 py-10">

        {/* 📊 METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          <MetricCard
            label="Eventos"
            value={metrics.totalEvents}
          />

          <MetricCard
            label="Eventos Ativos"
            value={metrics.activeEvents}
          />

          <MetricCard
            label="Locutores"
            value={metrics.totalOperators}
          />
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* EVENTOS */}
          <main className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <EventList initialEvents={tenant.events} />
          </main>

          {/* SIDEBAR */}
          <aside className="flex flex-col gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <OperatorManager
                initialOperators={operators}
              />
            </div>

            {/* 🔮 FUTURO (plugável) */}
            <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
              Módulos futuros<br />
              Financeiro • Relatórios • Analytics
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * 🧩 COMPONENTE INTERNO (padrão enterprise)
 * Reutilizável pra métricas
 */
function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}