// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"], // Útil para ver no terminal o que está acontecendo no banco
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;