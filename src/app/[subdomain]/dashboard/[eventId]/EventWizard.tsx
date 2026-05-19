// src/app/[subdomain]/dashboard/[eventId]/EventWizard.tsx
"use client";

import { useState } from "react";
import { CheckCircle2, ChevronRight, Ticket, Trophy, Printer, Rocket, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";

import TicketPriceEditor from "./TicketPriceEditor";
import SponsorManager from "./SponsorManager";
import PrizeManager from "./PrizeManager";
import GenerateCardsButton from "./GenerateCardsButton";

interface EventWizardProps {
  event: any;
  prizes: any[];
  sponsors: any[];
}

export default function EventWizard({ event, prizes, sponsors }: EventWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Validação: Só deixa avançar do passo 3 se houver pelo menos um prêmio cadastrado
  const hasPrizes = prizes && prizes.length > 0;
  
  const handleNextStep = () => {
    router.refresh();
    setStep((s) => s + 1);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative mb-8">
      
      {/* HEADER DO WIZARD */}
      <div className="bg-gradient-to-r from-blue-900/20 to-slate-900 p-8 border-b border-slate-800">
        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
          <Rocket className="text-blue-500 animate-pulse" /> Configuração do Bingo
        </h2>
        <p className="text-slate-400 text-sm">Siga os 4 passos sequenciais para preparar as vendas do seu pátio.</p>
        
        {/* BARRA DE PROGRESSO INDICADORA */}
        <div className="flex items-center gap-2 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-300 ${step >= i ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-slate-800 text-slate-500"}`}>
                {step > i ? <CheckCircle2 size={16} /> : i}
              </div>
              {i < 4 && (
                <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step > i ? "bg-blue-600" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO MUTÁVEL */}
      <div className="p-8">
        
        {/* PASSO 1: VALOR DA CARTELA */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400"><Ticket size={24} /></div>
              <div>
                <h3 className="text-xl font-bold text-white">Passo 1: Valor da Cartela</h3>
                <p className="text-sm text-slate-400">Clique no botão verde abaixo para definir o preço padrão de cada bilhete.</p>
              </div>
            </div>
            
            <div className="bg-black/20 p-6 rounded-2xl border border-slate-800/60 flex justify-center">
              <TicketPriceEditor eventId={event.id} initialPrice={event.ticketPrice} />
            </div>

            <button onClick={handleNextStep} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20">
              Avançar para Patrocinadores <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* PASSO 2: CADASTRO DE PATROCINADORES */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-3 rounded-xl text-amber-400"><Megaphone size={24} /></div>
              <div>
                <h3 className="text-xl font-bold text-white">Passo 2: Patrocinadores do Evento</h3>
                <p className="text-sm text-slate-400">Cadastre os comércios locais que apoiam o bingo. (Opcional - você pode avançar direto).</p>
              </div>
            </div>

            <div className="bg-black/20 p-6 rounded-2xl border border-slate-800/60">
              <SponsorManager eventId={event.id} initialSponsors={sponsors} />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                Voltar
              </button>
              <button onClick={handleNextStep} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                Avançar para Rodadas <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: CONFIGURAÇÃO DE RODADAS E PRENDAS */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-violet-500/20 p-3 rounded-xl text-violet-400"><Trophy size={24} /></div>
              <div>
                <h3 className="text-xl font-bold text-white">Passo 3: Premiações & Naming Rights</h3>
                <p className="text-sm text-slate-400">Configure as rodadas e prêmios. Se a rodada tiver patrocinador, selecione na lista.</p>
              </div>
            </div>

            <div className="bg-black/20 p-6 rounded-2xl border border-slate-800/60 max-h-[450px] overflow-y-auto">
              <PrizeManager eventId={event.id} initialPrizes={prizes} sponsors={sponsors} />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                Voltar
              </button>
              <button 
                onClick={handleNextStep} 
                disabled={!hasPrizes} 
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
              >
                {hasPrizes ? "Prêmios definidos, Avançar!" : "Cadastre pelo menos 1 prêmio para avançar"} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: GERAÇÃO FÁBRICA DE CARTELAS */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-pink-500/20 p-3 rounded-xl text-pink-400"><Printer size={24} /></div>
              <div>
                <h3 className="text-xl font-bold text-white">Passo 4: A Fábrica de Cartelas</h3>
                <p className="text-sm text-slate-400">Gere o lote inicial de cartelas do estoque para concluir a preparação.</p>
              </div>
            </div>

            <div className="bg-black/20 p-8 rounded-2xl border border-slate-800 text-center flex flex-col items-center shadow-inner">
              <GenerateCardsButton eventId={event.id} eventName={event.name} />
              <p className="text-[11px] text-slate-500 mt-4 max-w-md leading-relaxed">
                *Nota: Assim que as cartelas forem geradas matemáticas no banco de dados, o Wizard entenderá que o setup acabou e liberará seu Centro de Comando operacional completo!
              </p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="px-6 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                Voltar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}