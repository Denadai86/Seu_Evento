// src/app/[subdomain]/vendas/PDVClient.tsx
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { processBatchSale, lookupCardForSale, undoLastSale } from "@/actions/venda";
import { QrCode, Trash2, Banknote, CreditCard, UserCircle, X, Copy, Camera } from "lucide-react";
import QRCode from "react-qr-code";
import TeamPanel from "./TeamPanel";
import HelpButton from "@/components/manual/HelpButton";
import { generatePixPayload } from "@/lib/pix";
import PdvScanner from "./PdvScanner";
import { UNDO_WINDOW_MS } from "@/lib/saleRules";

// Cada item do carrinho já traz o TIPO e o PREÇO (a cartela cheia custa diferente da quina).
// O preço mostrado aqui é só para o caixa conferir: o servidor recalcula tudo na hora de cobrar.
type CartItem = { id: string; type: "QUINA" | "FULL_HOUSE" | null; price: number };

interface Seller {
  id: string;
  name: string;
}

interface EventData {
  id: string;
  name: string;
  ticketPrice: number; // Em centavos
  tierName?: string | null; // fase de preço vigente (definida pelo admin)
  meStaffId?: string | null; // o voluntário LOGADO (vem da sessão no servidor)
  initialCard?: string | null; // cartela a colocar no carrinho ao abrir (vem do Verificador)
  pixKey: string;
  merchantName?: string; // nome da organização (vai no código PIX)
  sellers: Seller[];
}

