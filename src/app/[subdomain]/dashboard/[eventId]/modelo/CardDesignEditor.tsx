// src/app/[subdomain]/dashboard/[eventId]/modelo/CardDesignEditor.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Printer } from "lucide-react";
import CardFace from "@/components/print/CardFace";
import { CARD_CSS } from "@/components/print/cardCss";
import { saveCardDesign } from "@/actions/cardDesign";
import { FIELD_LIMITS, THEMES, THEME_KEYS, layoutProfile, parseCardDesign, type CardDesign, type CardTheme, type PrintLayout } from "@/lib/cardDesign";
import type { BingoMatrix } from "@/lib/bingoRules";

// Números de exemplo (a amostra NÃO usa cartela de verdade).
const SAMPLE: BingoMatrix = { B: [1, 4, 7, 11, 13], I: [17, 21, 24, 29, 30], N: [31, 34, 0, 40, 44], G: [47, 49, 52, 59, 60], O: [61, 62, 67, 69, 70] };

const SIZES: Record<"a4-4" | "a4-6" | "a6", { w: string; h: string; label: string }> = {
  "a4-4": { w: "9.5cm", h: "13.5cm", label: "A4 · 4 por folha" },
  "a4-6": { w: "6.1cm", h: "9cm", label: "A4 · 6 por folha" },
  a6: { w: "10cm", h: "14cm", label: "A6 (gráfica)" },
};

