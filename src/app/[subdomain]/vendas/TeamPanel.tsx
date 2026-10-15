// src/app/[subdomain]/vendas/TeamPanel.tsx
"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Users, X, Wallet, Ticket, Check, Ban, Send } from "lucide-react";
import { getPdvOverview, requestCards, respondToTransfer, cancelTransfer } from "@/actions/transfer";
import { undoLastSale } from "@/actions/venda";

type Overview = Extract<Awaited<ReturnType<typeof getPdvOverview>>, { success: true }>;

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const typeLabel = (t: string) => (t === "FULL_HOUSE" ? "cartela cheia" : "quina");
const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Aguardando", cls: "text-amber-400" },
  ACCEPTED: { label: "Aceito", cls: "text-emerald-400" },
  DECLINED: { label: "Recusado", cls: "text-red-400" },
  CANCELLED: { label: "Cancelado", cls: "text-slate-500" },
};

export default function TeamPanel({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  // formulário de pedido
  const [askFor, setAskFor] = useState<string | null>(null);
  const [qty, setQty] = useState(5);
  const [type, setType] = useState<"QUINA" | "FULL_HOUSE">("QUINA");
  // aceitar escolhendo os códigos
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [manualCodes, setManualCodes] = useState("");

  const load = useCallback(async () => {
    const res = await getPdvOverview(eventId);
    if (res.success) { setData(res); setLoadError(""); } else { setLoadError(res.error); }
  }, [eventId]);

  // Fica atualizando de fundo (o ponto vermelho avisa de pedido novo mesmo com o painel fechado)
  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [load]);

  const incomingCount = data?.incoming.length ?? 0;
  // Estoque baixo: já teve cartelas na mão e restam poucas (avisa para pedir mais a tempo)
  const LOW_STOCK = 5;
  const low = !!data && data.me.holding.total <= LOW_STOCK && data.me.holding.total + data.me.sold.qtd > 0;

  const undo = () => {
    if (!window.confirm("Desfazer a última venda? As cartelas voltam para a sua mão e o valor sai do caixa.")) return;
    startTransition(async () => {
      const res = await undoLastSale(eventId);
      setMessage(res.success ? { text: `Venda desfeita: ${res.count} cartela(s) voltaram para você.`, ok: true } : { text: res.error, ok: false });
      await load();
    });
  };

  const send = () => {
    if (!askFor) return;
    startTransition(async () => {
      const res = await requestCards(eventId, askFor, qty, type);
      if (res.success) { setMessage({ text: "Pedido enviado. Aguarde a resposta.", ok: true }); setAskFor(null); await load(); }
      else setMessage({ text: res.error, ok: false });
    });
  };

  const respond = (id: string, accept: boolean, codes?: string[]) => {
    startTransition(async () => {
      const res = await respondToTransfer(eventId, id, accept, codes);
      if (!res.success) return setMessage({ text: res.error, ok: false });
      if ("declined" in res) setMessage({ text: "Pedido recusado.", ok: true });
      else if ("codes" in res) setMessage({ text: `Entregue ${res.count} cartelas: de ${res.first} até ${res.last}. Separe exatamente essas da sua pilha.`, ok: true });
      setManualFor(null); setManualCodes("");
      await load();
    });
  };

  const cancel = (id: string) => {
    startTransition(async () => {
      const res = await cancelTransfer(eventId, id);
      if (!res.success) setMessage({ text: res.error, ok: false });
      await load();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setMessage(null); load(); }}
        className={`relative flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-bold transition ${
          low ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
        }`}
        aria-label="Meu caixa e equipe"
      >
        <Users size={14} /> {low && data ? `Restam ${data.me.holding.total}` : "Equipe"}
        {incomingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center animate-pulse">
            {incomingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-[#111827] border border-slate-700 w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Meu caixa e equipe</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-2 text-slate-400 hover:text-white" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            {loadError && <p className="text-sm text-red-400 mb-3">{loadError}</p>}
            {message && (
              <div className={`p-3 rounded-xl mb-4 text-sm font-bold ${message.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {message.text}
              </div>
            )}

            {!data ? (
              <p className="text-slate-500 text-sm">Carregando…</p>
            ) : (
              <div className="space-y-5">
                {low && data && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm font-bold">
                    Restam só {data.me.holding.total} cartela{data.me.holding.total === 1 ? "" : "s"} com você. Peça mais a um colega abaixo ou à tesouraria.
                  </div>
                )}

                {/* MEU CAIXA */}
                <section className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1 mb-1"><Wallet size={12} /> Vendi no caixa</p>
                    <p className="text-2xl font-black text-emerald-400">{brl(data.me.sold.total)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{data.me.sold.qtd} cartelas • PIX {brl(data.me.sold.pix)} • dinheiro {brl(data.me.sold.cash)}</p>
                  </div>
                  <div className="bg-black/40 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1 mb-1"><Ticket size={12} /> Comigo</p>
                    <p className="text-2xl font-black text-white">{data.me.holding.total}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {data.me.holding.quina} quina{data.me.holding.fullHouse > 0 ? ` • ${data.me.holding.fullHouse} cheia` : ""}
                    </p>
                  </div>
                </section>

                {data.me.lastSale && (
                  <section className="border border-slate-800 rounded-2xl p-4 bg-black/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Última venda</p>
                    <p className="text-sm text-slate-200">
                      {data.me.lastSale.count} cartela{data.me.lastSale.count === 1 ? "" : "s"} • {brl(data.me.lastSale.total)} •{" "}
                      {new Date(data.me.lastSale.at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 break-words mt-1">{data.me.lastSale.codes.join("  ")}</p>
                    {data.me.lastSale.canUndo ? (
                      <button type="button" disabled={isPending} onClick={undo}
                        className="mt-3 text-xs font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 disabled:opacity-50">
                        Errei: desfazer esta venda
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-2">Passaram mais de 10 minutos: para corrigir, fale com o administrador.</p>
                    )}
                  </section>
                )}

                {/* PEDIDOS PARA MIM */}
                {data.incoming.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-red-400 mb-2">Pedidos para você</h3>
                    <div className="space-y-3">
                      {data.incoming.map((t) => (
                        <div key={t.id} className="border border-red-500/40 bg-red-500/5 rounded-2xl p-4">
                          <p className="text-sm text-white font-bold">
                            {t.from} pede {t.quantity} cartela{t.quantity > 1 ? "s" : ""} de {typeLabel(t.type)}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Ao aceitar, o sistema separa as <strong>últimas {t.quantity}</strong> da sua pilha (maiores códigos). Entregue exatamente essas.
                          </p>
                          {manualFor === t.id ? (
                            <div className="mt-3 space-y-2">
                              <textarea
                                value={manualCodes}
                                onChange={(e) => setManualCodes(e.target.value)}
                                placeholder={`Digite os ${t.quantity} códigos que você está entregando`}
                                className="w-full h-20 bg-black border border-slate-700 rounded-xl p-3 font-mono text-xs text-white outline-none focus:border-emerald-500"
                              />
                              <div className="flex gap-2">
                                <button type="button" disabled={isPending} onClick={() => respond(t.id, true, manualCodes.split(/[\s,]+/).filter(Boolean))}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-sm disabled:opacity-50">Confirmar códigos</button>
                                <button type="button" onClick={() => setManualFor(null)} className="px-4 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold">Voltar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" disabled={isPending} onClick={() => respond(t.id, true)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-50"><Check size={16} /> Aceitar</button>
                              <button type="button" disabled={isPending} onClick={() => respond(t.id, false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-50"><Ban size={16} /> Recusar</button>
                              <button type="button" onClick={() => { setManualFor(t.id); setManualCodes(""); }}
                                className="w-full text-[11px] font-bold text-slate-400 hover:text-white underline underline-offset-2">Escolher os códigos que vou entregar</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* EQUIPE */}
                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Equipe — peça cartelas a quem tem sobrando</h3>
                  {data.team.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum outro voluntário neste evento.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.team.map((m) => (
                        <div key={m.id} className="border border-slate-800 rounded-xl p-3 bg-black/30">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{m.name}</p>
                              <p className="text-[11px] text-slate-500">{m.total} na mão ({m.quina} quina{m.fullHouse > 0 ? ` • ${m.fullHouse} cheia` : ""})</p>
                            </div>
                            <button type="button" disabled={m.total === 0}
                              onClick={() => { setAskFor(askFor === m.id ? null : m.id); setMessage(null); setQty(Math.min(5, m.total || 5)); setType(m.fullHouse > 0 && m.quina === 0 ? "FULL_HOUSE" : "QUINA"); }}
                              className="text-xs font-black bg-emerald-600/15 text-emerald-400 border border-emerald-600/30 px-3 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                              Pedir
                            </button>
                          </div>
                          {askFor === m.id && (
                            <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                {([["QUINA", "Quina"], ["FULL_HOUSE", "Cartela Cheia"]] as const).map(([v, l]) => (
                                  <button key={v} type="button" onClick={() => setType(v)}
                                    className={`py-2 rounded-lg text-xs font-black border ${type === v ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400"}`}>{l}</button>
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Number(e.target.value))}
                                  className="w-24 bg-black border border-slate-700 rounded-lg p-2 text-lg font-black text-white outline-none focus:border-emerald-500" />
                                <button type="button" disabled={isPending || qty < 1} onClick={send}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                  <Send size={14} /> Enviar pedido
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* MEUS PEDIDOS */}
                {data.outgoing.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Meus pedidos</h3>
                    <ul className="space-y-2">
                      {data.outgoing.map((t) => (
                        <li key={t.id} className="text-sm border border-slate-800 rounded-xl p-3 bg-black/30">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-200">{t.quantity} de {typeLabel(t.type)} → <strong>{t.to}</strong></span>
                            <span className={`text-xs font-black ${STATUS[t.status]?.cls}`}>{STATUS[t.status]?.label}</span>
                          </div>
                          {t.status === "ACCEPTED" && t.first && (
                            <p className="text-[11px] text-emerald-400 mt-1">
                              Você recebeu de <span className="font-mono">{t.first}</span> até <span className="font-mono">{t.last}</span>. Confira se as cartelas físicas batem.
                            </p>
                          )}
                          {t.status === "PENDING" && (
                            <button type="button" onClick={() => cancel(t.id)} className="text-[11px] font-bold text-slate-400 hover:text-red-400 underline underline-offset-2 mt-1">Cancelar pedido</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
