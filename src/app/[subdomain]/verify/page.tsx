// src/app/[subdomain]/verify/page.tsx
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateWinningCard } from "@/actions/bingo";
import QRCodeScanner from "./QRCodeScanner";
import VerifyClient from "./verifyClient";

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ event?: string; id?: string }>;
}) {
  const { subdomain } = await params;
  const { event: eventId, id: shortId } = await searchParams;
  const session = await auth();

  if (!eventId || !shortId) {
    return <VerifyHome subdomain={subdomain} />;
  }

  // 1. Executa a auditoria matemática automática
  const validation = await validateWinningCard(eventId, shortId);

  // 2. Busca dados da cartela para exibição
  const card = await prisma.card.findFirst({
    where: { shortId: shortId.toUpperCase(), eventId },
    include: { event: { select: { name: true } } }
  });

  if (!card) {
    return (
      <div className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-black mb-3 text-red-500">Cartela Inválida</h1>
          <p className="text-slate-400">ID {shortId} não pertence a este evento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
          {/* Badge de Verificador Logado (Log de Integridade) */}
          <div className="absolute top-0 right-8 bg-slate-800 px-3 py-1 rounded-b-xl text-[9px] font-bold text-slate-500 uppercase tracking-widest border-x border-b border-slate-700">
            Fiscal: {session?.user?.name || "Público"}
          </div>

          <div className="text-center mb-8">
            <h1 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Conferência Final</h1>
            <p className="text-2xl font-black text-white">{card.event.name}</p>
          </div>

          {/* O VISUAL DA CARTELA */}
          <div className="bg-slate-950 rounded-[2rem] p-8 mb-6 border border-slate-800 text-center relative">
             <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-2">Código Identificador</p>
             <p className="text-6xl font-mono font-black text-white tracking-tighter italic">{card.shortId}</p>
             
             {/* Status de Pagamento (Selinho) */}
             <div className={`absolute -top-3 -right-2 px-4 py-1 rounded-full text-[10px] font-black uppercase shadow-lg ${card.isPaid ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                {card.isPaid ? "PAGA" : "NÃO PAGA"}
             </div>
          </div>

          {/* RESULTADO DA AUDITORIA */}
          <VerifyClient 
            eventId={eventId} 
            shortId={card.shortId} 
            validation={validation} 
            verifierName={session?.user?.name || "Desconhecido"}
          />

          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <span>Auditado via Ação Leve</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="mt-8">
          <QRCodeScanner eventId={eventId} subdomain={subdomain} />
        </div>
      </div>
    </div>
  );
}

function VerifyHome({ subdomain }: { subdomain: string }) {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-black mb-4">Verificador</h1>
        <p className="text-slate-500 mb-10 text-sm font-medium uppercase tracking-widest leading-relaxed">
          Escaneie ou digite o ID<br/> para conferência oficial.
        </p>
        <QRCodeScanner eventId={null} subdomain={subdomain} />
      </div>
    </div>
  );
}