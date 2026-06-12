// src/app/admin/_components/PlatformSettings.tsx
"use client";

import { useState, useTransition } from "react";
import { updateSelfPassword, createNewSuperAdmin } from "@/actions/admin";
import { ShieldAlert, UserPlus, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function PlatformSettings() {
  const [isPending, startTransition] = useTransition();
  
  // Estados para Reset de Senha Própria
  const [myNewPassword, setMyNewPassword] = useState("");
  
  // Estados para Novo Super Admin
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", pass: "" });
  const [showPass, setShowPass] = useState(false);

  const handleUpdateMyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myNewPassword) return;

    startTransition(async () => {
      const res = await updateSelfPassword(myNewPassword);
      if (res.success) {
        toast.success("Sua senha de Super Admin foi atualizada com sucesso!");
        setMyNewPassword("");
      } else {
        toast.error(res.error || "Erro ao atualizar senha.");
      }
    });
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createNewSuperAdmin(newAdmin);
      if (res.success) {
        toast.success(`Administrador ${newAdmin.name} cadastrado com sucesso!`);
        setNewAdmin({ name: "", email: "", pass: "" });
      } else {
        toast.error(res.error || "Erro ao cadastrar administrador.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* CARD 1: Alterar Minha Senha */}
      <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Alterar Minha Senha</h3>
              <p className="text-slate-400 text-xs mt-0.5">Atualize suas credenciais master de acesso.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateMyPassword} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Nova Senha Master</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={myNewPassword}
                onChange={(e) => setMyNewPassword(e.target.value)}
                required
                className="w-full p-3 bg-slate-900/60 border border-slate-700 text-white rounded-xl outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !myNewPassword}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {isPending ? "Atualizando..." : "Salvar Nova Senha"}
            </button>
          </form>
        </div>
      </div>

      {/* CARD 2: Convidar outro Super Admin */}
      <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <UserPlus size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Adicionar Co-Administrador</h3>
            <p className="text-slate-400 text-xs mt-0.5">Crie outro usuário com poderes de Super Admin.</p>
          </div>
        </div>

        <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Nome Completo</label>
            <input
              type="text"
              placeholder="Ex: Carlos Andrade"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              required
              className="w-full p-3 bg-slate-900/60 border border-slate-700 text-white rounded-xl outline-none focus:border-amber-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">E-mail de Acesso</label>
            <input
              type="email"
              placeholder="admin2@acaoleve.com"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              required
              className="w-full p-3 bg-slate-900/60 border border-slate-700 text-white rounded-xl outline-none focus:border-amber-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold ml-1 mb-1 block">Senha Inicial</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Senha forte"
                value={newAdmin.pass}
                onChange={(e) => setNewAdmin({ ...newAdmin, pass: e.target.value })}
                required
                className="w-full p-3 bg-slate-900/60 border border-slate-700 text-white rounded-xl outline-none focus:border-amber-500 transition-colors text-sm pr-10"
              />
              <button
                type="button"
                aria-label={showPass ? "Esconder senha" : "Mostrar senha"}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              <ShieldAlert size={16} /> Conceder Acesso Master
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}