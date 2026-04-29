import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const event = await prisma.event.findFirst({
    include: {
      cards: { where: { isSold: true } },
      sponsors: true
    }
  });
  
  return NextResponse.json({ event, cards: event?.cards });
}