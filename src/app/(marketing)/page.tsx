//src/app/(marketing)/page.tsx

import Sidebar from "./components/Sidebar";
import { CheckCircle2, MonitorPlay, TicketPercent, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      <Sidebar />
      
      {/* 
        A margem md:ml-80 empurra o conteúdo para a direita no Desktop, 
        dando espaço para a Sidebar fixa. 
      */}
      <main className="flex-1 md:ml-80">
        
        {/* HERO SECTION (A Primeira Impressão) */}
        <section className="relative pt-24 pb-32 px-8 lg:px-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/40 via-slate-50 to-slate-50 -z-10"></div>
          
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1] mb-6">
              Transforme seus <span className="text-emerald-600">Sorteios e Bingos</span> em Shows.
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
              Diga adeus ao papel, às planilhas confusas e às bolinhas perdidas. O <b>Seu Evento</b> é o motor digital que paróquias, ONGs e empresas usam para criar experiências profissionais e lucrativas.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#planos" className="bg-slate-900 text-white font-bold text-lg px-8 py-4 rounded-xl text-center hover:bg-slate-800 transition-all shadow-xl">
                Ver Planos e Preços
              </a>
              <a href="#video-demo" className="bg-white text-slate-900 border-2 border-slate-200 font-bold text-lg px-8 py-4 rounded-xl text-center hover:border-slate-300 transition-all">
                Assistir Demonstração
              </a>
            </div>
          </div>
        </section>

        {/* FEATURES (As Firulas e SEO Forte) */}
        <section id="features" className="py-24 px-8 lg:px-16 bg-white border-y border-slate-100">
          <div className="max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900 mb-12">Por que o Seu Evento é diferente?</h2>
            
            <div className="grid md:grid-cols-3 gap-10">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <MonitorPlay size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Telão Interativo</h3>
                <p className="text-slate-600 leading-relaxed">
                  Projete um painel profissional no seu evento. As bolas sorteadas aparecem em tempo real, com animações e alertas automáticos de BINGO.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                  <TicketPercent size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Cartelas Inteligentes</h3>
                <p className="text-slate-600 leading-relaxed">
                  Gere milhares de cartelas únicas em segundos. Seus jogadores podem acompanhar pelo celular via QRCode ou impresso no papel.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Painel do Locutor</h3>
                <p className="text-slate-600 leading-relaxed">
                  Um acesso isolado e super simples para o locutor focar apenas em sortear as bolas e animar a festa, sem risco de apagar dados financeiros.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PLANOS E PREÇOS (Monetização) */}
        <section id="planos" className="py-24 px-8 lg:px-16 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-slate-900 mb-4">Escolha seu Plano</h2>
              <p className="text-lg text-slate-600">Simples, transparente e desenhado para maximizar a arrecadação do seu evento.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              
              {/* PLANO SINGLE */}
              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm relative hover:shadow-xl transition-all">
                <h3 className="text-xl font-bold text-slate-800">Evento Único</h3>
                <p className="text-slate-500 text-sm mt-2 mb-6">Ideal para eventos esporádicos e festas beneficentes pontuais.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black text-slate-900">R$ 250</span>
                  <span className="text-slate-500"> /evento</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="text-emerald-500" size={20} /> Cartelas Ilimitadas</li>
                  <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="text-emerald-500" size={20} /> Telão Interativo</li>
                  <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="text-emerald-500" size={20} /> Acesso de Locutor</li>
                  <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="text-emerald-500" size={20} /> Suporte via WhatsApp</li>
                </ul>
                <button className="w-full py-4 rounded-xl border-2 border-emerald-600 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors">
                  Contratar Evento Único
                </button>
              </div>

              {/* PLANO ANUAL */}
              <div className="bg-emerald-950 p-10 rounded-3xl border border-emerald-800 shadow-2xl relative transform md:-translate-y-4">
                <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-1 rounded-full uppercase tracking-wider">
                  Mais Popular
                </div>
                <h3 className="text-xl font-bold text-white">Licença Anual</h3>
                <p className="text-emerald-200/60 text-sm mt-2 mb-6">Para paróquias e organizadores com calendário ativo.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black text-white">R$ 890</span>
                  <span className="text-emerald-400"> /ano</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-emerald-100"><CheckCircle2 className="text-emerald-500" size={20} /> Tudo do plano Evento Único</li>
                  <li className="flex items-center gap-3 text-emerald-100"><CheckCircle2 className="text-emerald-500" size={20} /> Eventos Ilimitados no ano</li>
                  <li className="flex items-center gap-3 text-emerald-100"><CheckCircle2 className="text-emerald-500" size={20} /> Cadastro de Patrocinadores</li>
                  <li className="flex items-center gap-3 text-emerald-100"><CheckCircle2 className="text-emerald-500" size={20} /> Relatórios Financeiros</li>
                </ul>
                <button className="w-full py-4 rounded-xl bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                  Contratar Plano Anual
                </button>
              </div>

            </div>
          </div>
        </section>

      </main>
    </>
  );
}