// src/app/[subdomain]/verify/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import QRCodeScanner from "./QRCodeScanner";

type SearchParams = {
  event?: string;
  id?: string;
};

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { subdomain } = await params;
  const { event: eventId, id: shortId } = await searchParams;

  if (!eventId || !shortId) {
    return <VerifyHome subdomain={subdomain} />;
  }

  const card = await prisma.card.findFirst({
    where: {
      shortId: shortId.toUpperCase(),
      event: {
        id: eventId,
        tenant: { subdomain }
      }
    },
    include: {
      event: {
        select: {
          name: true,
          id: true,
        }
      }
    }
  });

  if (!card) {
    return (
      <div className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-black mb-3">Cartela não encontrada</h1>
          <p className="text-slate-400">O ID <span className="font-mono text-red-400">{shortId}</span> não existe neste evento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-2xl mb-6">
              ✅
            </div>
            <h1 className="text-3xl font-black text-emerald-400">Cartela Válida</h1>
            <p className="text-slate-400 mt-2">{card.event.name}</p>
          </div>

          <div className="bg-slate-950 rounded-2xl p-6 mb-8 text-center">
            <p className="text-slate-500 text-sm uppercase tracking-widest mb-2">Número da Cartela</p>
            <p className="text-5xl font-mono font-black text-white tracking-widest">{card.shortId}</p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-3 border-b border-slate-800">
              <span className="text-slate-400">Status</span>
              <span className="font-bold text-emerald-400">✅ Válida para Conferência</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-800">
              <span className="text-slate-400">Evento</span>
              <span className="font-medium">{card.event.name}</span>
            </div>
          </div>

          <div className="mt-10 text-center text-xs text-slate-500">
            Conferido em: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        <QRCodeScanner eventId={card.event.id} subdomain={subdomain} />
      </div>
    </div>
  );
}

// Página inicial (quando acessado sem ID)
function VerifyHome({ subdomain }: { subdomain: string }) {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-black mb-4">Verificador de Cartelas</h1>
        <p className="text-slate-400 mb-10">
          Escaneie o QR Code da cartela ou digite o código manualmente
        </p>
        <QRCodeScanner eventId={null} subdomain={subdomain} />
      </div>
    </div>
  );
}