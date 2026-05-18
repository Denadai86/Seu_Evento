// src/app/admin/AdminClient.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { getGodModeStats, getTenantsList, toggleTenantSuspension, createTenantExpress } from "@/actions/admin";
import { 
  Building, Users, Ticket, BadgeDollarSign, Target, 
  RefreshCcw, Power, Plus, ShieldCheck, ExternalLink, X, CalendarDays
} from "lucide-react";
import { Session } from "next-auth";

export default function AdminClient({ session }: { session: Session }) {
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Estado do Modal de Onboarding Expandido com Planos
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", subdomain: "", adminName: "", adminEmail: "", adminPass: "",
    planType: "SINGLE_EVENT" as "SINGLE_EVENT" | "ANNUAL", eventDate: "" 
  });

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

  // 🔥 CORREÇÃO DO STATUS: Atualização reativa na tela
  const handleToggleSuspension = async (tenantId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Suspender acesso deste cliente?" : "Reativar este cliente?")) return;
    
    startTransition(async () => {
      const res = await toggleTenantSuspension(tenantId, currentStatus);
      if (res.success) {
        // Altera o array local diretamente para dar feedback visual imediato
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, active: res.newStatus } : t));
      }
    });
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createTenantExpress(formData);
        alert("Ambiente do Cliente configurado e ativo com sucesso!");
        setShowModal(false);
        setFormData({ name: "", subdomain: "", adminName: "", adminEmail: "", adminPass: "", planType: "SINGLE_EVENT", eventDate: "" });
        loadData();
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  if (loading && !stats) return <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center text-emerald-500 font-bold animate-pulse">Iniciando God Mode...</div>;

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 p-8">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="text-emerald-500 w-8 h-8" /> 
            Ação Leve | Centro de Comando
          </h1>
          <p className="text-slate-400 mt-1">Sessão Master: {session.user.email}</p>
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
        {/* CARDS METRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<BadgeDollarSign size={24}/>} label="GMV Global" value={`R$ ${(stats.totalGMV / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2})}`} color="emerald" highlight />
          <StatCard icon={<Building size={24}/>} label="Clientes Ativos" value={stats.tenants} color="blue" />
          <StatCard icon={<Target size={24}/>} label="Eventos Criados" value={stats.events} color="purple" />
          <StatCard icon={<Ticket size={24}/>} label="Cartelas Geradas" value={stats.cards.toLocaleString('pt-BR')} color="amber" />
        </div>

        {/* TABELA DE GESTÃO */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-black text-white mb-6">Gestão de Contratos e Licenças</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="py-4 font-semibold">Cliente / Rota</th>
                  <th className="py-4 font-semibold">Plano / Expiração</th>
                  <th className="py-4 font-semibold text-center">Eventos</th>
                  <th className="py-4 font-semibold text-center">Status</th>
                  <th className="py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{tenant.name}</div>
                      <div className="text-xs text-slate-500">{tenant.subdomain}.acaoleve.com</div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${tenant.planType === 'ANNUAL' ? 'bg-purple-900/40 text-purple-400 border border-purple-800/30' : 'bg-blue-900/40 text-blue-400 border border-blue-800/30'}`}>
                        {tenant.planType === 'ANNUAL' ? 'ANUAL' : 'EVENTO ÚNICO'}
                      </span>
                      <div className="text-xs text-slate-400 mt-1">
                        Limite: {tenant.expiresAt ? new Date(tenant.expiresAt).toLocaleDateString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'Vitalício'}
                      </div>
                    </td>
                    <td className="py-4 text-center font-mono text-emerald-400">{tenant._count?.events || 0}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${tenant.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {tenant.active ? "ATIVO" : "SUSPENSO"}
                      </span>
                    </td>
                    <td className="py-4 text-right flex justify-end gap-2">
                      <a href={`http://${tenant.subdomain}.acaoleve.com/dashboard`} target="_blank" className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold transition flex items-center gap-1">
                        <ExternalLink size={14} /> ACESSAR
                      </a>
                      <button onClick={() => handleToggleSuspension(tenant.id, tenant.active)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${tenant.active ? 'bg-red-600/10 hover:bg-red-600/20 text-red-400' : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400'}`}>
                        <Power size={14} /> {tenant.active ? "SUSPENDER" : "REATIVAR"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CONFIGURAÇÃO EXPRESS COM REGRAS DE EXPIRAÇÃO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white mb-6">Novo Contratante</h2>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Nome do Bingo / Instituição</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Ex: Paróquia São José" />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Subdomínio do Sistema</label>
                <div className="flex bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <input type="text" required value={formData.subdomain} onChange={e => setFormData({...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} className="w-full bg-transparent border-none p-3 text-white outline-none text-sm" placeholder="saojose" />
                  <span className="flex items-center px-3 text-slate-500 bg-slate-800/50 text-xs">.acaoleve.com</span>
                </div>
              </div>

              {/* MODELO DE PLANO COM CÁLCULO DE TEMPO */}
              <div className="bg-black/20 border border-slate-800 p-4 rounded-xl space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Modelo de Licença / Contrato</label>
                  <select value={formData.planType} onChange={e => setFormData({...formData, planType: e.target.value as any})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 text-sm">
                    <option value="SINGLE_EVENT">Evento Único (+7 dias de gap para relatórios)</option>
                    <option value="ANNUAL">Plano Anual Livre (Eventos ilimitados por 1 ano)</option>
                  </select>
                </div>
                {formData.planType === "SINGLE_EVENT" && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1"><CalendarDays size={14}/> Data Prevista do Evento</label>
                    <input type="date" required={formData.planType === "SINGLE_EVENT"} value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 text-sm" />
                    <p className="text-[10px] text-slate-500 mt-1">O sistema bloqueará o cliente de forma automática 7 dias após essa data às 23:59h.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="text-xs text-slate-400 font-bold mb-1 block">Nome do Gestor (Dono)</label>
                <input type="text" required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white mb-3 text-sm" placeholder="Dono do Bingo" />
                <label className="text-xs text-slate-400 font-bold mb-1 block">E-mail de Login</label>
                <input type="email" required value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white mb-3 text-sm" placeholder="gestor@instituicao.com" />
                <label className="text-xs text-slate-400 font-bold mb-1 block">Senha Provisória (Mande por WhatsApp)</label>
                <input type="text" required value={formData.adminPass} onChange={e => setFormData({...formData, adminPass: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-white text-sm" placeholder="Crie uma senha inicial" />
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm transition">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50">
                  {isPending ? "Configurando..." : "Criar Licença"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, highlight = false }: any) {
  const colors: any = {
    emerald: "text-emerald-400 bg-emerald-900/20 border-emerald-900/30",
    blue: "text-blue-400 bg-blue-900/20 border-blue-900/30",
    amber: "text-amber-400 bg-amber-900/20 border-amber-900/30",
    purple: "text-purple-400 bg-purple-900/20 border-purple-900/30",
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