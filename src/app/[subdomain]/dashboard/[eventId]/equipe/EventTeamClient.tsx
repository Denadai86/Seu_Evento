// src/app/[subdomain]/dashboard/[eventId]/equipe/EventTeamClient.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Search, UserMinus, UserPlus, Users, X } from "lucide-react";
import { copyEventTeam, createTenantStaff, resetGlobalStaffPin, toggleStaffInEvent } from "@/actions/equipe-global";
import { normalizeText } from "@/lib/manual/search";

type PermKey = "canSell" | "canOperate" | "canVerify" | "canTreasury" | "canAudit";
type Perms = Record<PermKey, boolean>;
type Member = { userId: string; name: string; username: string } & Perms;
type Person = { id: string; name: string; username: string };
type OtherEvent = { id: string; name: string; count: number };

const PERMS: { key: PermKey; label: string; hint: string }[] = [
  { key: "canSell", label: "Vender (PDV)", hint: "Caixa de vendas e pedido de cartelas a colegas" },
  { key: "canOperate", label: "Palco", hint: "Sorteia as pedras e solta o bingo no telão" },
  { key: "canVerify", label: "Fiscal", hint: "Confere a cartela de quem gritou bingo" },
  { key: "canTreasury", label: "Tesouraria", hint: "Entrega, recolhe e recebe cartelas; bloqueia cartela perdida" },
  { key: "canAudit", label: "Conselho", hint: "Só leitura: painel, relatórios e auditoria" },
];

const NO_PERMS: Perms = { canSell: false, canOperate: false, canVerify: false, canTreasury: false, canAudit: false };
const pickPerms = (m: Perms): Perms => ({
  canSell: m.canSell, canOperate: m.canOperate, canVerify: m.canVerify, canTreasury: m.canTreasury, canAudit: m.canAudit,
});
const hasAny = (p: Perms) => PERMS.some((x) => p[x.key]);

