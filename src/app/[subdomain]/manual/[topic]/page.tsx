// src/app/[subdomain]/manual/[topic]/page.tsx
//
// Um assunto do manual, passo a passo. Link que dá para mandar por WhatsApp ("olha o passo a passo aqui").

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lightbulb, TriangleAlert, MessageCircle } from "lucide-react";
import TopicIcon from "@/components/manual/TopicIcon";
import PrintGuideButton from "@/components/manual/PrintGuideButton";
import { getManualViewer } from "@/lib/manual/viewer";
import { getCategory, getTopic } from "@/lib/manual/content";
import { ROLE_LABEL, topicVisibleTo } from "@/lib/manual/roles";
import { siteConfig } from "@/config/site";

export default async function ManualTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicId } = await params;
  const viewer = await getManualViewer();
  if (!viewer) redirect("/entrar");

  const topic = getTopic(topicId);
  if (!topic) notFound();

  // Quem não é do papel volta para a central (o administrador vê qualquer assunto).
  if (!viewer.isAdmin && !topicVisibleTo(topic, viewer.roles)) redirect("/manual");

  const category = getCategory(topic.category);
  const related = (topic.related ?? [])
    .map((id) => getTopic(id))
    .filter((t): t is NonNullable<typeof t> => !!t && (viewer.isAdmin || topicVisibleTo(t, viewer.roles)));

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-24 print:bg-white print:text-slate-900">
      <header className="sticky top-0 z-40 bg-[#0b0f14]/90 backdrop-blur-md border-b border-slate-800/80 print:hidden">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/manual" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} /> Central de Ajuda
          </Link>
          <PrintGuideButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500/80 mb-3">{category?.title}</p>
        <div className="flex items-start gap-4 mb-3">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 print:hidden">
            <TopicIcon name={topic.icon} size={28} />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight print:text-slate-900">{topic.title}</h1>
        </div>
        <p className="text-slate-400 mb-3 print:text-slate-600">{topic.summary}</p>
        <p className="text-xs text-slate-500 mb-8">
          Para: {topic.roles === "todos" ? "todos" : topic.roles.map((r) => ROLE_LABEL[r]).join(", ")}
        </p>

        <ol className="space-y-4 mb-8">
          {topic.steps.map((step, i) => (
            <li key={i} className="flex gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-5 break-inside-avoid print:bg-white print:border-slate-300">
              <span className="shrink-0 w-9 h-9 rounded-full bg-emerald-600 text-white text-lg font-black flex items-center justify-center">{i + 1}</span>
              <span className="text-base text-slate-100 leading-relaxed pt-1 print:text-slate-900">{step}</span>
            </li>
          ))}
        </ol>

        {(topic.warnings ?? []).map((w, i) => (
          <div key={`w${i}`} className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 mb-3 text-sm text-amber-100 break-inside-avoid print:text-slate-900">
            <TriangleAlert size={18} className="shrink-0 mt-0.5 text-amber-400" /> <span>{w}</span>
          </div>
        ))}
        {(topic.tips ?? []).map((t, i) => (
          <div key={`t${i}`} className="flex gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 mb-3 text-sm text-sky-100 break-inside-avoid print:text-slate-900">
            <Lightbulb size={18} className="shrink-0 mt-0.5 text-sky-400" /> <span>{t}</span>
          </div>
        ))}

        {related.length > 0 && (
          <section className="mt-10 print:hidden">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Veja também</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((r) => (
                <Link key={r.id} href={`/manual/${r.id}`} className="rounded-2xl border border-slate-800 bg-[#111827] hover:border-emerald-600/50 p-4 transition">
                  <p className="font-bold text-white text-sm mb-1">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 pt-6 border-t border-slate-800 text-sm print:hidden">
          <p className="text-slate-500 mb-2">Isto não resolveu?</p>
          <a href={siteConfig.urls.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-emerald-400 hover:text-emerald-300">
            <MessageCircle size={16} /> Falar com o suporte pelo WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
