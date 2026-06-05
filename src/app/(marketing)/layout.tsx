///src/app/(marketing)/layout.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seu Evento | Gestão de Bingos e Sorteios Profissionais",
  description: "Plataforma completa para Paróquias, ONGs e Empresas. Crie cartelas, gerencie vendas e tenha um telão interativo incrível.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#091510]">
      {children}
    </div>
  );
}