import { prisma } from "../../../lib/prisma";
import { redirect } from "next/navigation";
import ProjectorView from "./ProjectorView"; // Criaremos a seguir

export default async function ProjectorPage({ params, searchParams }: { 
  params: Promise<{ subdomain: string }>,
  searchParams: Promise<{ event: string }> 
}) {
  const { subdomain } = await params;
  const { event: eventId } = await searchParams;

  if (!eventId) redirect("/");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { sponsors: true }
  });

  if (!event) redirect("/");

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