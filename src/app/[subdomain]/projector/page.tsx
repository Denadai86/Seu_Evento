// src/app/[subdomain]/projector/page.tsx

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProjectorView from "./ProjectorView";

// 1. Atualizar tipagens para refletir Promises
interface ProjectorPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ event?: string }>;
}

export default async function ProjectorPage({
  params,
  searchParams,
}: ProjectorPageProps) {
  // 2. Aguardar (await) os parâmetros antes de extrair os valores
  const { subdomain } = await params;
  const resolvedSearchParams = await searchParams;
  const eventId = resolvedSearchParams.event;

  if (!eventId) redirect("/");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      sponsors: true,
      tenant: true, // 🔥 IMPORTANTE
    },
  });

  // 🔐 PROTEÇÃO MULTI-TENANT
  if (!event || !event.tenant || event.tenant.subdomain !== subdomain) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <ProjectorView
        eventId={event.id}
        eventName={event.name}
        initialDrawn={event.drawnNumbers}
        sponsors={event.sponsors}
      />
    </div>
  );
}