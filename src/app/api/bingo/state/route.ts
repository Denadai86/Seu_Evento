// src/app/api/bingo/state/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Garante que a API não faça cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      // 🔥 Puxa a primeira rodada que ainda não foi concluída
      prizes: { where: { isCompleted: false }, orderBy: { order: 'asc' }, take: 1 }
    }
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  return NextResponse.json({
    drawnNumbers: event.drawnNumbers,
    latest: event.drawnNumbers[event.drawnNumbers.length - 1] || null,
    showBoard: event.showBoard,
    currentPrize: event.prizes[0] || null // 🔥 Injetamos o prêmio no Real-Time!
  });
}