export default function CardDesignEditor({
  eventId, eventName, organization, initialDesign, sponsors, prizesText, sampleQr, cardCount,
}: {
  eventId: string;
  eventName: string;
  organization: string;
  initialDesign: CardDesign;
  sponsors: { id: string; name: string; logoUrl: string | null }[];
  prizesText: string;
  sampleQr: string;
  cardCount: number;
}) {
  const [design, setDesign] = useState<CardDesign>(initialDesign);
  const [saved, setSaved] = useState<CardDesign>(initialDesign);
  const [format, setFormat] = useState<keyof typeof SIZES>("a4-4");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => JSON.stringify(design) !== JSON.stringify(saved), [design, saved]);
  const profile = layoutProfile(format as PrintLayout);
  const size = SIZES[format];
  const set = (patch: Partial<CardDesign>) => setDesign((d) => parseCardDesignSafe({ ...d, ...patch }));
  const setStub = (patch: Partial<CardDesign["stub"]>) => setDesign((d) => parseCardDesignSafe({ ...d, stub: { ...d.stub, ...patch } }));

  const save = () =>
    startTransition(async () => {
      const res = await saveCardDesign(eventId, design);
      if (res.success) {
        setSaved(res.design);
        setDesign(res.design);
        setMsg({ ok: true, text: "Modelo salvo. As próximas impressões já saem assim." });
      } else setMsg({ ok: false, text: res.error });
    });

  const field = (label: string, key: "when" | "place" | "cause", placeholder: string) => (
    <label className="block">
      <span className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">
        <span>{label} <span className="normal-case tracking-normal font-semibold text-slate-600">(opcional)</span></span>
        <span className="font-mono">{design[key].length}/{FIELD_LIMITS[key]}</span>
      </span>
      <input
        value={design[key]}
        maxLength={FIELD_LIMITS[key]}
        onChange={(e) => setDesign((d) => ({ ...d, [key]: e.target.value }))}
        onBlur={() => set({})}
        placeholder={placeholder}
        className="w-full bg-black border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none"
      />
    </label>
  );

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void, hint?: string) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-500" />
      <span>
        <span className="block text-sm font-bold text-slate-200">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-24 print:bg-white print:pb-0">
      <style dangerouslySetInnerHTML={{ __html: `${CARD_CSS}
        .sample{position:relative}
        .sample::after{content:"AMOSTRA";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 3.4em Arial;
          color:rgba(0,0,0,.07);transform:rotate(-28deg);pointer-events:none;letter-spacing:.1em}
        @media print{@page{margin:10mm;size:A4} *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}` }} />

      <header className="print:hidden sticky top-0 z-40 bg-[#0b0f14]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <Link href={`/dashboard/${eventId}`} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} /> Voltar ao evento
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()} className="flex items-center gap-2 text-sm font-bold bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition">
              <Printer size={16} /> Imprimir amostra
            </button>
            <button type="button" onClick={save} disabled={pending || !dirty}
              className="flex items-center gap-2 text-sm font-black bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-5 py-2 rounded-xl transition">
              <Check size={16} /> {pending ? "Salvando…" : dirty ? "Salvar modelo" : "Salvo"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 pt-8 grid lg:grid-cols-[22rem_1fr] gap-8 print:block print:p-0">
        {/* ── CONTROLES ── */}
        <section className="print:hidden space-y-7">
          <div>
            <h1 className="text-2xl font-black text-white">Modelo da cartela</h1>
            <p className="text-sm text-slate-500 mt-1">
              É só o desenho: trocar o modelo <strong className="text-slate-300">não exige gerar as cartelas de novo</strong>
              {cardCount === 0 ? " (e você pode escolher antes de gerar)." : "."}
            </p>
          </div>

          {msg && (
            <p className={`text-sm font-bold rounded-xl p-3 border ${msg.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>{msg.text}</p>
          )}

          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Como vai imprimir?</p>
            <div className="grid grid-cols-2 gap-2">
              {([["color", "Colorido", "gráfica ou impressora a cores"], ["bw", "Preto e branco", "copiadora, gasta pouca tinta"]] as const).map(([v, label, hint]) => (
                <button key={v} type="button" onClick={() => set({ mode: v })}
                  className={`text-left rounded-xl border p-3 transition ${design.mode === v ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-900 hover:border-slate-500"}`}>
                  <span className="block font-black text-sm text-white">{label}</span>
                  <span className="block text-[11px] text-slate-500">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={design.mode === "bw" ? "opacity-40" : ""}>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Tema</p>
            <div className="grid grid-cols-2 gap-2">
              {THEME_KEYS.map((k: CardTheme) => (
                <button key={k} type="button" disabled={design.mode === "bw"} onClick={() => set({ theme: k })}
                  className={`text-left rounded-xl border p-3 transition ${design.theme === k && design.mode === "color" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-900 hover:border-slate-500"}`}>
                  <span className="flex gap-0.5 mb-2">
                    {THEMES[k].letters.map((c, i) => <i key={i} className="block h-2 flex-1 rounded-sm" style={{ background: c }} />)}
                  </span>
                  <span className="block font-black text-sm text-white">{THEMES[k].label}</span>
                  <span className="block text-[11px] text-slate-500 leading-snug">{THEMES[k].description}</span>
                </button>
              ))}
            </div>
            {design.mode === "bw" && <p className="text-[11px] text-slate-500 mt-2">No preto e branco o tema não muda as cores.</p>}
          </div>

          <div className="space-y-3">
            {field("Data e hora", "when", "Sábado, 14 de junho · 19h")}
            {field("Local", "place", "Salão Paroquial")}
            {field("Para quê é a renda", "cause", "Renda para a reforma do telhado do salão")}
          </div>

          <div className="space-y-3">
            {toggle("Mostrar os prêmios", design.showPrizes, (v) => set({ showPrizes: v }), prizesText ? undefined : "Cadastre as rodadas e os prêmios no evento para aparecerem aqui")}
            {toggle("Mostrar os apoiadores", design.showSponsors, (v) => set({ showSponsors: v }), sponsors.length ? undefined : "Cadastre os patrocinadores no evento para aparecerem aqui")}
            {toggle("Canhoto destacável", design.stub.enabled, (v) => setStub({ enabled: v }), "Faixa para destacar, com nome e telefone de quem comprou")}
            {design.stub.enabled && (
              <div className="ml-8 space-y-2">
                {toggle("Campo Nome", design.stub.name, (v) => setStub({ name: v }))}
                {toggle("Campo Telefone", design.stub.phone, (v) => setStub({ phone: v }))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Ver a amostra no formato</p>
            <select value={format} onChange={(e) => setFormat(e.target.value as keyof typeof SIZES)}
              className="w-full bg-black border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none">
              {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {format === "a4-6" && <p className="text-[11px] text-amber-300 mt-2">Neste formato o espaço é pequeno: aparecem só o nome, o QR e os números.</p>}
          </div>
        </section>

        {/* ── AMOSTRA ── */}
        <section>
          <p className="print:hidden text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">Amostra ao vivo (números de exemplo)</p>
          <div className="flex flex-wrap gap-6 print:gap-4">
            {([["QUINA", "AB12CD"], ["FULL_HOUSE", "XY98ZT"]] as const).map(([kind, id]) => (
              <div key={kind} className="sample bg-white p-[3mm] border border-dashed border-slate-400" style={{ width: size.w, height: size.h, boxSizing: "content-box" }}>
                <CardFace
                  design={design}
                  kind={kind}
                  matrix={SAMPLE}
                  shortId={id}
                  qrCodeDataUrl={sampleQr}
                  eventName={eventName}
                  organization={organization}
                  sponsors={sponsors}
                  prizesText={prizesText}
                  compact={profile.compact}
                  scale={profile.scale}
                />
              </div>
            ))}
          </div>
          <p className="print:hidden text-xs text-slate-500 mt-5 max-w-xl">
            Dica: use <strong className="text-slate-300">Imprimir amostra</strong> para testar o papel e a tinta antes de imprimir tudo. Os números são de exemplo e
            a amostra sai marcada com “AMOSTRA”.
          </p>
        </section>
      </main>
    </div>
  );
}

// Mantém o que o organizador digita (inclusive espaço no meio da frase) mas nunca deixa o modelo ficar inválido.
function parseCardDesignSafe(d: CardDesign): CardDesign {
  const p = parseCardDesign(d);
  return { ...p, when: d.when.slice(0, FIELD_LIMITS.when), place: d.place.slice(0, FIELD_LIMITS.place), cause: d.cause.slice(0, FIELD_LIMITS.cause) };
}
