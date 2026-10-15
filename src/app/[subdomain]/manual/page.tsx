// src/app/[subdomain]/manual/page.tsx
//
// CENTRAL DE AJUDA: manual dentro do sistema. Busca, assuntos por papel e passo a passo.
// Qualquer pessoa logada abre; cada uma vê só os assuntos do seu papel (o administrador vê tudo e pode "ver como…").

import { redirect } from "next/navigation";
import { getManualViewer } from "@/lib/manual/viewer";
import { CATEGORIES, TOPICS } from "@/lib/manual/content";
import { isManualRole, visibleTopics } from "@/lib/manual/roles";
import { siteConfig } from "@/config/site";
import ManualHub from "./ManualHub";

export const metadata = { title: "Central de Ajuda" };

export default async function ManualPage({ searchParams }: { searchParams: Promise<{ como?: string; bemvindo?: string }> }) {
  const viewer = await getManualViewer();
  if (!viewer) redirect("/entrar");

  const { como, bemvindo } = await searchParams;

  // Administrador recebe tudo (e filtra na tela); voluntário recebe só o que é do papel dele.
  const topics = viewer.isAdmin ? TOPICS : visibleTopics(TOPICS, { roles: viewer.roles, isAdmin: false });

  return (
    <ManualHub
      topics={topics}
      categories={CATEGORIES}
      viewerRoles={viewer.roles}
      isAdmin={viewer.isAdmin}
      initialAs={viewer.isAdmin && isManualRole(como) ? como : null}
      firstName={viewer.firstName}
      welcome={bemvindo === "1"}
      supportUrl={siteConfig.urls.whatsapp}
    />
  );
}
