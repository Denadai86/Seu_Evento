import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seu Evento | Gestão de Bingos e Sorteios Profissionais",
  description: "Plataforma completa para Paróquias, ONGs e Empresas. Crie cartelas, gerencie vendas e tenha um telão interativo incrível.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-emerald-500 selection:text-white">
      {/* 
        A barra lateral ficará no topo em celulares (flex-col) 
        e fixa na esquerda em computadores (w-80 fixed) 
      */}
      {children}
    </div>
  );
}