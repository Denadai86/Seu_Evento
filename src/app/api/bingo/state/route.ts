// src/app/api/bingo/state/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
        drawnNumbers: true,
        showBoard: true,
        pendingWinnerCard: true,
        pendingWinnerName: true,
        bingoConfirmed: true,
        // Traz o prêmio atual da rodada ativa
        prizes: {
          where: { isCompleted: false },
          orderBy: { order: "asc" },
          take: 1,
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Monta a resposta com cabeçalhos HTTP que proíbem cache no navegador
    const response = NextResponse.json({
      drawnNumbers: event.drawnNumbers || [],
      latest: event.drawnNumbers[event.drawnNumbers.length - 1] || null,
      showBoard: event.showBoard,
      pendingWinnerCard: event.pendingWinnerCard,
      pendingWinnerName: event.pendingWinnerName,
      bingoConfirmed: event.bingoConfirmed,
      currentPrize: event.prizes[0] || null,
    });

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}