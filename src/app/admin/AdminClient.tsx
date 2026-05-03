"use client";

import { useEffect, useState } from "react";
import { getAllTenants, createTenant, deleteTenant } from "@/actions/tenant";
import { Plus, Trash2, ExternalLink, CheckCircle2, Copy, Building2, KeyRound } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

export default function AdminClient({ session }: { session: any }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [newClientData, setNewClientData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const loadTenants = async () => {
    try {
      const data = await getAllTenants();
      setTenants(data);
    } catch (error) {
      console.error("Erro ao carregar clientes", error);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subdomain || !email) return;

    setLoading(true);
    setNewClientData(null);
    setCopied(false);

    try {
      const res = await createTenant(name, subdomain, email);

      if (res.success) {
        setNewClientData(res.credentials);
        setName("");
        setSubdomain("");
        setEmail("");
        await loadTenants();
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta organização? Isso apagará tudo!")) return;
    try {
      await deleteTenant(id);
      await loadTenants();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCopyCredentials = () => {
    if (!newClientData) return;
    const text = `Painel: ${newClientData.loginUrl}\nLogin: ${newClientData.email}\nSenha: ${newClientData.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans p-6 md:p-12 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-12 bg-[#111111] border border-[#222] p-6 rounded-3xl shadow-2xl">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Ação Leve <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">HUB</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gerenciamento Central de Inquilinos</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-[#1a1a1a] py-2 px-4 rounded-full border border-[#333]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-black text-sm font-black shadow-lg shadow-emerald-500/20">
                {session?.user?.name?.charAt(0) || "A"}
              </div>
              <span className="text-sm font-medium text-slate-300">{session?.user?.name}</span>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <LogoutButton callbackUrl="/admin/login" variant="dark" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* COLUNA ESQUERDA: FORMULÁRIO */}
          <aside className="space-y-6">
            <div className="bg-[#111111] border border-[#222] p-8 rounded-3xl shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex gap-3 items-center">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <Building2 size={20} />
                </div>
                Nova Organização
              </h2>

              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Nome do Contratante</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Igreja São José"
                    required
                    className="w-full bg-[#1a1a1a] text-white border border-[#333] rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Subdomínio da URL</label>
                  <div className="relative flex items-center">
                    <input
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      placeholder="sjose"
                      required
                      className="w-full bg-[#1a1a1a] text-white border border-[#333] rounded-xl p-4 pr-32 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono placeholder:text-slate-600"
                    />
                    <span className="absolute right-4 text-slate-500 font-mono text-sm pointer-events-none">
                      .acaoleve.com
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">E-mail do Administrador</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="padre@igreja.com"
                    required
                    className="w-full bg-[#1a1a1a] text-white border border-[#333] rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <button 
                  disabled={loading} 
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <span className="animate-pulse">Processando infraestrutura...</span>
                  ) : (
                    <>
                      <Plus size={20} />
                      Criar e Provisionar
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* CAIXA DE SUCESSO PREMIUM */}
            {newClientData && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CheckCircle2 size={100} />
                </div>
                
                <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-4">
                  <CheckCircle2 size={20} />
                  Ambiente Liberado!
                </h3>

                <div className="bg-[#050505] border border-emerald-900/50 rounded-xl p-4 text-sm font-mono space-y-3 relative z-10">
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Painel:</span>
                    <a href={newClientData.loginUrl} target="_blank" className="text-emerald-400 hover:underline break-all">
                      {newClientData.loginUrl}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Login Master:</span>
                    <span className="text-white">{newClientData.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Senha (Salve agora, não será exibida novamente):</span>
                    <span className="text-white bg-slate-800 px-2 py-1 rounded">{newClientData.password}</span>
                  </div>
                </div>

                <button 
                  onClick={handleCopyCredentials}
                  className="w-full mt-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-2"
                >
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  {copied ? "Copiado para a área de transferência!" : "Copiar credenciais para o cliente"}
                </button>
              </div>
            )}
          </aside>

          {/* COLUNA DIREITA: LISTA DE CLIENTES */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-xl font-bold text-white">
                Contratos Ativos
              </h2>
              <span className="bg-[#222] text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-[#333]">
                {tenants.length} {tenants.length === 1 ? "Cliente" : "Clientes"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tenants.map((tenant) => {
                const url =
                  process.env.NODE_ENV === "production"
                    ? `https://${tenant.subdomain}.acaoleve.com/dashboard`
                    : `http://${tenant.subdomain}.localhost:3000/dashboard`;

                return (
                  <div
                    key={tenant.id}
                    className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-[#111111] border border-[#222] hover:border-[#444] rounded-2xl transition-all shadow-sm hover:shadow-xl"
                  >
                    <div className="mb-4 sm:mb-0">
                      <h3 className="text-lg text-white font-bold group-hover:text-emerald-400 transition-colors">{tenant.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${tenant.active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm text-slate-400 font-mono">
                          {tenant.subdomain}.acaoleve.com
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => alert("Lógica de sobrescrever senha do organizador virá na V2 do sistema.")}
                        className="flex-1 sm:flex-none p-3 bg-[#1a1a1a] hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-[#333] transition-colors tooltip"
                        title="Resetar Senha do Admin"
                      >
                        <KeyRound size={18} className="mx-auto" />
                      </button>

                      <a 
                        href={url} 
                        target="_blank"
                        className="flex-1 sm:flex-none p-3 bg-[#1a1a1a] hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 rounded-xl border border-[#333] hover:border-emerald-500/30 transition-colors"
                        title="Acessar Painel"
                      >
                        <ExternalLink size={18} className="mx-auto" />
                      </a>

                      <button 
                        onClick={() => handleDelete(tenant.id)}
                        className="flex-1 sm:flex-none p-3 bg-[#1a1a1a] hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl border border-[#333] hover:border-red-500/30 transition-colors"
                        title="Excluir Contrato"
                      >
                        <Trash2 size={18} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {tenants.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#333] rounded-3xl">
                <Building2 size={48} className="mx-auto text-[#333] mb-4" />
                <p className="text-slate-500">Nenhum contrato ativo ainda.</p>
                <p className="text-slate-600 text-sm mt-1">Crie seu primeiro cliente no painel ao lado.</p>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}