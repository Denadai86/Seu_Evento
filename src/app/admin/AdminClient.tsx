// src/app/admin/AdminClient.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { 
  getGodModeStats, 
  getTenantsList, 
  toggleTenantSuspension, 
  createTenantExpress,
  resetTenantAdminPassword,
  getImpersonationToken
} from "@/actions/admin";
import { 
  Building, Users, Ticket, BadgeDollarSign, 
  RefreshCcw, Power, Plus, ShieldCheck, ExternalLink, X,
  Key, Copy, Eye, AlertOctagon 
} from "lucide-react";
import PlatformSettings from "./_components/PlatformSettings";


export default function AdminClient() {
  // ==========================================
  // ESTADOS DA APLICAÇÃO
  // ==========================================
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Estados dos Modais
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
      name: "", 
      subdomain: "", 
      document: "", 
      phone: "",    
      adminName: "", 
      adminEmail: "", 
      adminPass: "",
      planType: "SINGLE_EVENT" as "SINGLE_EVENT" | "ANNUAL", 
      eventDate: "" 
    });
  const [passwordModal, setPasswordModal] = useState<{name: string, email: string, pass: string} | null>(null);

  // ==========================================
  // FUNÇÕES DE DADOS (DATA FETCHING)
  // ==========================================
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

  // ==========================================
  // ACTIONS (MUTATIONS)
  // ==========================================
  const handleToggle = (id: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Suspender este cliente?" : "Reativar este cliente?")) return;
    startTransition(async () => {
      await toggleTenantSuspension(id, currentStatus);
      loadData();
    });
  };

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
        const isLocal = window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168");
        const domain = isLocal ? `${res.subdomain}.localhost:3000` : `${res.subdomain}.acaoleve.dev.br`;
        const protocol = isLocal ? "http://" : "https://";
        
        window.open(`${protocol}${domain}/entrar/magico?t=${res.token}`, "_blank");
      } else {
        alert((res as any).error || "Erro ao gerar token de acesso.");
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
        setFormData({ name: "", subdomain: "", document: "", phone: "", adminName: "", adminEmail: "", adminPass: "", planType: "SINGLE_EVENT", eventDate: "" });
      } else {
        alert((res as any).error || "Erro ao criar cliente.");
      }
    });
  };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center text-emerald-500 font-bold animate-pulse">
      Carregando Dados do Ecossistema...
    </div>
  );

  return (
    <div className="p-8 text-slate-200 max-w-7xl mx-auto">
        
      {/* 1. PAGE HEADER: Ações específicas do Hub */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-slate-800/30 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white">Hub de Inquilinos</h2>
          <p className="text-slate-400 text-sm mt-1">Gerencie clientes, planos e acessos à plataforma.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/admin/danger" 
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl transition font-bold text-sm"
          >
            <AlertOctagon size={16} /> Danger Zone
          </Link>

          <button 
            type="button"
            aria-label="Atualizar lista de clientes"
            onClick={loadData} 
            disabled={isPending}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl transition font-bold text-sm border border-slate-700 disabled:opacity-50"
          >
            <RefreshCcw size={16} className={isPending ? "animate-spin" : ""} /> Atualizar
          </button>
          
          <button 
            type="button"
            aria-label="Abrir modal de novo cliente"
            onClick={() => setShowModal(true)} 
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-lg shadow-emerald-900/20 text-sm"
          >
            <Plus size={18} /> Criar Tenant
          </button>
        </div>
      </div>

      {/* 2. STATS GLOBAIS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Building />} label="Total Inquilinos" value={stats.tenants} color="blue" />
          <StatCard icon={<BadgeDollarSign />} label="Faturamento (GMV)" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((stats.totalGMV || 0) / 100)} color="emerald" highlight />
          <StatCard icon={<Ticket />} label="Eventos Criados" value={stats.events} color="purple" />
          <StatCard icon={<Users />} label="Voluntários/PDVs" value={stats.roles?.verifiers || 0} color="amber" />
        </div>
      )}

     <PlatformSettings />

      {/* 3. LISTAGEM DE CLIENTES */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
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
                    <a href={`https://${tenant.subdomain}.acaoleve.dev.br`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 w-fit">
                      {tenant.subdomain} <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="p-5">
                    <span className="bg-slate-900 text-slate-300 px-2 py-1 rounded text-xs font-bold mr-2">
                      {tenant.planType === "ANNUAL" ? "ANUAL" : "EVENTO ÚNICO"}
                    </span>
                    <p className="text-xs text-slate-400 mt-2">
                      {tenant.expiresAt ? `Expira: ${new Date(tenant.expiresAt).toLocaleDateString()}` : 'Vitalício'}
                    </p>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${tenant.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {tenant.active ? "ATIVO" : "SUSPENSO"}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button"
                        aria-label={`Entrar no painel de ${tenant.name}`}
                        onClick={() => handleImpersonate(tenant.id)}
                        className="p-2 bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition"
                        title="Entrar no Painel do Cliente (God Mode)"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        type="button"
                        aria-label={`Resetar senha de ${tenant.name}`}
                        onClick={() => handleResetPassword(tenant.id, tenant.name)}
                        className="p-2 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition"
                        title="Resetar Senha do Administrador"
                      >
                        <Key size={16} />
                      </button>
                      <button 
                        type="button"
                        aria-label={tenant.active ? `Suspender ${tenant.name}` : `Reativar ${tenant.name}`}
                        onClick={() => handleToggle(tenant.id, tenant.active)}
                        className={`p-2 rounded-lg transition ${tenant.active ? 'bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white' : 'bg-red-600 text-white hover:bg-emerald-600'}`}
                        title={tenant.active ? "Suspender Cliente" : "Reativar Cliente"}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum cliente cadastrado ainda. Crie seu primeiro Tenant!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: NOVO CLIENTE (ONBOARDING)             */}
      {/* ========================================== */}
      {showModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl relative my-8 shadow-2xl">
                  
                  {/* Header do Modal */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                      <h3 className="text-xl font-black text-white">Novo Cliente (Tenant)</h3>
                      <p className="text-sm text-slate-400 mt-1">Provisionamento de um novo ambiente isolado.</p>
                    </div>
                    <button 
                      type="button"
                      aria-label="Fechar modal"
                      title="Fechar modal"
                      onClick={() => setShowModal(false)} 
                      className="text-slate-500 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 p-2 rounded-full"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Corpo do Formulário */}
                  <form onSubmit={handleCreateTenant} className="p-6 space-y-8">
                    
                    {/* SESSÃO 1: Dados da Organização */}
                    <section className="space-y-4">
                      <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        <Building size={14} /> Dados da Organização
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Nome da Igreja/ONG</label>
                          <input 
                            placeholder="Ex: Paróquia São José" 
                            value={formData.name} 
                            onChange={e => {
                              const newName = e.target.value;
                              setFormData({
                                ...formData, 
                                name: newName,
                                subdomain: generateSubdomain(newName) 
                              });
                            }} 
                            required 
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors" 
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Subdomínio Gerado</label>
                          <div className="flex items-center">
                            <input 
                              placeholder="seu-subdominio" 
                              title="Subdomínio Gerado"
                              value={formData.subdomain} 
                              onChange={e => setFormData({...formData, subdomain: generateSubdomain(e.target.value)})} 
                              required 
                              className="w-full p-3.5 bg-slate-800/50 border border-slate-700 border-r-0 text-emerald-400 font-mono rounded-l-xl outline-none focus:border-emerald-500 transition-colors" 
                            />
                            <div className="p-3.5 bg-slate-800 border border-slate-700 border-l-0 text-slate-500 rounded-r-xl font-mono text-sm">
                              .acaoleve.com
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">CNPJ ou CPF</label>
                          <input 
                            placeholder="00.000.000/0000-00" 
                            value={formData.document} 
                            onChange={e => setFormData({...formData, document: maskDocument(e.target.value)})} 
                            required 
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors" 
                          />
                        </div>
                      </div>
                    </section>

                    {/* SESSÃO 2: Administrador e Contato */}
                    <section className="space-y-4">
                      <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} /> Contato e Acesso Mestre
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Nome do Responsável</label>
                          <input 
                            placeholder="Nome do Admin" 
                            value={formData.adminName} 
                            onChange={e => setFormData({...formData, adminName: e.target.value})} 
                            required 
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Telefone / WhatsApp</label>
                          <input 
                            placeholder="(11) 99999-9999" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} 
                            required 
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors" 
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">E-mail de Acesso</label>
                          <input 
                            type="email" 
                            placeholder="admin@igreja.com" 
                            value={formData.adminEmail} 
                            onChange={e => setFormData({...formData, adminEmail: e.target.value})} 
                            required 
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors" 
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Senha Inicial Provisória</label>
                          <input 
                            placeholder="Senha segura" 
                            value={formData.adminPass} 
                            onChange={e => setFormData({...formData, adminPass: e.target.value})} 
                            required 
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors" 
                          />
                        </div>
                      </div>
                    </section>

                    {/* SESSÃO 3: Regras de Negócio (Plano) */}
                    <section className="space-y-4 pt-4 border-t border-slate-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="planType" className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Modelo de Plano</label>
                          <select 
                            id="planType"
                            value={formData.planType} 
                            onChange={e => setFormData({...formData, planType: e.target.value as any})} 
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors appearance-none"
                          >
                            <option value="SINGLE_EVENT">Evento Único (Data Fixa)</option>
                            <option value="ANNUAL">Licença Anual (Múltiplos)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="eventDate" className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Data Base (Encerramento)</label>
                          <input 
                            id="eventDate"
                            type="date" 
                            title="Data Base de Encerramento"
                            placeholder="Selecione a data"
                            value={formData.eventDate} 
                            onChange={e => setFormData({...formData, eventDate: e.target.value})} 
                            required={formData.planType === 'SINGLE_EVENT'} 
                            disabled={formData.planType === 'ANNUAL'}
                            className="w-full p-3.5 bg-slate-800/50 border border-slate-700 text-white rounded-xl outline-none focus:border-emerald-500 transition-colors disabled:opacity-50" 
                          />
                        </div>
                      </div>
                    </section>
                    
                    {/* Rodapé e Botões */}
                    <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                      <button 
                        type="button"
                        aria-label="Cancelar criação"
                        onClick={() => setShowModal(false)}
                        className="px-6 py-3.5 text-slate-400 hover:text-white font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={isPending} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3.5 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20"
                      >
                        {isPending ? "Provisionando..." : "Criar Tenant e Liberar Acesso"}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

      {/* ========================================== */}
      {/* MODAL: SENHA RESETADA                        */}
      {/* ========================================== */}
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
                type="button"
                aria-label="Copiar dados para a área de transferência"
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
            <button 
              type="button"
              onClick={() => setPasswordModal(null)} 
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-xl transition-colors"
            >
              Fechar e Concluir
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================
function StatCard({ icon, label, value, color, highlight = false }: any) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-900/20 border-emerald-900/30",
    blue: "text-blue-400 bg-blue-900/20 border-blue-900/30",
    amber: "text-amber-400 bg-amber-900/20 border-amber-900/30",
    purple: "text-purple-400 bg-purple-900/20 border-purple-900/30",
  };
  
  return (
    <div className={`p-6 rounded-3xl border flex items-center gap-4 ${colors[color]} ${highlight ? 'shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-500/20' : ''}`}>
      <div className="p-3 rounded-2xl bg-black/20">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
}

// Converte "Paróquia São José" para "paroquiasaojose"
const generateSubdomain = (text: string) => {
  return text
    .normalize("NFD") // Separa os acentos das letras
    .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
    .toLowerCase() // Tudo minúsculo
    .replace(/[^a-z0-9]/g, ""); // Remove espaços e caracteres especiais
};

// Formata Telefone: (11) 99999-9999
const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
    .slice(0, 15); // Limita o tamanho
};

// Formata CPF ou CNPJ dinamicamente
const maskDocument = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .slice(0, 14);
  } else {
    // CNPJ: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  }
};