function PermChips({ value, onToggle, disabled }: { value: Perms; onToggle: (k: PermKey) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PERMS.map((p) => (
        <button
          key={p.key}
          type="button"
          title={p.hint}
          disabled={disabled}
          aria-pressed={value[p.key]}
          onClick={() => onToggle(p.key)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition disabled:opacity-50 ${
            value[p.key]
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function EventTeamClient({
  eventId,
  members: initialMembers,
  available: initialAvailable,
  otherEvents,
}: {
  eventId: string;
  members: Member[];
  available: Person[];
  otherEvents: OtherEvent[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [members, setMembers] = useState(initialMembers);
  const [available, setAvailable] = useState(initialAvailable);
  useEffect(() => setMembers(initialMembers), [initialMembers]);
  useEffect(() => setAvailable(initialAvailable), [initialAvailable]);

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; username: string; pin: string; reset: boolean } | null>(null);

  // permissões escolhidas ANTES de adicionar uma pessoa (padrão: só vender)
  const [draft, setDraft] = useState<Record<string, Perms>>({});
  const draftOf = (id: string): Perms => draft[id] ?? { ...NO_PERMS, canSell: true };

  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<Perms>({ ...NO_PERMS, canSell: true });
  const [copyFrom, setCopyFrom] = useState(otherEvents.find((e) => e.count > 0)?.id ?? otherEvents[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return available;
    return available.filter((p) => normalizeText(`${p.name} ${p.username}`).includes(q));
  }, [available, query]);

  const counts = useMemo(
    () => PERMS.map((p) => ({ ...p, n: members.filter((m) => m[p.key]).length })),
    [members]
  );

  const notify = (text: string, ok = true) => setMsg({ text, ok });

  // ── mudar a permissão de quem já está no evento ──
  const togglePerm = (m: Member, key: PermKey) => {
    const next = { ...pickPerms(m), [key]: !m[key] };
    startTransition(async () => {
      const res = await toggleStaffInEvent(m.userId, eventId, true, next);
      if (res.success) {
        setMembers((cur) => cur.map((x) => (x.userId === m.userId ? { ...x, ...next } : x)));
        setMsg(null);
      } else notify(res.error ?? "Não foi possível alterar a permissão.", false);
    });
  };

  // ── tirar do evento (a pessoa continua cadastrada na Central) ──
  const removeMember = (m: Member) => {
    if (!window.confirm(`Tirar ${m.name} deste evento? Ela continua cadastrada e pode voltar quando quiser.`)) return;
    startTransition(async () => {
      const res = await toggleStaffInEvent(m.userId, eventId, false, NO_PERMS);
      if (res.success) {
        setMembers((cur) => cur.filter((x) => x.userId !== m.userId));
        setAvailable((cur) => [...cur, { id: m.userId, name: m.name, username: m.username }].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        notify(`${m.name} saiu do evento.`);
      } else notify(res.error ?? "Não foi possível remover.", false);
    });
  };

  // ── colocar no evento alguém que já está cadastrado ──
  const addPerson = (p: Person) => {
    const perms = draftOf(p.id);
    startTransition(async () => {
      const res = await toggleStaffInEvent(p.id, eventId, true, perms);
      if (res.success) {
        setAvailable((cur) => cur.filter((x) => x.id !== p.id));
        setMembers((cur) => [...cur, { userId: p.id, name: p.name, username: p.username, ...perms }].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        notify(`${p.name} entrou no evento.`);
        router.refresh();
      } else notify(res.error ?? "Não foi possível adicionar.", false);
    });
  };

  // ── cadastrar alguém novo e já colocar neste evento ──
  const createAndAdd = () => {
    const name = newName.trim();
    if (name.length < 2) return notify("Digite o nome da pessoa.", false);
    startTransition(async () => {
      const created = await createTenantStaff(name);
      if (!created.success || !created.userId) return notify(created.error ?? "Não foi possível cadastrar.", false);
      const res = await toggleStaffInEvent(created.userId, eventId, true, newPerms);
      if (!res.success) notify(res.error ?? "Cadastrou, mas não conseguiu colocar no evento.", false);
      setCredentials({ name, username: created.username ?? "", pin: created.pin ?? "", reset: false });
      setNewName("");
      setShowNew(false);
      router.refresh();
    });
  };

  const resetPin = (m: Member) => {
    if (!window.confirm(`Gerar um novo PIN para ${m.name}? O PIN atual deixa de funcionar na hora.`)) return;
    startTransition(async () => {
      const res = await resetGlobalStaffPin(m.userId);
      if (res.success && res.newPin) setCredentials({ name: m.name, username: res.username ?? m.username, pin: res.newPin, reset: true });
      else notify(res.error ?? "Não foi possível redefinir o PIN.", false);
    });
  };

  // ── trazer a equipe de outro evento ──
  const copyTeam = () => {
    const from = otherEvents.find((e) => e.id === copyFrom);
    if (!from) return;
    if (!window.confirm(`Trazer a equipe de "${from.name}" para este evento, com as mesmas permissões? Quem já está aqui não muda.`)) return;
    startTransition(async () => {
      const res = await copyEventTeam(copyFrom, eventId);
      if (res.success) {
        notify(
          res.added === 0
            ? "Ninguém novo para trazer: todos já estavam neste evento."
            : `${res.added} pessoa${res.added === 1 ? "" : "s"} trazida${res.added === 1 ? "" : "s"}${res.skipped ? ` (${res.skipped} já estava${res.skipped === 1 ? "" : "m"} aqui)` : ""}.`
        );
        router.refresh();
      } else notify(res.error ?? "Não foi possível copiar a equipe.", false);
    });
  };

  return (
    <div className="space-y-10">
      {msg && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 p-4 rounded-2xl text-sm font-bold border ${
            msg.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Fechar aviso" className="opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {/* RESUMO */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Users size={12} /> Pessoas</p>
          <p className="text-3xl font-black text-white">{members.length}</p>
        </div>
        {counts.map((c) => (
          <div key={c.key} className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{c.label}</p>
            <p className="text-3xl font-black text-white">{c.n}</p>
          </div>
        ))}
      </section>

      {/* QUEM TRABALHA NESTE EVENTO */}
      <section>
        <h2 className="text-lg font-black text-white mb-1">Quem trabalha neste evento</h2>
        <p className="text-xs text-slate-500 mb-4">Toque nas etiquetas para ligar ou desligar a permissão. Vale só para este evento.</p>

        {members.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center text-slate-500 text-sm">
            Ninguém na equipe deste evento ainda. Adicione pessoas abaixo ou traga a equipe de outro evento.
          </div>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.userId} className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-black text-white truncate">{m.name}</p>
                    <p className="text-xs font-mono text-slate-500">@{m.username}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => resetPin(m)} disabled={isPending} title="Gerar novo PIN"
                      className="p-2 rounded-lg text-slate-500 hover:text-amber-300 hover:bg-slate-800 transition disabled:opacity-50"><KeyRound size={16} /></button>
                    <button type="button" onClick={() => removeMember(m)} disabled={isPending} title="Tirar do evento"
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition disabled:opacity-50"><UserMinus size={16} /></button>
                  </div>
                </div>
                <PermChips value={pickPerms(m)} onToggle={(k) => togglePerm(m, k)} disabled={isPending} />
                {!hasAny(pickPerms(m)) && (
                  <p className="text-[11px] text-amber-300 mt-2">Sem nenhuma permissão: esta pessoa entra no sistema, mas não consegue fazer nada neste evento.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ADICIONAR */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-white">Adicionar pessoas</h2>
            <p className="text-xs text-slate-500">Voluntários já cadastrados que ainda não estão neste evento.</p>
          </div>
          <button type="button" onClick={() => setShowNew((v) => !v)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition">
            <UserPlus size={16} /> Novo voluntário
          </button>
        </div>

        {showNew && (
          <div className="mb-5 rounded-2xl border border-blue-700/40 bg-blue-500/5 p-5 space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Nome completo</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Maria da Silva"
                className="w-full bg-black border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">O que ela vai fazer neste evento</p>
              <PermChips value={newPerms} onToggle={(k) => setNewPerms((p) => ({ ...p, [k]: !p[k] }))} />
            </div>
            <button type="button" onClick={createAndAdd} disabled={isPending || newName.trim().length < 2}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-3 rounded-xl transition disabled:opacity-50">
              {isPending ? "Criando..." : "Cadastrar e colocar no evento"}
            </button>
            <p className="text-[11px] text-slate-500">O sistema gera o usuário e o PIN. Anote antes de fechar: o PIN aparece uma única vez.</p>
          </div>
        )}

        {available.length > 6 && (
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pelo nome ou usuário…"
              className="w-full bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none" />
          </div>
        )}

        {available.length === 0 ? (
          <p className="text-sm text-slate-500 border border-dashed border-slate-700 rounded-2xl p-5">
            Todos os voluntários cadastrados já estão neste evento. Use <strong className="text-slate-300">Novo voluntário</strong> para cadastrar mais.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">Ninguém com esse nome.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((p) => (
              <li key={p.id} className="bg-[#0f1520] border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{p.name}</p>
                    <p className="text-xs font-mono text-slate-500">@{p.username}</p>
                  </div>
                  <button type="button" onClick={() => addPerson(p)} disabled={isPending || !hasAny(draftOf(p.id))}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-4 py-2 rounded-xl transition disabled:opacity-40">
                    Adicionar
                  </button>
                </div>
                <PermChips value={draftOf(p.id)} onToggle={(k) => setDraft((d) => ({ ...d, [p.id]: { ...draftOf(p.id), [k]: !draftOf(p.id)[k] } }))} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* COPIAR DE OUTRO EVENTO */}
      {otherEvents.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-[#111827] p-6">
          <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2"><Copy size={18} /> Trazer a equipe de outro evento</h2>
          <p className="text-xs text-slate-500 mb-4">
            Monta a equipe de uma vez, com as mesmas permissões. Quem já está neste evento não é alterado, e depois você ajusta o que precisar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}
              className="flex-1 bg-black border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500">
              {otherEvents.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.count} pessoa{e.count === 1 ? "" : "s"})</option>
              ))}
            </select>
            <button type="button" onClick={copyTeam} disabled={isPending || !copyFrom}
              className="bg-slate-700 hover:bg-slate-600 text-white font-black px-5 py-3 rounded-xl transition disabled:opacity-50">
              Trazer equipe
            </button>
          </div>
        </section>
      )}

      {/* LEGENDA */}
      <section className="text-xs text-slate-500 border-t border-slate-800 pt-6">
        <p className="font-black uppercase tracking-widest text-slate-600 mb-2">O que cada permissão libera</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {PERMS.map((p) => (
            <li key={p.key}><strong className="text-slate-400">{p.label}:</strong> {p.hint}</li>
          ))}
        </ul>
      </section>

      {/* CREDENCIAIS (aparecem uma única vez) */}
      {credentials && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl p-7 w-full max-w-sm text-center">
            <h3 className="text-2xl font-black text-white mb-1">{credentials.reset ? "Novo PIN gerado" : "Credenciais geradas!"}</h3>
            <p className="text-slate-400 text-sm mb-5">{credentials.name}</p>
            <div className="bg-black/50 border border-slate-800 rounded-2xl p-4 mb-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Usuário</p>
              <p className="font-mono text-xl font-black text-emerald-400">{credentials.username}</p>
            </div>
            <div className="bg-black/50 border border-slate-800 rounded-2xl p-4 mb-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">PIN (6 dígitos)</p>
              <p className="font-mono text-3xl font-black text-white tracking-[0.3em]">{credentials.pin}</p>
            </div>
            <p className="text-xs text-amber-300 mb-5">Anote agora: o PIN não aparece de novo. Se perder, gere outro.</p>
            <button type="button" onClick={() => setCredentials(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3.5 rounded-2xl font-black text-white">
              Anotei, fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
