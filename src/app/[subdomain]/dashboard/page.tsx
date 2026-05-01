//src/app/[subdomain]/dashboard/page.tsx

import { prisma } from "../../../lib/prisma";
import { redirect } from "next/navigation";
import EventList from "./EventList"; 
import OperatorManager from "./OperatorManager";

export default async function TenantDashboardPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug: subdomain },
    include: { 
      events: {
        orderBy: { createdAt: 'desc' } // Boa prática: eventos mais novos primeiro
      },
      operators: true,
    } 
  });

  if (!org) {
    redirect("/");
  }

  return (
    <div className="p-10 font-sans max-w-6xl mx-auto">
      
      {/* HEADER PROFISSIONAL COM LOGO DINÂMICA */}
      <header className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800">{org.name}</h1>
          <p className="text-slate-500 font-mono text-sm mt-1">{org.slug}.acaoleve.com</p>
        </div>
        
        {/* Renderiza a logo do Cloudinary ou a primeira letra da Paróquia */}
        {org.logoUrl ? (
          <img 
            src={org.logoUrl.replace('/upload/', '/upload/c_pad,w_150,h_150/')} 
            alt={`Logo ${org.name}`} 
            className="h-16 w-16 object-contain rounded-xl border border-slate-200 shadow-sm bg-white p-1" 
          />
        ) : (
          <div className="h-16 w-16 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center text-2xl font-black text-slate-400 shadow-inner">
            {org.name.charAt(0)}
          </div>
        )}
      </header>

      {/* GRID DE DASHBOARD (Separação de Contextos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ÁREA PRINCIPAL (Core do SaaS: Eventos) */}
        <main className="lg:col-span-2">
          <EventList orgId={org.id} initialEvents={org.events} />
        </main>

        {/* BARRA LATERAL (Gestão e Configurações) */}
        <aside className="flex flex-col gap-6">
          <OperatorManager 
            orgId={org.id} 
            initialOperators={org.operators} 
          />
          
          {/* Espaço reservado para futuros módulos (ex: Financeiro, Relatórios) */}
        </aside>

      </div>
    </div>
  );
}