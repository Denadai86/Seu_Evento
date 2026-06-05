// src/app/admin/AdminClient.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link"; // 🔥 Adicionado o import do Link
import { 
  getGodModeStats, 
  getTenantsList, 
  toggleTenantSuspension, 
  createTenantExpress,
  resetTenantAdminPassword,
  getImpersonationToken
} from "@/actions/admin";
import { 
  Building, Users, Ticket, BadgeDollarSign, Target, 
  RefreshCcw, Power, Plus, ShieldCheck, ExternalLink, X, CalendarDays,
  Key, Copy, Eye, AlertOctagon // 🔥 Adicionado o AlertOctagon
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

  // Estado do Modal de Nova Senha Gerada
  const [passwordModal, setPasswordModal] = useState<{name: string, email: string, pass: string} | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([getGodModeStats(), getTenantsList()])
      .then(([statsData, tenantsData]) => {
        setStats(statsData);
        setTenants(tenantsData);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = (id: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Suspender este cliente?" : "Reativar este cliente?")) return;
    startTransition(async () => {
      await toggleTenantSuspension(id, currentStatus);
      loadData();
    });
  };

  // Dispara a redefinição de senha
  const handleResetPassword = (tenantId: string, tenantName: string) => {
    if (!confirm(`Gerar nova palavra-passe para o administrador de ${tenantName}?`)) return;

    startTransition(async () => {
      const res = await resetTenantAdminPassword(tenantId);
      if (res.success && res.newPassword) {
        setPasswordModal({
          name: tenantName,
          email: res.email!,
          pass: res.newPassword
        });
      } else {
        alert((res as any).error || "Erro ao resetar senha.");
      }
    });
  };

  const handleImpersonate = (tenantId: string) => {
    startTransition(async () => {
      const res = await getImpersonationToken(tenantId);
      if (res.success) {
        // Lida inteligentemente com ambiente local (localhost) ou produção (acaoleve.com)
        const isLocal = window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168");
        const domain = isLocal ? `${res.subdomain}.localhost:3000` : `${res.subdomain}.acaoleve.com`;
        const protocol = isLocal ? "http://" : "https://";
        
        // Abre uma nova aba no navegador já logado no cliente!
        window.open(`${protocol}${domain}/entrar/magico?t=${res.token}`, "_blank");
      } else {
        alert((res as any).error || "Erro ao gerar token.");
      }
    });
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTenantExpress(formData);
      if (res.success) {
        setShowModal(false);
        loadData();
        setFormData({ name: "", subdomain: "", adminName: "", adminEmail: "", adminPass: "", planType: "SINGLE_EVENT", eventDate: "" });
      } else {
        alert((res as any).error || "Erro ao criar cliente.");
      }
    });
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando Hub...</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans text-slate-200">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Ação Leve <span className="text-emerald-500">Hub</span></h1>
            <p className="text-slate-400">Visão Global e Administração (God Mode)</p>
          </div>
          <div className="flex gap-4">
            
            {/* 🔥 NOVO: BOTÃO DA DANGER ZONE */}
            <Link 
              href="/admin/danger" 
              className="flex items-center gap-2 bg-red-900/20 hover:bg-red-800 text-red-400 hover:text-white border border-red-900/50 px-4 py-2 rounded-xl transition font-bold shadow-[0_0_15px_rgba(220,38,38,0.15)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            >
              <AlertOctagon size={18} /> Danger Zone
            </Link>

            <button onClick={loadData} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition">
              <RefreshCcw size={18} /> Atualizar
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold transition shadow-lg shadow-emerald-900/20">
              <Plus size={18} /> Novo Cliente
            </button>
          </div>
        </div>

        {/* STATS GLOBAIS */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Building />} label="Total Inquilinos" value={stats.tenants} color="blue" />
            <StatCard icon={<BadgeDollarSign />} label="Faturamento (GMV)" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((stats.totalGMV || 0) / 100)} color="emerald" highlight />
            <StatCard icon={<Ticket />} label="Eventos Criados" value={stats.events} color="purple" />
            <StatCard icon={<Users />} label="Voluntários/PDVs" value={stats.roles.verifiers} color="amber" />
          </div>
        )}

        {/* LISTAGEM DE CLIENTES */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
              <tr>
                <th className="p-5">Inquilino</th>
                <th className="p-5">Subdomínio</th>
                <th className="p-5">Plano / Expiração</th>
                <th className="p-5">Status</th>
                <th className="p-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-slate-800/80 transition group">
                  <td className="p-5">
                    <p className="font-bold text-white text-base">{tenant.name}</p>
                    <p className="text-xs text-slate-500">Criado em {new Date(tenant.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="p-5 font-mono text-emerald-400">
                    <a href={`https://${tenant.subdomain}.acaoleve.com`} target="_blank" className="hover:underline flex items-center gap-1">
                      {tenant.subdomain} <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="p-5">
                    <span className="bg-slate-900 text-slate-300 px-2 py-1 rounded text-xs font-bold mr-2">
                      {tenant.planType === "ANNUAL" ? "ANUAL" : "EVENTO ÚNICO"}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {tenant.expiresAt ? `Expira: ${new Date(tenant.expiresAt).toLocaleDateString()}` : 'Vitalício'}
                    </p>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${tenant.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {tenant.active ? "ATIVO" : "SUSPENSO"}
                    </span>
                  </td>
                  <td className="p-5 text-right space-x-2">
                    <button 
                      onClick={() => handleImpersonate(tenant.id)}
                      className="p-2 bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition tooltip"
                      title="Entrar no Painel do Cliente"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleResetPassword(tenant.id, tenant.name)}
                      className="p-2 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition tooltip"
                      title="Resetar Senha do Administrador"
                    >
                      <Key size={16} />
                    </button>
                    <button 
                      onClick={() => handleToggle(tenant.id, tenant.active)}
                      className={`p-2 rounded-lg transition ${tenant.active ? 'bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white' : 'bg-red-600 text-white hover:bg-emerald-600'}`}
                      title={tenant.active ? "Suspender Cliente" : "Reativar Cliente"}
                    >
                      <Power size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL DE ONBOARDING */}
        {showModal && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full relative">
               <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>
               <h3 className="text-xl font-black text-white mb-4">Novo Cliente (Tenant)</h3>
               
               <form onSubmit={handleCreateTenant} className="space-y-4">
                 <input placeholder="Nome da Igreja/ONG" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-3 bg-slate-800 text-white rounded-xl" />
                 <input placeholder="Subdomínio (ex: paroquiasaojose)" value={formData.subdomain} onChange={e => setFormData({...formData, subdomain: e.target.value})} required className="w-full p-3 bg-slate-800 text-white rounded-xl" />
                 
                 <div className="grid grid-cols-2 gap-4">
                   <select value={formData.planType} onChange={e => setFormData({...formData, planType: e.target.value as any})} className="w-full p-3 bg-slate-800 text-white rounded-xl">
                     <option value="SINGLE_EVENT">Evento Único</option>
                     <option value="ANNUAL">Plano Anual</option>
                   </select>
                   <input type="date" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} required={formData.planType === 'SINGLE_EVENT'} className="w-full p-3 bg-slate-800 text-slate-400 rounded-xl" />
                 </div>

                 <input placeholder="Nome do Admin" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} required className="w-full p-3 bg-slate-800 text-white rounded-xl" />
                 <input type="email" placeholder="E-mail do Admin" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} required className="w-full p-3 bg-slate-800 text-white rounded-xl" />
                 <input placeholder="Senha Inicial" value={formData.adminPass} onChange={e => setFormData({...formData, adminPass: e.target.value})} required className="w-full p-3 bg-slate-800 text-white rounded-xl" />
                 
                 <button type="submit" disabled={isPending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                   {isPending ? "Criando..." : "Provisionar Ambiente"}
                 </button>
               </form>
             </div>
           </div>
        )}

        {/* MODAL DE SENHA RESETADA */}
        {passwordModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 border-8 border-white shadow-sm">
                <ShieldCheck size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2">Acesso Recuperado!</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                A palavra-passe do administrador principal de <strong className="text-slate-800">{passwordModal.name}</strong> foi redefinida.
              </p>

              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 relative group">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">E-mail (Login)</span>
                    <span className="text-sm font-black text-indigo-600">{passwordModal.email}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Nova Senha</span>
                    <span className="text-xl font-black text-slate-900 tracking-widest">{passwordModal.pass}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const text = `*Recuperação de Acesso - Ação Leve*\n\nOlá, a sua palavra-passe foi redefinida pela Administração.\n\n*E-mail:* ${passwordModal.email}\n*Nova Senha:* ${passwordModal.pass}\n\nRecomendamos alterar esta senha no painel após o login.`;
                    navigator.clipboard.writeText(text);
                    alert("Copiado para a área de transferência!");
                  }}
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 hover:bg-slate-800 text-white text-xs px-5 py-2.5 rounded-full flex items-center gap-2 font-bold shadow-lg transition-transform hover:scale-105"
                >
                  <Copy size={14} /> Copiar Dados
                </button>
              </div>
              <button onClick={() => setPasswordModal(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-xl transition-colors">
                Fechar e Concluir
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Seu componente original de StatCard continua igual
function StatCard({ icon, label, value, color, highlight = false }: any) {
  const colors: any = {
    emerald: "text-emerald-400 bg-emerald-900/20 border-emerald-900/30",
    blue: "text-blue-400 bg-blue-900/20 border-blue-900/30",
    amber: "text-amber-400 bg-amber-900/20 border-amber-900/30",
    purple: "text-purple-400 bg-purple-900/20 border-purple-900/30",
  };
  return (
    <div className={`p-6 rounded-3xl border flex items-center gap-4 ${colors[color]}`}>
      <div className="p-3 rounded-2xl bg-black/20">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
}