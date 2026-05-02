// src/app/[subdomain]/live/page.tsx

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import BingoGame from "./BingoGame";

export default async function LivePage({
  params,
  searchParams,
}: {
  params: { subdomain: string };
  searchParams: { event?: string };
}) {
  const { subdomain } = params;
  const eventId = searchParams.event;

  // 1. Validação básica
  if (!subdomain || !eventId) {
    redirect("/dashboard");
  }

  // 2. Busca evento + tenant correto
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      sponsors: true,
      tenant: true,
    },
  });

  // 3. Validação de isolamento (multi-tenant)
  if (!event || !event.tenant || event.tenant.subdomain !== subdomain) {
    redirect("/dashboard");
  }

  // 4. Auth (NextAuth OU operador via cookie)
  const session = await auth();
  const cookieStore = await cookies();
  const operatorCookie = cookieStore.get(`auth_${subdomain}`);

  if (!session && !operatorCookie) {
    redirect("/entrar");
  }

  // 5. Render
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <BingoGame
        eventId={event.id}
        eventName={event.name}
        initialDrawn={event.drawnNumbers}
        sponsors={event.sponsors}
      />
    </div>
  );
}