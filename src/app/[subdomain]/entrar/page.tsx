// src/app/[subdomain]/entrar/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import TenantLoginForm from "./TenantLoginForm";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function TenantLoginPage({ params }: PageProps) {
  const { subdomain } = await params;

  // Segurança Adicional: Verifica se o cliente (Tenant) realmente existe no banco de dados
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain }
  });

  // Se o subdomínio for falso/inexistente, redireciona para a página 404 e mata o processo
  if (!tenant) {
    notFound(); 
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900">{tenant.name}</h2>
          <p className="text-slate-500 text-sm mt-2">Acesso Restrito: Área do organizador e locutores</p>
        </div>

        {/* Renderiza o formulário do Client Component */}
        <TenantLoginForm />

      </div>
    </div>
  );
}