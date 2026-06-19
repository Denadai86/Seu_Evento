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
  searchParams: Promise<{ event?: string | string[]; id?: string | string[] }>;
}) {
  const { subdomain } = await params;
  const search = await searchParams;
  const session = await auth();

  const eventId = Array.isArray(search.event) ? search.event[0] : search.event;
  const rawShortId = Array.isArray(search.id) ? search.id[0] : search.id;

  if (!rawShortId) {
    return <VerifyHome subdomain={subdomain} eventId={eventId || null} />;
  }

  const shortId = rawShortId.toUpperCase().trim();

  const card = await prisma.card.findUnique({
    where: { shortId },
    include: { 
      event: { 
        select: { 
          id: true, 
          name: true, 
          tenant: { select: { subdomain: true } } 
        } 
      } 
    }
  });

  if (!card || card.event.tenant.subdomain !== subdomain) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-black text-red-500 mb-3">Cartela Inválida</h1>
          <p className="text-slate-400">ID <span className="font-mono">{shortId}</span> não encontrado.</p>
          <a 
            href={`/verify${eventId ? `?event=${eventId}` : ""}`} 
            className="mt-6 inline-block bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold transition"
          >
            Voltar
          </a>
        </div>
      </div>
    );
  }

  const validation = await validateWinningCard(card.event.id, shortId);

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">VERIFICADOR OFICIAL</h1>
            <p className="text-xl font-bold">{card.event.name}</p>
          </div>

          <div className="bg-slate-950 rounded-2xl p-8 mb-6 text-center border border-slate-800">
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">CÓDIGO</p>
            <p className="text-5xl font-mono font-black tracking-widest text-white">{card.shortId}</p>
            
            <div className={`inline-block mt-4 px-4 py-1 rounded-full text-sm font-bold ${card.isPaid ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
              {card.isPaid ? "✅ PAGA" : "⛔ NÃO PAGA"}
            </div>
          </div>

          <VerifyClient 
            eventId={card.event.id} 
            shortId={card.shortId} 
            validation={validation} 
            verifierName={session?.user?.name || "Fiscal"}
          />
        </div>

        <div className="mt-8">
          <QRCodeScanner eventId={card.event.id} subdomain={subdomain} />
        </div>
      </div>
    </div>
  );
}

function VerifyHome({ subdomain, eventId }: { subdomain: string; eventId: string | null }) {
  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-black mb-4">Verificador</h1>
        <p className="text-slate-400 mb-10">Escaneie o QR Code da cartela ou digite o código manualmente.</p>
        <QRCodeScanner eventId={eventId} subdomain={subdomain} />
      </div>
    </div>
  );
}