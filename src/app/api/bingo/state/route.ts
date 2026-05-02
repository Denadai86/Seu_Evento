// src/app/api/bingo/state/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Rota pública por design: O telão não terá sessão logada, 
// ele acessará via URL pública (ex: /telao/123). Não expomos dados sensíveis, apenas números.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) return new NextResponse("Event ID missing", { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { drawnNumbers: true, isActive: true }
  });

  if (!event) return new NextResponse("Event not found", { status: 404 });

  // Retorna apenas a carga útil estritamente necessária
  return NextResponse.json({
    drawnNumbers: event.drawnNumbers,
    latest: event.drawnNumbers[event.drawnNumbers.length - 1] || null
  });
}