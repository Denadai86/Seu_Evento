"use client";

import { useEffect, useState } from "react";
import { getGlobalStats, resetUserPassword } from "@/actions/admin";
import { 
  Users, Calendar, Ticket, ShieldAlert, 
  Search, RefreshCcw, LayoutDashboard, Database 
} from "lucide-react";
import { Session } from "next-auth";

export default function AdminClient({ session }: { session: Session }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlobalStats().then(setStats).finally(() => setLoading(false));
  }, []);

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Resetar senha para 'mudar123'?")) return;
    const res = await resetUserPassword(userId);
    if (res.success) alert("Senha resetada com sucesso!");
  };

  if (loading) return <div className="p-20 text-center font-black text-emerald-500 animate-pulse">CARREGANDO PLATAFORMA...</div>;

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 p-8">
      
      {/* HEADER ADMIN */}
      <div className="max-w-7xl mx-auto mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">CONSOLE CENTRAL</h1>
          <p className="text-emerald-500 font-bold uppercase tracking-widest text-xs mt-1">Status Global do Seu Evento</p>
        </div>
        <div className="bg-emerald-950/30 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 text-xs font-mono">
          SISTEMA OPERACIONAL: ONLINE
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* KPI CARDS */}
        <StatCard icon={<Database />} label="Clientes (Tenants)" value={stats?.tenants} color="emerald" />
        <StatCard icon={<Calendar />} label="Eventos Totais" value={stats?.events} color="blue" />
        <StatCard icon={<Ticket />} label="Cartelas Geradas" value={stats?.cards} color="amber" />
        <StatCard icon={<Users />} label="Locutores" value={stats?.operators} color="purple" />

        {/* BENTO: GERENCIAMENTO DE CLIENTES */}
        <div className="md:col-span-3 bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="text-emerald-400" /> Clientes Ativos
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                placeholder="Buscar paróquia ou e-mail..."
                className="bg-black/40 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 transition-all w-64"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead className="bg-black/50 text-slate-500 text-xs uppercase font-black">
                <tr>
                  <th className="p-4">Subdomínio</th>
                  <th className="p-4">Dono</th>
                  <th className="p-4">Ações de Suporte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {/* Aqui você faria um map dos seus Tenants reais */}
                <tr className="hover:bg-emerald-500/5 transition-colors group">
                  <td className="p-4 font-bold text-white">sjose</td>
                  <td className="p-4 text-slate-400 text-sm">padre@igreja.com</td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => handleResetPassword("id-do-usuario")}
                      className="p-2 bg-slate-800 hover:bg-amber-900/30 text-amber-500 rounded-lg transition-all"
                      title="Resetar Senha"
                    >
                      <RefreshCcw size={18} />
                    </button>
                    <a 
                      href="https://sjose.acaoleve.com/dashboard" 
                      target="_blank"
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-lg text-xs font-black transition-all"
                    >
                      <LayoutDashboard size={16} /> ASSISTIR PAINEL
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* BENTO: ALERTAS DE SISTEMA */}
        <div className="bg-[#111827] border border-red-900/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6">
            <ShieldAlert className="text-red-500" /> Alertas
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-xs text-red-400">
              Nenhum erro crítico detectado nas últimas 24h.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    emerald: "text-emerald-400 bg-emerald-900/20",
    blue: "text-blue-400 bg-blue-900/20",
    amber: "text-amber-400 bg-amber-900/20",
    purple: "text-purple-400 bg-purple-900/20",
  };
  return (
    <div className="bg-[#111827] border border-slate-800 p-6 rounded-3xl shadow-xl">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}