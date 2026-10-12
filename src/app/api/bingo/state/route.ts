// src/app/api/bingo/state/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SPONSOR_SELECT, sponsorOrderBy, resolveSponsorSlots } from "@/lib/sponsorRotation";

// 🚨 FORÇA O NEXT.JS A NUNCA CACHEAR ESTA ROTA
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        tenantId: true,
        drawnNumbers: true,
        showBoard: true,
        pendingWinnerCard: true,
        pendingWinnerName: true,
        bingoConfirmed: true,
        sponsorCursor: true,
        // Lista viva (cadastrar patrocinador no meio do evento aparece sem recarregar)
        sponsors: {
          orderBy: sponsorOrderBy(),
          select: SPONSOR_SELECT,
        },
        // Traz o prêmio atual da rodada ativa (com o patrocinador que o oferece)
        prizes: {
          where: { isCompleted: false },
          orderBy: { order: "asc" },
          take: 1,
          select: {
            id: true,
            name: true,
            type: true,
            prizeName: true,
            order: true,
            sponsor: { select: SPONSOR_SELECT },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { currentSponsor, nextSponsor } = resolveSponsorSlots(
      event.sponsors,
      event.sponsorCursor,
      event.drawnNumbers.length > 0
    );

    // 🔐 Esta rota é PÚBLICA (o telão não tem login). Quem enxerga o "bastidor" do bingo
    // (código da cartela e nome completo do ganhador pendente) é só a equipe do evento.
    let isStaffView = false;
    const session = await auth();
    if (session?.user?.tenantId && session.user.tenantId === event.tenantId) {
      if (session.user.role === "ORG_ADMIN") {
        isStaffView = true;
      } else {
        const staff = await prisma.eventStaff.findFirst({
          where: {
            eventId,
            userId: session.user.id,
            OR: [{ canOperate: true }, { canVerify: true }],
          },
          select: { id: true },
        });
        isStaffView = !!staff;
      }
    }

    const body: Record<string, unknown> = {
      drawnNumbers: event.drawnNumbers || [],
      latest: event.drawnNumbers[event.drawnNumbers.length - 1] || null,
      showBoard: event.showBoard,
      bingoConfirmed: event.bingoConfirmed,
      // Público: o nome do ganhador só aparece DEPOIS da confirmação e sem o nome do fiscal.
      pendingWinnerName:
        event.bingoConfirmed && event.pendingWinnerName
          ? event.pendingWinnerName.split(" (Fiscal:")[0].trim()
          : null,
      currentPrize: event.prizes[0] || null,
      sponsors: event.sponsors,
      currentSponsor,
      nextSponsor,
    };

    if (isStaffView) {
      body.pendingWinnerCard = event.pendingWinnerCard;
      body.pendingWinnerName = event.pendingWinnerName;
    }

    const response = NextResponse.json(body);

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}