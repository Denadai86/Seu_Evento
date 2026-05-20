"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, Ticket, ShieldCheck, Scale, 
  Sparkles, LayoutGrid, Tag, MessageSquare 
} from "lucide-react";

export default function Sidebar() {
  const [subdomain, setSubdomain] = useState("");

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain) return;
    
    // Limpa o input (remove espaços, caracteres especiais, deixa minúsculo)
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
    
    // Roteamento inteligente baseado no ambiente
    const rootDomain = process.env.NODE_ENV === "production" ? "acaoleve.com" : "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    
    window.location.href = `${protocol}://${cleanSubdomain}.${rootDomain}/entrar`;
  };

  return (
    <aside className="w-full md:w-80 bg-[#0b0f14] text-slate-300 md:fixed md:inset-y-0 md:left-0 flex flex-col border-r border-slate-800/60 shadow-2xl z-50">
      
      {/* 🌟 LOGO E TÍTULO PREMIUM */}
      <div className="p-8 pb-6 border-b border-slate-800/50 bg-gradient-to-b from-slate-900/50 to-transparent">
        <Link href="/" className="flex items-center gap-3 mb-2 group cursor-pointer">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-300 group-hover:scale-105">
            <Ticket size={24} className="transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-tight uppercase">
              Seu Evento
            </h1>
            <span className="text-emerald-500/80 text-[11px] font-bold tracking-widest uppercase">
              By Ação Leve
            </span>
          </div>
        </Link>
      </div>

      {/* 🔐 PORTAL DE ACESSO (Modernizado) */}
      <div className="p-8 border-b border-slate-800/50 bg-slate-900/30">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500/70" /> Portal do Cliente
        </h2>
        
        <form onSubmit={handleAccess} className="space-y-4">
          <div className="group">
            <label className="text-[10px] text-slate-400 uppercase mb-1.5 block font-medium group-focus-within:text-emerald-400 transition-colors">
              Nome do seu ambiente
            </label>
            <input 
              type="text" 
              required
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="ex: saojose" 
              className="w-full bg-[#0b0f14] border border-slate-800 rounded-xl p-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-700 shadow-inner"
            />
          </div>
          
          <button className="w-full bg-slate-800/80 hover:bg-slate-700 text-white font-bold p-3.5 rounded-xl text-sm transition-all flex items-center justify-between group border border-slate-700 hover:border-slate-600 shadow-sm">
            Acessar Sistema
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </button>
        </form>
      </div>

      {/* 🧭 NAVEGAÇÃO E CALL TO ACTION (Com Ícones) */}
      <div className="p-6 flex-1 flex flex-col gap-1">
        <a href="/#features" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all group">
          <LayoutGrid size={18} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
          Recursos do Sistema
        </a>
        <a href="/#planos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all group">
          <Tag size={18} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
          Planos e Preços
        </a>
        <a href="/#depoimentos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all group">
          <MessageSquare size={18} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
          Depoimentos
        </a>
        
        <div className="mt-8 pt-8 border-t border-slate-800/50 px-2">
          <a href="/#planos" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-0.5 uppercase text-sm tracking-wide">
            Contratar Agora <Sparkles size={16} />
          </a>
        </div>
      </div>

      {/* ⚖️ FOOTER DA SIDEBAR (Bug resolvido via <Link>) */}
      <div className="p-8 text-xs font-medium flex flex-col gap-4 border-t border-slate-800/50 bg-slate-900/10">
        <Link href="/termos" className="flex items-center gap-2 text-slate-500 hover:text-emerald-400 transition-colors w-fit">
          <Scale size={14} /> Termos de Uso
        </Link>
        
        <Link href="/privacidade" className="flex items-center gap-2 text-slate-500 hover:text-emerald-400 transition-colors w-fit">
          <ShieldCheck size={14} /> Política de Privacidade
        </Link>
        
        <div className="mt-4 pt-4 border-t border-slate-800/50 text-slate-600 flex items-center gap-2">
          <Sparkles size={12} className="text-emerald-700" />
          Ação Leve Hub © {new Date().getFullYear()}
        </div>
      </div>
      
    </aside>
  );
}