import { prisma } from "../../../lib/prisma"; // Ajuste o caminho se necessário (ex: @/lib/prisma)
import { redirect } from "next/navigation";
import BingoGame from "./BingoGame";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";

export default async function LivePage({ params, searchParams }: { 
  params: Promise<{ subdomain: string }>,
  searchParams: Promise<{ event: string }> 
}) {
  const { subdomain } = await params;
  const { event: eventId } = await searchParams;

  // 1. Validação primária de rota
  if (!eventId) {
    redirect("/dashboard");
  }

  // 2. Busca de dados e validação de Tenant (Inquilino)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { 
      sponsors: true,
      organization: true 
    }
  });

  if (!event || event.organization.slug !== subdomain) {
    redirect("/dashboard");
  }

  // 3. Camada de Autenticação Híbrida (Dono via Clerk OU Locutor via Cookie)
  const user = await currentUser();
  const cookieStore = await cookies();
  const isOperator = cookieStore.get(`auth_${subdomain}`);

  if (!user && !isOperator) {
    redirect("/entrar"); 
  }

  // 4. Renderização (Só chega aqui se passou na segurança)
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