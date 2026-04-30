// src/app//hub/page.tsx


export default function HubHomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      <div className="text-center">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4">
          AÇÃO LEVE <span className="text-emerald-500">HUB</span>
        </h1>
        <p className="text-lg text-slate-400 font-medium mb-10 max-w-md mx-auto">
          O motor central de micro-SaaS para a gestão de bingos, eventos e experiências.
        </p>
        
        <a 
          href="/admin" 
          className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-105"
        >
          ACESSAR PAINEL MESTRE
        </a>
      </div>
    </div>
  );
}