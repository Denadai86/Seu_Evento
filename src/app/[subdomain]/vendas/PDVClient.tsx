// src/app/[subdomain]/vendas/PDVClient.tsx
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { processBatchSale } from "@/actions/venda";
import { QrCode, Trash2, Banknote, CreditCard, UserCircle, X, Copy } from "lucide-react";
import QRCode from "react-qr-code";

interface Seller {
  id: string;
  name: string;
}

interface EventData {
  id: string;
  name: string;
  ticketPrice: number; // Em centavos
  pixKey: string;
  sellers: Seller[];
}

export default function PDVClient({ activeEvent }: { activeEvent: EventData | null }) {
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  
  const [cart, setCart] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPixModal, setShowPixModal] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-foco no campo de entrada
  useEffect(() => {
    if (selectedSeller && !showPixModal) {
      inputRef.current?.focus();
    }
  }, [selectedSeller, showPixModal]);

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
  const handleAddCard = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const id = inputValue.trim().toUpperCase();
    if (!id) return;

    if (cart.includes(id)) {
      alert("Esta cartela já está no carrinho!");
      return setInputValue("");
    }

    setCart([id, ...cart]);
    setInputValue("");
    setSuccessMessage("");
  };

  const handleRemoveCard = (idToRemove: string) => {
    setCart(cart.filter((id) => id !== idToRemove));
  };

  const executeSale = (method: "PIX" | "CASH") => {
    startTransition(async () => {
      const res = await processBatchSale(
        activeEvent.id,
        cart,
        method,
        selectedSeller
      );

      if (res.success) {
        setSuccessMessage(`✅ Venda de ${cart.length} cartela(s) concluída!`);
        setCart([]);
        setShowPixModal(false);
      } else {
        alert(res.error || "Erro ao processar venda");
      }
    });
  };

  const handleCheckoutClick = (method: "PIX" | "CASH") => {
    if (method === "PIX") {
      setShowPixModal(true);
    } else {
      executeSale("CASH");
    }
  };

  const cartTotalAmount = cart.length * (activeEvent.ticketPrice / 100);
  const sellerName = activeEvent.sellers.find((s) => s.id === selectedSeller)?.name;

  return (
    <div className="min-h-screen bg-[#0b0f14] flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-[#111827] border-b border-slate-800 p-4 flex justify-between items-center z-10">
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Operador</p>
          <p className="text-emerald-400 font-black">{sellerName}</p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedSeller("")}
          className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 transition"
          aria-label="Trocar operador"
        >
          Trocar
        </button>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex flex-col flex-1 max-w-md mx-auto w-full p-4 relative pt-6">
        {/* Adicionar Cartela */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">
            Adicionar Cartela
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
              type="submit"
              disabled={!inputValue.trim()}
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
              cart.map((id) => (
                <div
                  key={id}
                  className="bg-black/40 border border-slate-800 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-left-2"
                >
                  <span className="font-black text-slate-200 tracking-wider">{id}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCard(id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    aria-label={`Remover cartela ${id}`}
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 flex flex-col items-center relative shadow-2xl">
            <button
              type="button"
              onClick={() => setShowPixModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
              aria-label="Fechar modal"
            >
              <X size={24} />
            </button>

            <div className="bg-emerald-500/10 p-4 rounded-full mb-4">
              <QrCode size={32} className="text-emerald-400" />
            </div>

            <h2 className="text-white font-black text-2xl mb-1">Pagamento via PIX</h2>
            <p className="text-slate-400 text-sm mb-6 text-center">
              Peça para o cliente escanear o código abaixo
            </p>

            <div className="bg-white p-4 rounded-2xl mb-6">
              <QRCode value={activeEvent.pixKey} size={200} level="M" />
            </div>

            <div className="w-full bg-black/50 border border-slate-800 rounded-xl p-4 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Chave PIX</p>
              <div className="flex justify-between items-center">
                <p className="font-mono text-emerald-400 font-bold truncate pr-4">
                  {activeEvent.pixKey}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeEvent.pixKey);
                    alert("Chave PIX copiada!");
                  }}
                  className="text-slate-400 hover:text-white"
                  aria-label="Copiar chave PIX"
                >
                  <Copy size={18} />
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-end">
                <span className="text-slate-400 text-sm">Total a cobrar:</span>
                <span className="text-white font-black text-2xl">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cartTotalAmount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => executeSale("PIX")}
              disabled={isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              aria-label="Confirmar pagamento PIX"
            >
              {isPending ? "Confirmando..." : "Confirmar Pagamento Realizado"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}