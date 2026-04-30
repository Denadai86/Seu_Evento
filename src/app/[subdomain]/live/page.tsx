import { prisma } from "../../../lib/prisma";
import { auth } from "../../.././lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import BingoGame from "./BingoGame";

export default async function LivePage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ event: string }>;
}) {
  const { subdomain } = await params;
  const { event: eventId } = await searchParams;

  // 1. Validação primária de rota
  if (!subdomain || !eventId) {
    redirect("/dashboard");
  }

  // 2. Busca de dados e validação de Tenant
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      sponsors: true,
      organization: true,
    },
  });

  if (!event || event.organization.slug !== subdomain) {
    redirect("/dashboard");
  }

  // 3. Autenticação híbrida: Dono via Google OAuth OU Locutor via Cookie
  const session = await auth();
  const cookieStore = await cookies();
  const isOperator = cookieStore.get(`auth_${subdomain}`);

  if (!session && !isOperator) {
    redirect("/entrar");
  }

  // 4. Renderização — só chega aqui após passar por toda a segurança
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