export default function PDVClient({ activeEvent }: { activeEvent: EventData | null }) {
  const [selectedSeller, setSelectedSeller] = useState<string>(activeEvent?.meStaffId ?? "");
  const [isPending, startTransition] = useTransition();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastSaleAt, setLastSaleAt] = useState<number | null>(null);
  const cartRef = useRef<CartItem[]>([]);
  cartRef.current = cart;
  const [inputValue, setInputValue] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPixModal, setShowPixModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const preloaded = useRef(false);

  // Auto-foco no campo de entrada
  useEffect(() => {
    if (selectedSeller && !showPixModal) {
      inputRef.current?.focus();
    }
  }, [selectedSeller, showPixModal]);

  // Chegou pelo "Regularizar agora" do Verificador: coloca a cartela no carrinho (uma vez só).
  useEffect(() => {
    if (preloaded.current || !activeEvent?.initialCard || !selectedSeller) return;
    preloaded.current = true;
    addById(activeEvent.initialCard).then((err) => {
      if (err) alert(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeller]);

  if (!activeEvent) {
    return <div className="p-10 text-center text-white">Nenhum evento ativo.</div>;
  }

  // ====================== TELA DE SELEÇÃO DE VENDEDOR ======================
  if (!selectedSeller) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex flex-col p-6 animate-in fade-in">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <UserCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white">Frente de Caixa</h1>
            <p className="text-slate-400 text-sm mt-2">Identifique-se para iniciar</p>
          </div>

          <div className="space-y-3">
            {activeEvent.sellers.map((seller) => (
              <button
                key={seller.id}
                type="button"
                onClick={() => setSelectedSeller(seller.id)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"
                aria-label={`Entrar como ${seller.name}`}
              >
                {seller.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ====================== LÓGICA DO PDV ======================
  // Coloca UMA cartela no carrinho pelo código (digitado ou lido pela câmera).
  // Devolve null se deu certo, ou a mensagem de erro (inexistente, já vendida, bloqueada…).
  const addById = async (rawId: string): Promise<string | null> => {
    const id = rawId.trim().toUpperCase();
    if (!id || !activeEvent) return null;
    if (cartRef.current.some((item) => item.id === id)) return "Esta cartela já está no carrinho!";

    const res = await lookupCardForSale(activeEvent.id, id);
    if (!res.success) return res.error || "Não foi possível consultar a cartela.";

    setCart((current) =>
      current.some((item) => item.id === res.shortId)
        ? current
        : [{ id: res.shortId!, type: res.type ?? null, price: res.price! }, ...current]
    );
    setSuccessMessage("");
    return null;
  };

  const handleAddCard = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (isLookingUp || !inputValue.trim()) return;
    setIsLookingUp(true);
    const error = await addById(inputValue);
    setIsLookingUp(false);
    if (error) alert(error);
    setInputValue("");
  };

  const handleUndo = () => {
    if (!activeEvent) return;
    if (!window.confirm("Desfazer a última venda? As cartelas voltam para a sua mão e o valor sai do caixa.")) return;
    startTransition(async () => {
      const res = await undoLastSale(activeEvent.id);
      if (res.success) {
        setSuccessMessage(`↩️ Venda desfeita: ${res.count} cartela(s) voltaram para você.`);
        setLastSaleAt(null);
      } else {
        alert(res.error);
      }
    });
  };

  const handleRemoveCard = (idToRemove: string) => {
    setCart(cart.filter((item) => item.id !== idToRemove));
  };

  const executeSale = (method: "PIX" | "CASH") => {
    startTransition(async () => {
      const res = await processBatchSale(
        activeEvent.id,
        cart.map((item) => item.id),
        method,
        selectedSeller,
        Math.round(cartTotalAmount * 100) // total que o caixa está vendo: o servidor recusa se a fase de preço mudou
      );

      if (res.success) {
        setSuccessMessage(`✅ Venda de ${cart.length} cartela(s) concluída!`);
        setLastSaleAt(Date.now());
        setCart([]);
        setShowPixModal(false);
      } else {
        alert(res.error || "Erro ao processar venda");
        // A fase de preço virou no meio da venda: reconsulta cada cartela para mostrar o valor atual.
        if ("priceChanged" in res && res.priceChanged) {
          const refreshed: CartItem[] = [];
          for (const item of cart) {
            const r = await lookupCardForSale(activeEvent.id, item.id);
            if (r.success) refreshed.push({ id: r.shortId!, type: r.type ?? null, price: r.price! });
          }
          setCart(refreshed);
          setShowPixModal(false);
        }
      }
    });
  };

  const handleCheckoutClick = (method: "PIX" | "CASH") => {
    // Segurança extra: alguns navegadores restauram o botão "habilitado" depois de recarregar a página.
    if (cart.length === 0 || isPending) return;
    if (method === "PIX") {
      setShowPixModal(true);
    } else {
      executeSale("CASH");
    }
  };

  const cartTotalAmount = cart.reduce((sum, item) => sum + item.price, 0) / 100;
  const brlTotal = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cartTotalAmount);

  // Código PIX "copia e cola" (BR Code) com o VALOR da venda já preenchido: o cliente escaneia e só confirma no banco.
  // Sem chave PIX cadastrada não dá para gerar nada (e o QR vazio quebrava a tela).
  const pixKey = (activeEvent.pixKey ?? "").trim();
  const pixPayload = showPixModal && pixKey ? generatePixPayload(pixKey, activeEvent.merchantName || "Seu Evento", "BRASIL", cartTotalAmount) : "";

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copie o texto abaixo:", text);
    }
  };
  const sellerName = activeEvent.sellers.find((s) => s.id === selectedSeller)?.name;

  return (
    <div className="min-h-screen bg-[#0b0f14] flex flex-col font-sans">
      {showScanner && <PdvScanner onCode={addById} onClose={() => setShowScanner(false)} />}

      {/* HEADER */}
      <header className="bg-[#111827] border-b border-slate-800 p-4 flex justify-between items-center z-10">
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Operador</p>
          <p className="text-emerald-400 font-black">{sellerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton topicId="pdv-vender" label="Ajuda" />
          <TeamPanel eventId={activeEvent.id} />
          {/* Voluntário logado já entra como ele mesmo: "Trocar" só existe para quem não é vendedor da escala */}
          {!activeEvent.meStaffId && (
            <button
              type="button"
              onClick={() => setSelectedSeller("")}
              className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 transition"
              aria-label="Trocar operador"
            >
              Trocar
            </button>
          )}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex flex-col flex-1 max-w-md mx-auto w-full p-4 relative pt-6">
        {/* Adicionar Cartela */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">
            Adicionar Cartela
            {activeEvent.tierName && (
              <span className="ml-2 normal-case tracking-normal text-emerald-400">• preço: {activeEvent.tierName}</span>
            )}
          </label>
          <form onSubmit={handleAddCard} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="ID da Cartela (ex: A9B2)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-black/50 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-white uppercase outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl transition-colors shrink-0"
              aria-label="Ler QR da cartela com a câmera"
              title="Ler QR com a câmera"
            >
              <Camera size={20} />
            </button>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLookingUp}
              className="bg-emerald-600 disabled:bg-slate-800 text-white font-bold px-5 rounded-xl transition-colors shrink-0 text-xl"
              aria-label="Adicionar cartela"
            >
              +
            </button>
          </form>
        </div>

        {/* Mensagem de Sucesso */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl mb-4 text-center font-bold text-sm animate-in fade-in">
            {successMessage}
            {lastSaleAt !== null && Date.now() - lastSaleAt < UNDO_WINDOW_MS && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={isPending}
                className="block mx-auto mt-3 text-xs font-bold text-slate-300 hover:text-white underline underline-offset-2 disabled:opacity-50"
              >
                Errei: desfazer esta venda
              </button>
            )}
          </div>
        )}

        {/* Carrinho */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 flex flex-col mb-40 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-400">Na Mão (Pendentes)</h2>
            <div className="text-right">
              <span className="text-white font-black text-lg mr-2">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cartTotalAmount)}
              </span>
              <span className="bg-slate-800 text-emerald-400 text-xs font-black px-2 py-1 rounded-md">
                {cart.length} itens
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50">
                <QrCode size={40} className="mb-2" />
                <p className="text-sm font-bold">Carrinho vazio</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-black/40 border border-slate-800 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-left-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-black text-slate-200 tracking-wider">{item.id}</span>
                    {item.type === "FULL_HOUSE" && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                        Cheia
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-500">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.price / 100)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCard(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    aria-label={`Remover cartela ${item.id}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botões de Pagamento */}
        <div className="fixed bottom-16 left-0 w-full bg-slate-900 border-t border-slate-800 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40">
          <div className="max-w-md mx-auto flex gap-3">
            <button
              type="button"
              onClick={() => handleCheckoutClick("CASH")}
              disabled={cart.length === 0 || isPending}
              suppressHydrationWarning
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white font-black py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
              aria-label="Finalizar venda em dinheiro"
            >
              <Banknote size={24} />
              <span className="text-[11px] uppercase tracking-widest">Dinheiro</span>
            </button>

            <button
              type="button"
              onClick={() => handleCheckoutClick("PIX")}
              disabled={cart.length === 0 || isPending}
              suppressHydrationWarning
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-black py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-emerald-900/20"
              aria-label="Finalizar venda via PIX"
            >
              <CreditCard size={24} />
              <span className="text-[11px] uppercase tracking-widest">PIX</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====================== MODAL PIX ====================== */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-slate-900 border border-slate-700 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[94dvh] shadow-2xl">
            {/* Topo: título e total, sempre visíveis */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-white font-black text-xl">Pagamento via PIX</h2>
                <p className="text-slate-400 text-xs mt-0.5">Total a cobrar</p>
                <p className="text-emerald-400 font-black text-3xl leading-tight">{brlTotal}</p>
              </div>
              <button type="button" onClick={() => setShowPixModal(false)} className="p-2 -mr-2 text-slate-500 hover:text-white" aria-label="Fechar modal">
                <X size={24} />
              </button>
            </div>

            {/* Meio: QR e chave (rola se a tela for baixa) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center">
              {pixPayload ? (
                <>
                  <div className="bg-white p-3 rounded-2xl mb-3">
                    <QRCode value={pixPayload} size={184} level="M" />
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 text-center">
                    O cliente abre o app do banco, escolhe Pix e lê o QR Code. O valor já vem preenchido.
                  </p>
                  <div className="w-full grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => copyText(pixPayload, "payload")}
                      className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition">
                      <Copy size={14} /> {copied === "payload" ? "Copiado!" : "Copia e cola"}
                    </button>
                    <button type="button" onClick={() => copyText(pixKey, "key")}
                      className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition">
                      <Copy size={14} /> {copied === "key" ? "Copiada!" : "Copiar chave"}
                    </button>
                  </div>
                  <p className="w-full mt-3 font-mono text-xs text-slate-500 truncate">Chave: {pixKey}</p>
                </>
              ) : (
                <div className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="font-bold mb-1">Este evento ainda não tem chave PIX.</p>
                  <p className="text-amber-200/80 text-xs">
                    Peça ao administrador para cadastrá-la no evento (campo Chave PIX do Recebedor). Enquanto isso, só confirme se o cliente pagou de um jeito que você conseguiu conferir.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé fixo: o botão de confirmar NUNCA fica escondido */}
            <div className="px-6 pt-3 border-t border-slate-800 shrink-0" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              <p className="text-[11px] text-amber-300/90 text-center mb-2">Só confirme depois de ver o dinheiro na conta, no aplicativo do banco.</p>
              <button
                type="button"
                onClick={() => executeSale("PIX")}
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                aria-label="Confirmar pagamento PIX"
              >
                {isPending ? "Confirmando..." : "Confirmar Pagamento Realizado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
