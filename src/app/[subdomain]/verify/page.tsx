// src/app/[subdomain]/verify/page.tsx
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateWinningCard } from "@/actions/bingo";
import QRCodeScanner from "./QRCodeScanner";
import VerifyClient from "./verifyClient";
import StaffNav from "@/components/staff/StaffNav";
import { ScanLine } from "lucide-react";

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

  // ── SEM ID: tela do scanner ──────────────────────────────────────────────
  if (!rawShortId) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex flex-col font-sans">
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
          <p className="text-[10px] uppercase font-black tracking-widest text-blue-400">
            Verificador
          </p>
          <p className="text-sm font-bold text-white truncate leading-tight">
            Escaneie ou digite o código da cartela
          </p>
        </header>

        <main className="flex-1 flex flex-col justify-center p-4 pb-20 max-w-md mx-auto w-full">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <ScanLine size={32} className="text-blue-400" />
            </div>
            <p className="text-slate-400 text-sm text-center">
              Leia o QR Code da cartela ou insira o código manualmente para verificar se é vencedora.
            </p>
          </div>
          <QRCodeScanner eventId={eventId || null} subdomain={subdomain} />
        </main>

        <StaffNav eventId={eventId} />
      </div>
    );
  }

  // ── COM ID: resultado da verificação ─────────────────────────────────────
  const shortId = rawShortId.toUpperCase().trim();

  const card = await prisma.card.findUnique({
    where: { shortId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          tenant: { select: { subdomain: true } },
        },
      },
    },
  });

  if (!card || card.event.tenant.subdomain !== subdomain) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex flex-col font-sans">
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
          <p className="text-[10px] uppercase font-black tracking-widest text-blue-400">Verificador</p>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-20">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-black text-red-400 mb-2">Cartela Inválida</h1>
          <p className="text-slate-400 text-sm mb-8">
            O código <span className="font-mono text-white">{shortId}</span> não foi encontrado.
          </p>
          <a
            href={`/verify${eventId ? `?event=${eventId}` : ""}`}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-3 rounded-xl transition active:scale-95"
          >
            Verificar outra
          </a>
        </main>

        <StaffNav eventId={eventId} />
      </div>
    );
  }

  const validation = await validateWinningCard(card.event.id, shortId);

  return (
    <div className="min-h-screen bg-[#0b0f14] flex flex-col font-sans text-white">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
        <p className="text-[10px] uppercase font-black tracking-widest text-blue-400">Verificador</p>
        <p className="text-sm font-bold text-white truncate leading-tight">
          {card.event.name}
        </p>
      </header>

      <main className="flex-1 p-4 pb-24 max-w-md mx-auto w-full space-y-4">
        {/* Card info */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-xl">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">Código</p>
          <p className="text-5xl font-mono font-black tracking-widest">{card.shortId}</p>

          <div
            className={`inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full text-sm font-black ${
              card.isPaid
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/15 text-red-400 border border-red-500/30"
            }`}
          >
            {card.isPaid ? "✅ PAGA" : "⛔ NÃO PAGA"}
          </div>
        </div>

        {/* Resultado da validação */}
        <VerifyClient
          eventId={card.event.id}
          shortId={card.shortId}
          validation={validation}
          verifierName={session?.user?.name || "Fiscal"}
        />

        {/* Scanner para próxima cartela */}
        <div className="pt-2">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-widest text-center mb-4">
            Verificar outra cartela
          </p>
          <QRCodeScanner eventId={card.event.id} subdomain={subdomain} />
        </div>
      </main>

      <StaffNav eventId={card.event.id} />
    </div>
  );
}
