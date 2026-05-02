"use client";

import { useEffect, useState } from "react";
import { getAllTenants, createTenant, deleteTenant } from "@/actions/tenant";
import { Plus, Trash2, Globe, ExternalLink, CheckCircle2 } from "lucide-react";

export default function AdminClient({ session }: { session: any }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [newClientData, setNewClientData] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black text-white">
              HUB <span className="text-emerald-500">MESTRE</span>
            </h1>
            <p className="text-slate-500 text-sm">Gerenciamento Central</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-full border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs font-bold">
              {session?.user?.name?.charAt(0) || "A"}
            </div>
            <span className="text-xs">{session?.user?.name}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* FORM */}
          <aside className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <h2 className="text-lg font-bold text-white mb-6 flex gap-2 items-center">
                <Plus size={20} className="text-emerald-500" />
                Novo Cliente
              </h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da Organização"
                  required
                  className="input"
                />

                <input
                  value={subdomain}
                  onChange={(e) =>
                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
                  }
                  placeholder="subdominio"
                  required
                  className="input font-mono"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@cliente.com"
                  required
                  className="input"
                />

                <button disabled={loading} className="btn-primary">
                  {loading ? "CRIANDO..." : "CRIAR CLIENTE"}
                </button>
              </form>
            </div>

            {newClientData && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-6 rounded-3xl">
                <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Criado com sucesso
                </h3>

                <div className="mt-4 text-xs font-mono space-y-2">
                  <p>{newClientData.loginUrl}</p>
                  <p>{newClientData.email}</p>
                  <p>{newClientData.password}</p>
                </div>
              </div>
            )}
          </aside>

          {/* LISTA */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm text-slate-500">
              Clientes ({tenants.length})
            </h2>

            {tenants.map((tenant) => {
              const url =
                process.env.NODE_ENV === "production"
                  ? `https://${tenant.subdomain}.acaoleve.com/dashboard`
                  : `http://${tenant.subdomain}.localhost:3000/dashboard`;

              return (
                <div
                  key={tenant.id}
                  className="flex justify-between items-center p-4 bg-slate-900 border border-slate-800 rounded-xl"
                >
                  <div>
                    <h3 className="text-white font-bold">{tenant.name}</h3>
                    <p className="text-xs text-slate-500">
                      {tenant.subdomain}.acaoleve.com
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a href={url} target="_blank">
                      <ExternalLink size={18} />
                    </a>

                    <button onClick={() => handleDelete(tenant.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}