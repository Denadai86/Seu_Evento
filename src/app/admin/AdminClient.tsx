// src/app/admin/AdminClient.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { getGodModeStats, getTenantsList, toggleTenantSuspension, createTenantExpress } from "@/actions/admin";
import { 
  Building, Users, Ticket, ShieldAlert, BadgeDollarSign, Target, Mic, FileText,
  Search, RefreshCcw, LayoutDashboard, Power, Plus, ShieldCheck, ExternalLink
} from "lucide-react";
import { Session } from "next-auth";

export default function AdminClient({ session }: { session: Session }) {
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Estado do Modal de Onboarding
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", subdomain: "", adminName: "", adminEmail: "", adminPass: "" });

  const loadData = () => {
    setLoading(true);
    Promise.all([getGodModeStats(), getTenantsList()])
      .then(([statsData, tenantsData]) => {
        setStats(statsData);
        setTenants(tenantsData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleToggleSuspension = async (tenantId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Suspender acesso deste cliente?" : "Reativar este cliente?")) return;
    startTransition(async () => {
      await toggleTenantSuspension(tenantId, currentStatus);
      loadData();
    });
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createTenantExpress(formData);
        alert("Cliente criado com sucesso!");
        setShowModal(false);
        setFormData({ name: "", subdomain: "", adminName: "", adminEmail: "", adminPass: "" });
        loadData();
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  if (loading && !stats) return <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center text-emerald-500 font-bold animate-pulse">Iniciando God Mode...</div>;

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 p-8">
      
      {/* HEADER ADMIN */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="text-emerald-500 w-8 h-8" /> 
            Ação Leve | Centro de Comando
          </h1>
          <p className="text-slate-400 mt-1">Sessão Super Admin: {session.user.email}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-sm font-bold">
            <RefreshCcw size={16} /> ATUALIZAR
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-sm font-bold">
            <Plus size={16} /> NOVO CLIENTE
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* BENTO GRID: MÉTRICAS GOD MODE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<BadgeDollarSign size={24}/>} label="GMV Global (Transacionado)" value={`R$ ${(stats.totalGMV / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2})}`} color="emerald" highlight />
          <StatCard icon={<Building size={24}/>} label="Tenants (Clientes)" value={stats.tenants} color="blue" />
          <StatCard icon={<Target size={24}/>} label="Eventos Realizados" value={stats.events} color="purple" />
          <StatCard icon={<Ticket size={24}/>} label="Cartelas Geradas" value={stats.cards.toLocaleString('pt-BR')} color="amber" />
          
          <StatCard icon={<Users size={24}/>} label="Contratantes (Admins)" value={stats.roles.orgAdmins} color="slate" />
          <StatCard icon={<BadgeDollarSign size={24}/>} label="Vendedores de Pátio" value={stats.roles.operators} color="slate" />
          <StatCard icon={<ShieldCheck size={24}/>} label="Fiscais (Verifiers)" value={stats.roles.verifiers} color="slate" />
          <StatCard icon={<Mic size={24}/>} label="Locutores de Mesa" value={stats.roles.locutores} color="slate" />
        </div>

        {/* TABELA DE CLIENTES (TENANTS) */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-black text-white mb-6">Gestão de Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="py-4 font-semibold">Cliente (Subdomínio)</th>
                  <th className="py-4 font-semibold">Admin (E-mail)</th>
                  <th className="py-4 font-semibold text-center">Eventos</th>
                  <th className="py-4 font-semibold text-center">Status</th>
                  <th className="py-4 font-semibold text-right">Ações (God Mode)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{tenant.name}</div>
                      <div className="text-xs text-slate-500">{tenant.subdomain}.acaoleve.com</div>
                    </td>
                    <td className="py-4 text-slate-300">
                      {tenant.users[0]?.name || "N/A"}<br/>
                      <span className="text-xs text-slate-500">{tenant.users[0]?.email || ""}</span>
                    </td>
                    <td className="py-4 text-center font-mono text-emerald-400">{tenant._count.events}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${tenant.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {tenant.isActive ? "ATIVO" : "SUSPENSO"}
                      </span>
                    </td>
                    <td className="py-4 text-right flex justify-end gap-2">
                      <a 
                        href={`http://${tenant.subdomain}.acaoleve.com/dashboard`} 
                        target="_blank"
                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <ExternalLink size={14} /> ACESSAR
                      </a>
                      <button 
                        onClick={() => handleToggleSuspension(tenant.id, tenant.isActive)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${tenant.isActive ? 'bg-red-600/10 hover:bg-red-600/20 text-red-400' : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400'}`}
                      >
                        <Power size={14} /> {tenant.isActive ? "SUSPENDER" : "REATIVAR"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL ONBOARDING EXPRESS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-6">Novo Contratante</h2>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Nome do Bingo / Paróquia</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Bingo São João" />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Subdomínio (sem espaços)</label>
                <div className="flex bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <input type="text" required value={formData.subdomain} onChange={e => setFormData({...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} className="w-full bg-transparent border-none p-3 text-white outline-none" placeholder="saojoao" />
                  <span className="flex items-center px-3 text-slate-500 bg-slate-800/50 text-sm">.acaoleve.com</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <label className="text-xs text-slate-400 font-bold mb-1 block">Nome do Admin (Dono)</label>
                <input type="text" required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white mb-4 focus:ring-2 focus:ring-emerald-500" placeholder="João da Silva" />
                
                <label className="text-xs text-slate-400 font-bold mb-1 block">E-mail de Acesso</label>
                <input type="email" required value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white mb-4 focus:ring-2 focus:ring-emerald-500" placeholder="admin@saojoao.com" />
                
                <label className="text-xs text-slate-400 font-bold mb-1 block">Senha Inicial (Envie por WhatsApp)</label>
                <input type="text" required value={formData.adminPass} onChange={e => setFormData({...formData, adminPass: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500" placeholder="Senha segura" />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                  {isPending ? "Criando..." : "Criar Ambiente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTE DE CARD ESTILIZADO
function StatCard({ icon, label, value, color, highlight = false }: any) {
  const colors: any = {
    emerald: "text-emerald-400 bg-emerald-900/20 border-emerald-900/30",
    blue: "text-blue-400 bg-blue-900/20 border-blue-900/30",
    amber: "text-amber-400 bg-amber-900/20 border-amber-900/30",
    purple: "text-purple-400 bg-purple-900/20 border-purple-900/30",
    slate: "text-slate-400 bg-slate-800/30 border-slate-800/50",
  };

  return (
    <div className={`p-6 rounded-3xl border ${colors[color]} ${highlight ? 'ring-1 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : ''}`}>
      <div className="flex items-center gap-3 mb-4 opacity-80">
        {icon}
        <h3 className="text-sm font-semibold uppercase tracking-wider">{label}</h3>
      </div>
      <p className={`text-3xl font-black ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}