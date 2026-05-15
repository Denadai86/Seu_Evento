// src/app/[subdomain]/dashboard/[eventId]/FinancialDashboard.tsx

"use client";

import { Wallet, DollarSign, CreditCard, ArrowUpRight } from "lucide-react";

interface FinancialDashboardProps {
  report: {
    summary: { total: number; pix: number; cash: number; card: number };
    transactions: Array<{
      id: string;
      amount: number;
      method: "PIX" | "CASH" | "CARD";
      createdAt: Date;
      sellerName: string;
      cardId: string;
    }>;
  };
}

export default function FinancialDashboard({ report }: FinancialDashboardProps) {
  const { summary, transactions } = report;

  const methodLabels = { PIX: "PIX", CASH: "Dinheiro", CARD: "Cartão" };

  return (
    <div className="space-y-8">
      {/* 💳 SUB-CARDS DE MÉTODOS DE PAGAMENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* PIX */}
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Arrecadado via PIX</p>
            <p className="text-2xl font-black text-white mt-1">
              {summary.pix.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <ArrowUpRight size={20} />
          </div>
        </div>

        {/* CASH / DINHEIRO */}
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Dinheiro em Espécie</p>
            <p className="text-2xl font-black text-white mt-1">
              {summary.cash.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* CARD / CARTÃO */}
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Maquininha (Cartão)</p>
            <p className="text-2xl font-black text-white mt-1">
              {summary.card.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
        </div>
      </div>

      {/* 🧾 FLUXO DE CAIXA / EXTRATO RECENTE */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="text-violet-400" size={22} />
          <h3 className="text-lg font-black text-white">Extrato de Vendas em Tempo Real</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500 bg-black/20 font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Horário</th>
                <th className="py-3 px-4">Identificador</th>
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                    Nenhuma movimentação financeira registrada neste evento.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">
                      {new Date(tx.createdAt).toLocaleTimeString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {tx.cardId !== "N/A" ? `Cartela #${tx.cardId}` : "Entrada Geral"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-medium">{tx.sellerName}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300">
                        {methodLabels[tx.method]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400">
                      {tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}