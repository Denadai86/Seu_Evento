// src/app/[subdomain]/dashboard/[eventId]/finance/FinanceCharts.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Importação vital para tipar o Tooltip sem erros no TS
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { RefreshCw } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

interface PaymentMethodData {
  method: string;
  total: number;
}

interface OperatorRankingData {
  name: string;
  total: number;
  count: number;
}

interface Props {
  byMethod: PaymentMethodData[];
  operatorRanking: OperatorRankingData[];
}

export function FinanceCharts({ byMethod, operatorRanking }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tratamento matemático centralizado: divide centavos por 100 antes de formatar
  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value) / 100);
  };

  // Formatter tipado estritamente como o Recharts exige
  const tooltipFormatter = (
    value: ValueType | undefined,
    name: NameType | undefined,
  ) => {
    if (value === undefined) return ['R$ 0,00', name];
    return [formatCurrency(value as number), name];
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh(); // Revalida os Server Components de forma otimizada
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-medium border border-slate-700 transition disabled:opacity-50 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Atualizando caixa...' : 'Atualizar Dados'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Métodos de Pagamento */}
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-slate-200 mb-6 text-base">Receita por Método de Pagamento</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byMethod}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total"
                  nameKey="method"
                >
                  {byMethod.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  formatter={tooltipFormatter}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Ranking de Operadores */}
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-slate-200 mb-6 text-base">Top 5 Vendedores</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operatorRanking.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickFormatter={(val) => `R$ ${val / 100}`} 
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  width={90} 
                  tick={{ fontSize: 11 }} 
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  formatter={tooltipFormatter}
                />
                <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}