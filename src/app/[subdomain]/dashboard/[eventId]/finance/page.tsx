// src/app/[subdomain]/dashboard/[eventId]/finance/page.tsx
import { getEventFinanceStats } from '@/actions/finance';
import { FinanceCharts } from './FinanceCharts';
import { DollarSign, Wallet, TrendingUp } from 'lucide-react';

// Next.js 15/16 exige que a tipagem dos parâmetros de rotas dinâmicas seja tratada como Promise
type Params = Promise<{ subdomain: string; eventId: string }>;

interface PageProps {
  params: Params;
}

export default async function FinanceDashboardPage({ params }: PageProps) {
  // Resolução da Promise do layout/roteador antes de consumir os IDs
  const resolvedParams = await params;
  const stats = await getEventFinanceStats(resolvedParams.eventId);

  const formatRawCents = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  return (
    <div className="space-y-6 p-1 text-slate-100">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">Auditoria Financeira</h2>
        <p className="text-sm text-slate-400">Acompanhamento de fluxo de caixa operacional e performance em tempo de execução.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Receita Geral */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
            <TrendingUp size={20} />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Receita Bruta Total</h3>
          <p className="text-3xl font-black text-emerald-400 mt-3">
            {formatRawCents(stats.totalRevenue)}
          </p>
        </div>
        
        {/* Cards Dinâmicos por Método */}
        {stats.byMethod.map((method, idx) => (
          <div key={method.method || idx} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-slate-800 p-2 rounded-xl text-slate-400">
              {method.method?.toUpperCase() === 'PIX' ? <Wallet size={20} /> : <DollarSign size={20} />}
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Vendas via {method.method || 'Outros'}
            </h3>
            <p className="text-2xl font-bold text-slate-100 mt-3">
              {formatRawCents(method.total)}
            </p>
          </div>
        ))}
      </div>

      {/* Seção de Gráficos de Alta Performance */}
      <FinanceCharts 
        byMethod={stats.byMethod} 
        operatorRanking={stats.operatorRanking} 
      />

      {/* Detalhamento do Ranking de Operadores */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-sm mt-6">
        <h3 className="font-bold text-slate-200 mb-4 text-base">Ranking Completo de Operadores (Sellers)</h3>
        {stats.operatorRanking.length === 0 ? (
          <p className="text-slate-500 italic text-sm text-center py-4">Nenhuma venda computada por operadores neste evento.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 w-16 text-center">Posição</th>
                  <th className="p-4">Operador</th>
                  <th className="p-4 text-center">Qtd. Vendas</th>
                  <th className="p-4 text-right">Total Arrecadado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {stats.operatorRanking.map((op, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-4 text-center font-bold text-slate-400">{idx + 1}º</td>
                    <td className="p-4 font-semibold text-slate-200">{op.name}</td>
                    <td className="p-4 text-center text-slate-400 font-mono">{op.count}</td>
                    <td className="p-4 text-right font-bold text-blue-400 font-mono">
                      {formatRawCents(op.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}