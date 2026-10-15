// src/app/[subdomain]/manual/ManualHub.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Printer, MessageCircle, SearchX } from "lucide-react";
import TopicIcon from "@/components/manual/TopicIcon";
import { searchTopics } from "@/lib/manual/search";
import { MANUAL_ROLES, ROLE_LABEL, visibleTopics } from "@/lib/manual/roles";
import type { Category, ManualRole, Topic } from "@/lib/manual/types";

const ROLE_BADGE: Record<ManualRole, string> = {
  admin: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  vendedor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  tesoureiro: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  palco: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  fiscal: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  conselho: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function RoleBadges({ roles }: { roles: Topic["roles"] }) {
  if (roles === "todos") {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-600/40">Todos</span>;
  }
  return (
    <>
      {roles.map((r) => (
        <span key={r} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ROLE_BADGE[r]}`}>
          {ROLE_LABEL[r]}
        </span>
      ))}
    </>
  );
}

function Tile({ topic, big = false, showRoles }: { topic: Topic; big?: boolean; showRoles: boolean }) {
  return (
    <Link
      href={`/manual/${topic.id}`}
      className={`group relative flex flex-col rounded-3xl border transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/20 ${
        big
          ? "lg:col-span-2 lg:row-span-2 p-7 bg-gradient-to-br from-emerald-600/25 via-emerald-900/20 to-[#111827] border-emerald-600/40 hover:border-emerald-400/70"
          : "p-5 bg-[#111827] border-slate-800 hover:border-emerald-600/50"
      }`}
    >
      <div className={`flex items-center justify-center rounded-2xl border mb-4 ${big ? "w-14 h-14 bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "w-11 h-11 bg-slate-800/70 border-slate-700 text-emerald-400"}`}>
        <TopicIcon name={topic.icon} size={big ? 28 : 22} />
      </div>
      <h3 className={`font-black text-white leading-snug ${big ? "text-2xl mb-2" : "text-base mb-1.5"}`}>{topic.title}</h3>
      <p className={`text-slate-400 leading-relaxed ${big ? "text-sm" : "text-xs"}`}>{topic.summary}</p>
      {showRoles && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          <RoleBadges roles={topic.roles} />
        </div>
      )}
      <span className={`mt-auto pt-4 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 ${big ? "text-sm" : ""}`}>
        Ver passo a passo →
      </span>
    </Link>
  );
}

export default function ManualHub({
  topics,
  categories,
  viewerRoles,
  isAdmin,
  initialAs,
  firstName,
  welcome,
  supportUrl,
}: {
  topics: Topic[];
  categories: Category[];
  viewerRoles: ManualRole[];
  isAdmin: boolean;
  initialAs: ManualRole | null;
  firstName: string;
  welcome: boolean;
  supportUrl: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [viewAs, setViewAs] = useState<ManualRole | null>(initialAs);

  // Administrador escolhe "ver como…"; os demais já recebem só o que é deles.
  const visible = useMemo(
    () => (isAdmin ? visibleTopics(topics, { roles: viewerRoles, isAdmin: true, viewAs }) : topics),
    [topics, isAdmin, viewerRoles, viewAs]
  );

  const results = useMemo(() => (query.trim() ? searchTopics(visible, query) : null), [visible, query]);
  const featured = useMemo(() => visible.filter((t) => t.featured).slice(0, 5), [visible]);
  const sections = useMemo(
    () => categories.map((c) => ({ category: c, items: visible.filter((t) => t.category === c.id) })).filter((s) => s.items.length > 0),
    [categories, visible]
  );

  // Atalho: "/" leva direto para a busca.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const printHref = isAdmin ? `/manual/imprimir${viewAs ? `?como=${viewAs}` : ""}` : "/manual/imprimir";
  const myRoleText = isAdmin ? (viewAs ? `Vendo como: ${ROLE_LABEL[viewAs]}` : "Todos os assuntos") : viewerRoles.map((r) => ROLE_LABEL[r]).join(", ") || "Assuntos para todos";

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-24">
      <header className="sticky top-0 z-40 bg-[#0b0f14]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} /> Voltar
          </button>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/80">Central de Ajuda</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-8">
        {welcome && (
          <div className="mb-6 rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Bem-vindo(a){firstName ? `, ${firstName}` : ""}! Começamos pelos assuntos mais importantes do seu papel. Você pode voltar aqui quando quiser.
          </div>
        )}

        {/* BUSCA */}
        <section className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Como podemos ajudar?</h1>
          <p className="text-slate-500 text-sm mb-5">{myRoleText}</p>
          <div className="relative">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquise: desfazer venda, cartela perdida, esqueci o PIN…"
              aria-label="Pesquisar no manual"
              className="w-full bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-2xl pl-14 pr-5 py-4 text-base text-white placeholder:text-slate-500 outline-none transition"
            />
          </div>
          <p className="hidden sm:block text-[11px] text-slate-600 mt-2">Dica: aperte <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">/</kbd> para ir direto à pesquisa.</p>

          {isAdmin && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Ver como (para treinar a equipe)</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setViewAs(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${!viewAs ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                  Tudo
                </button>
                {MANUAL_ROLES.map((r) => (
                  <button key={r} type="button" onClick={() => setViewAs(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${viewAs === r ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {results ? (
          /* RESULTADOS DA BUSCA */
          <section>
            <p className="text-sm text-slate-500 mb-4">
              {results.length === 0 ? "Nenhum resultado" : `${results.length} resultado${results.length === 1 ? "" : "s"}`} para “{query.trim()}”
            </p>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((t) => <Tile key={t.id} topic={t} showRoles={isAdmin && !viewAs} />)}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center">
                <SearchX size={32} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-300 font-bold mb-1">Não achamos nada com essas palavras.</p>
                <p className="text-sm text-slate-500 mb-5">Tente uma palavra mais simples (por exemplo, “vender”, “receber”, “PIN”) ou veja os assuntos abaixo.</p>
                <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300">
                  <MessageCircle size={16} /> Falar com o suporte
                </a>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* COMECE POR AQUI (bento: 1 grande + 4) */}
            {featured.length > 0 && (
              <section className="mb-12">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Comece por aqui</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {featured.map((t, i) => <Tile key={t.id} topic={t} big={i === 0 && featured.length >= 3} showRoles={isAdmin && !viewAs} />)}
                </div>
              </section>
            )}

            {/* POR ASSUNTO */}
            {sections.map(({ category, items }) => (
              <section key={category.id} className="mb-10">
                <div className="mb-4">
                  <h2 className="text-lg font-black text-white">{category.title}</h2>
                  <p className="text-xs text-slate-500">{category.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => <Tile key={t.id} topic={t} showRoles={isAdmin && !viewAs} />)}
                </div>
              </section>
            ))}
          </>
        )}

        {/* RODAPÉ */}
        <footer className="mt-12 pt-6 border-t border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href={printHref} target="_blank" className="flex items-center gap-2 font-bold text-slate-300 hover:text-white transition">
            <Printer size={16} /> Imprimir {isAdmin && !viewAs ? "o manual completo" : "o guia do meu papel"}
          </Link>
          <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-emerald-400 hover:text-emerald-300 transition">
            <MessageCircle size={16} /> Não achou? Fale com o suporte
          </a>
        </footer>
      </main>
    </div>
  );
}
