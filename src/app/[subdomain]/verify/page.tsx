// src/app/[subdomain]/verify/page.tsx
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateWinningCard } from "@/actions/bingo";
import QRCodeScanner from "./QRCodeScanner";
import VerifyClient from "./verifyClient";
import StaffNav from "@/components/staff/StaffNav";
import { hasManagementAccess } from "@/lib/eventAccess";
import { unpaidCardAdvice, type UnpaidAdvice } from "@/lib/unpaidAdvice";
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
  const showGestao = session?.user?.id && session.user.role === "STAFF" ? await hasManagementAccess(session.user.id) : false;

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

        <StaffNav showGestao={showGestao} eventId={eventId} />
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

        <StaffNav showGestao={showGestao} eventId={eventId} />
      </div>
    );
  }

  const validation = await validateWinningCard(card.event.id, shortId);

  // Cartela não paga: só para quem tem permissão de conferir (validation.reason só chega aqui para eles).
  // Mostra com quem a cartela está e, quando faz sentido, o convite para regularizar.
  let advice: UnpaidAdvice | null = null;
  if (validation?.reason === "NOT_PAID") {
    const role = session?.user?.role;
    const viewerId = session?.user?.id ?? null;
    let canSell = false;
    let canTreasury = false;
    if (viewerId && role === "STAFF") {
      const rows = await prisma.eventStaff.findMany({
        where: { eventId: card.event.id, userId: viewerId },
        select: { canSell: true, canTreasury: true },
      });
      canSell = rows.some((r) => r.canSell);
      canTreasury = rows.some((r) => r.canTreasury);
    }
    const holderRow = card.eventStaffId
      ? await prisma.eventStaff.findUnique({
          where: { id: card.eventStaffId },
          select: { id: true, userId: true, user: { select: { name: true } } },
        })
      : null;
    advice = unpaidCardAdvice({
      eventId: card.event.id,
      code: card.shortId,
      holder: holderRow ? { staffId: holderRow.id, userId: holderRow.userId, name: holderRow.user?.name ?? "um voluntário" } : null,
      viewer: { userId: viewerId, isAdmin: role === "ORG_ADMIN", canSell, canTreasury },
    });
  }

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
          advice={advice}
        />

        {/* Scanner para próxima cartela */}
        <div className="pt-2">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-widest text-center mb-4">
            Verificar outra cartela
          </p>
          <QRCodeScanner eventId={card.event.id} subdomain={subdomain} />
        </div>
      </main>

      <StaffNav showGestao={showGestao} eventId={card.event.id} />
    </div>
  );
}