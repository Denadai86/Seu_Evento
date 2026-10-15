// src/app/[subdomain]/manual/imprimir/page.tsx
//
// GUIA PARA IMPRIMIR: todos os assuntos de um papel numa folha só (o "guia rápido" para entregar à equipe).
// Administrador: ?como=<papel> imprime o guia daquele papel; sem isso, imprime o manual completo.
// Voluntário: imprime o guia do próprio papel.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PrintGuideButton from "@/components/manual/PrintGuideButton";
import { getManualViewer } from "@/lib/manual/viewer";
import { CATEGORIES, TOPICS } from "@/lib/manual/content";
import { ROLE_LABEL, isManualRole, visibleTopics } from "@/lib/manual/roles";

export const metadata = { title: "Guia para imprimir" };

export default async function ManualPrintPage({ searchParams }: { searchParams: Promise<{ como?: string }> }) {
  const viewer = await getManualViewer();
  if (!viewer) redirect("/entrar");
  const { como } = await searchParams;

  const target = viewer.isAdmin
    ? isManualRole(como) ? como : null
    : isManualRole(como) && viewer.roles.includes(como) ? como : viewer.roles[0] ?? null;

  const topics = viewer.isAdmin
    ? visibleTopics(TOPICS, { roles: [], isAdmin: true, viewAs: target })
    : visibleTopics(TOPICS, { roles: target ? [target] : [], isAdmin: false });

  const title = target ? `Guia rápido: ${ROLE_LABEL[target]}` : viewer.isAdmin ? "Manual completo" : "Guia rápido";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16 print:bg-white print:pb-0">
      <header className="print:hidden bg-[#0b0f14] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Link href="/manual" className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"><ArrowLeft size={18} /> Central de Ajuda</Link>
          <PrintGuideButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto mt-8 print:mt-0 bg-white p-10 rounded-xl shadow-xl print:shadow-none print:p-0">
        <div className="border-b-2 border-slate-200 pb-5 mb-6">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Seu Evento</p>
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{topics.length} assunto{topics.length === 1 ? "" : "s"} • aperte “/” na Central de Ajuda para pesquisar</p>
        </div>

        {CATEGORIES.map((cat) => {
          const items = topics.filter((t) => t.category === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} className="mb-8">
              <h2 className="text-lg font-black text-emerald-800 border-b border-slate-200 pb-1 mb-4">{cat.title}</h2>
              <div className="space-y-6">
                {items.map((t) => (
                  <article key={t.id} className="break-inside-avoid">
                    <h3 className="text-base font-black">{t.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">{t.summary}</p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                      {t.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                    {(t.warnings ?? []).map((w, i) => (
                      <p key={i} className="text-xs mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2"><strong>Atenção:</strong> {w}</p>
                    ))}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
