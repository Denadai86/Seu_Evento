// src/app/[subdomain]/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function TenantHomePage({ params }: PageProps) {
  const { subdomain } = await params;

  // Busca o cliente real no banco de dados
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain }
  });

  // Se o subdomínio não existir no banco, dá erro 404
  if (!tenant) notFound();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      
      <h1 className="text-4xl font-black text-slate-900 mb-2">{tenant.name}</h1>
      <p className="text-slate-500 mb-8 max-w-md">Bem-vindo ao portal oficial de eventos da organização.</p>
      
      <Link 
        href="/entrar"
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg shadow-emerald-500/30"
      >
        Acessar Painel do Evento
      </Link>
    </div>
  );
}