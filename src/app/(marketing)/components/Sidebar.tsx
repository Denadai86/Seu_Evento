"use client";

import { useState } from "react";
import { ArrowRight, Ticket, ShieldCheck, Scale, Sparkles } from "lucide-react";

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
    <aside className="w-full md:w-80 bg-slate-950 text-slate-300 md:fixed md:inset-y-0 md:left-0 flex flex-col border-r border-slate-900 shadow-2xl z-50">
      
      {/* LOGO E TÍTULO */}
      <div className="p-8 pb-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Ticket size={24} className="transform -rotate-45" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight leading-tight uppercase">
            Seu Evento <br/><span className="text-emerald-500 text-sm">by Ação Leve</span>
          </h1>
        </div>
      </div>

      {/* PORTAL DE ACESSO (O antigo Login/Senha do wireframe) */}
      <div className="p-8 border-b border-slate-800/50 bg-slate-900/20">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
          <ShieldCheck size={14} /> Portal do Cliente
        </h2>
        <form onSubmit={handleAccess} className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase mb-1 block">Nome do seu ambiente</label>
            <input 
              type="text" 
              required
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="ex: saojose" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold p-3 rounded-lg text-sm transition-all flex items-center justify-between group">
            Acessar Sistema
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </button>
        </form>
      </div>

      {/* NAVEGAÇÃO E CALL TO ACTION */}
      <div className="p-8 flex-1 flex flex-col gap-2">
        <a href="#features" className="text-sm font-medium hover:text-white transition-colors py-2">Recursos do Sistema</a>
        <a href="#planos" className="text-sm font-medium hover:text-white transition-colors py-2">Planos e Preços</a>
        <a href="#depoimentos" className="text-sm font-medium hover:text-white transition-colors py-2">Depoimentos</a>
        
        <div className="mt-8 pt-8 border-t border-slate-800/50">
          <a href="#planos" className="w-full block text-center bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 uppercase text-sm">
            Contratar Agora
          </a>
        </div>
      </div>

      {/* FOOTER DA SIDEBAR (Legal) */}
      <div className="p-8 text-xs font-medium flex flex-col gap-3 border-t border-slate-800/50">
        <div className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
          <Scale size={14} /> <a href="#">Termos de Uso</a>
        </div>
        <div className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
          <ShieldCheck size={14} /> <a href="#">Política de Privacidade</a>
        </div>
        <div className="mt-4 text-slate-600 flex items-center gap-2">
          <Sparkles size={12} className="text-emerald-700" />
          Ação Leve Hub © 2026
        </div>
      </div>
    </aside>
  );
}