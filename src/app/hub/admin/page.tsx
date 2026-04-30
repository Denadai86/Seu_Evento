"use client";

import { useEffect, useState } from "react";
import { getAllOrganizations, createOrganization, deleteOrganization } from "../../actions";
import { Plus, Trash2, Globe, Settings, ExternalLink } from "lucide-react"; // Se não tiver o lucide-react, instale com: npm install lucide-react

export default function AdminPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  // Carrega as organizações ao abrir a página
  const loadOrgs = async () => {
    const data = await getAllOrganizations();
    setOrgs(data);
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    setLoading(true);
    await createOrganization(name, slug);
    setName("");
    setSlug("");
    await loadOrgs();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta organização? Isso apagará tudo!")) {
      await deleteOrganization(id);
      await loadOrgs();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">HUB <span className="text-emerald-500">MESTRE</span></h1>
            <p className="text-slate-500 text-sm">Gerenciamento Central de Inquilinos</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-full border border-slate-800">
             <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs font-bold">JL</div>
             <span className="text-xs font-medium pr-2">João Denadai (Admin)</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário Lateral */}
          <aside className="lg:col-span-1">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm sticky top-8">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Plus size={20} className="text-emerald-500" />
                Novo Contratante
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome da Org</label>
                  <input 
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ex: Paróquia São José" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Slug (Subdomínio)</label>
                  <div className="relative">
                    <input 
                      value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s/g, ""))}
                      placeholder="saojose" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pr-24 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                    />
                    <span className="absolute right-3 top-3.5 text-[10px] text-slate-600 font-bold">.acaoleve.com</span>
                  </div>
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                >
                  {loading ? "CRIANDO..." : "CADASTRAR ORGANIZAÇÃO"}
                </button>
              </form>
            </div>
          </aside>

          {/* Lista de Organizações */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Clientes Ativos ({orgs.length})</h2>
            
            {orgs.length === 0 && (
              <div className="p-20 border-2 border-dashed border-slate-800 rounded-3xl text-center text-slate-600">
                Nenhum cliente cadastrado ainda.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {orgs.map((org) => (
                <div key={org.id} className="group bg-slate-900/20 border border-slate-800 p-5 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{org.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{org.slug}.acaoleve.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a 
                      href={`http://${org.slug}.localhost:3000/dashboard`} 
                      target="_blank"
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                      title="Visitar Dashboard"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(org.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}