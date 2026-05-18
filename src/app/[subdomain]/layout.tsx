// src/app/[subdomain]/layout.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}

export default async function SubdomainLayout({ children, params }: Props) {
  const { subdomain } = await params;

  // 🔍 Puxa os dados reais de licença do inquilino
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    select: { active: true, expiresAt: true, name: true }
  });

  // Se o subdomínio digitado não existir no banco de dados, joga erro 404 graciosamente
  if (!tenant) notFound();

  // 🧠 Validação matemática do contrato: hoje passou da data de expiração?
  const isExpired = tenant.expiresAt && new Date() > new Date(tenant.expiresAt);

  // 🛑 Se o cliente foi suspenso manualmente OU o contrato expirou de vez
  if (!tenant.active || isExpired) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex flex-col items-center justify-center text-center p-6 font-sans">
        <div className="bg-[#111827] border border-red-500/20 p-8 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
            <ShieldAlert size={36} />
          </div>
          
          <h1 className="text-2xl font-black text-white mb-2">Acesso Indisponível</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            {isExpired 
              ? `O período contratado para a licença do "${tenant.name}" (incluindo a semana adicional para auditoria de relatórios) foi encerrado.` 
              : `O ambiente do "${tenant.name}" encontra-se temporariamente suspenso pela administração comercial.`}
          </p>

          <div className="w-full h-px bg-slate-800 my-2" />
          
          <p className="text-xs text-slate-500 mt-4">
            Para reativação, renovação de plano ou dúvidas sobre dados financeiros, entre em contato com o suporte da plataforma.
          </p>
        </div>
      </div>
    );
  }

  // Se a licença estiver 100% regularizada, deixa o cliente passar para as páginas internas
  return <>{children}</>;
}