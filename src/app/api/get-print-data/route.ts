// src/app/api/get-print-data/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma"; // Use o Singleton correto que ensinei!

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tenantId = session.user.tenantId;

  // 🔒 GUARDA DE SEGURANÇA (ESSENCIAL)
  if (!tenantId) {
    return new NextResponse("Tenant inválido", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return new NextResponse("Event ID required", { status: 400 });
  }

  const data = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenantId: tenantId, // ✅ agora é string garantido
    },
    include: {
      sponsors: true,
      cards: true,
    },
  });

  if (!data) {
    return new NextResponse("Not Found or Access Denied", { status: 404 });
  }

  return NextResponse.json(data);
}