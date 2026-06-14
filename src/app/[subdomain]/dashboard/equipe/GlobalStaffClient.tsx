// src/app/[subdomain]/dashboard/equipe/GlobalStaffClient.tsx
"use client";

import { useState, useTransition } from "react";
import { createTenantStaff, toggleStaffInEvent, resetGlobalStaffPin } from "@/actions/equipe-global";
import { UserPlus, Settings2, Key, CheckCircle, Ticket, Mic, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

type EventType = { id: string; name: string; isActive: boolean };
type StaffEventType = { eventId: string; canSell: boolean; canOperate: boolean; canVerify: boolean };
type StaffMemberType = { id: string; name: string | null; username: string | null; events: StaffEventType[] };

export default function GlobalStaffClient({ staffMembers, events }: { staffMembers: StaffMemberType[], events: EventType[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [credentialsModal, setCredentialsModal] = useState<{ username: string; pin: string } | null>(null);
  
  // Controle do Modal de Eventos
  const [activeStaffModal, setActiveStaffModal] = useState<StaffMemberType | null>(null);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTenantStaff(newStaffName);
      if (res.success && res.pin) {
        setNewStaffName("");
        setShowAddModal(false);
        setCredentialsModal({ username: res.username!, pin: res.pin });
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  const handleResetPin = (userId: string, name: string) => {
    if (!confirm(`Gerar novo PIN para ${name}?`)) return;
    startTransition(async () => {
      const res = await resetGlobalStaffPin(userId);
      if (res.success && res.newPin) {
        setCredentialsModal({ username: res.username!, pin: res.newPin });
      } else {
        alert(res.error);
      }
    });
  };

  const handleEventToggle = (userId: string, eventId: string, currentAssigned: boolean, currentPerms: any) => {
    startTransition(async () => {
      // Se não estava no evento, ativa com permissão de venda padrão. Se já estava, remove.
      const newAssigned = !currentAssigned;
      const perms = newAssigned ? { canSell: true, canOperate: false, canVerify: false } : { canSell: false, canOperate: false, canVerify: false };
      
      await toggleStaffInEvent(userId, eventId, newAssigned, perms);
      router.refresh();
      // Atualiza o estado do modal localmente para ser instantâneo
      if (activeStaffModal) {
        const updatedEvents = newAssigned 
          ? [...activeStaffModal.events, { eventId, ...perms }]
          : activeStaffModal.events.filter(e => e.eventId !== eventId);
        setActiveStaffModal({ ...activeStaffModal, events: updatedEvents });
      }
    });
  };

  const handlePermissionToggle = (userId: string, eventId: string, permKey: 'canSell'|'canOperate'|'canVerify', currentPerms: any) => {
    startTransition(async () => {
      const updatedPerms = { ...currentPerms, [permKey]: !currentPerms[permKey] };
      await toggleStaffInEvent(userId, eventId, true, updatedPerms);
      router.refresh();
      
      if (activeStaffModal) {
        const updatedEvents = activeStaffModal.events.map(e => e.eventId === eventId ? { ...e, ...updatedPerms } : e);
        setActiveStaffModal({ ...activeStaffModal, events: updatedEvents });
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-300">Equipe Cadastrada</h2>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-900/20">
          <UserPlus size={18} /> Novo Voluntário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffMembers.map((staff) => (
          <div key={staff.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/50 transition">
            <div>
              <h3 className="text-lg font-black text-white">{staff.name}</h3>
              <p className="text-sm font-mono text-blue-400 mb-4">@{staff.username}</p>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-black/40 px-3 py-1.5 rounded-lg w-max mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Ativo em {staff.events.length} evento(s)
              </div>
            </div>
            
            <div className="flex gap-2 border-t border-slate-800 pt-4">
              <button 
                onClick={() => setActiveStaffModal(staff)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <Settings2 size={16} /> Gerenciar Eventos
              </button>
              <button 
                onClick={() => handleResetPin(staff.id, staff.name!)}
                className="p-2 bg-slate-800 hover:bg-amber-900/40 text-amber-500 rounded-xl transition" title="Resetar PIN"
              >
                <Key size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: GERENCIAR EVENTOS DO VOLUNTÁRIO */}
      {activeStaffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl p-6 w-full max-w-2xl relative max-h-[85vh] flex flex-col">
            <button onClick={() => setActiveStaffModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white font-black text-xl">X</button>
            
            <h3 className="text-2xl font-black text-white mb-1">Permissões de {activeStaffModal.name}</h3>
            <p className="text-slate-400 text-sm mb-6">Ligue o voluntário no evento desejado e defina o que ele pode fazer.</p>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {events.map(event => {
                const staffEvent = activeStaffModal.events.find(e => e.eventId === event.id);
                const isAssigned = !!staffEvent;

                return (
                  <div key={event.id} className={`p-5 rounded-2xl border transition-all ${isAssigned ? 'bg-blue-900/10 border-blue-500/30' : 'bg-black/40 border-slate-800 opacity-60 hover:opacity-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <p className="font-bold text-white text-lg">{event.name} {event.isActive && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md ml-2 align-middle">ATIVO</span>}</p>
                      
                      {/* TOGGLE PRINCIPAL: PARTICIPA DO EVENTO? */}
                      <button 
                        disabled={isPending}
                        onClick={() => handleEventToggle(activeStaffModal.id, event.id, isAssigned, staffEvent)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition ${isAssigned ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                      >
                        {isAssigned ? 'REMOVER DO EVENTO' : '+ INCLUIR NO EVENTO'}
                      </button>
                    </div>

                    {/* TOGGLES DE PERMISSÃO */}
                    {isAssigned && (
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800">
                        <button 
                          onClick={() => handlePermissionToggle(activeStaffModal.id, event.id, 'canSell', staffEvent)}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition ${staffEvent.canSell ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                        >
                          <Ticket size={16} /> Vender (PDV)
                        </button>
                        <button 
                          onClick={() => handlePermissionToggle(activeStaffModal.id, event.id, 'canOperate', staffEvent)}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition ${staffEvent.canOperate ? 'bg-violet-600/20 border-violet-500 text-violet-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                        >
                          <Mic size={16} /> Palco
                        </button>
                        <button 
                          onClick={() => handlePermissionToggle(activeStaffModal.id, event.id, 'canVerify', staffEvent)}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition ${staffEvent.canVerify ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                        >
                          <Shield size={16} /> Fiscal
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {events.length === 0 && <p className="text-center text-slate-500 py-10">Crie um evento primeiro para poder alocar a equipe.</p>}
            </div>
          </div>
        </div>
      )}

      {/* OUTROS MODAIS (NOVO STAFF E PIN GERADO) MANTIDOS IGUAIS... */}
      {showAddModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className="bg-[#111827] rounded-3xl p-6 w-full max-w-md relative border border-slate-800">
           <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400">X</button>
           <h3 className="text-xl font-bold text-white mb-4">Novo Voluntário</h3>
           <form onSubmit={handleAddStaff}>
             <input required value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full p-4 bg-black border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 mb-4" placeholder="Nome Completo" />
             <button disabled={isPending} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl disabled:opacity-50">Confirmar e Gerar Acesso</button>
           </form>
         </div>
       </div>
      )}

      {credentialsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-emerald-500/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle className="text-emerald-500" size={48} />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Credenciais Geradas!</h3>
            <div className="bg-black rounded-2xl p-6 mb-8 text-left space-y-4 border border-slate-800">
              <div><p className="text-xs uppercase text-slate-500 mb-1">USUÁRIO</p><p className="font-mono text-xl font-bold text-white">{credentialsModal.username}</p></div>
              <div><p className="text-xs uppercase text-slate-500 mb-1">SENHA (PIN)</p><p className="font-mono text-4xl font-black text-emerald-400 tracking-widest">{credentialsModal.pin}</p></div>
            </div>
            <button onClick={() => setCredentialsModal(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-bold text-white">Entendi, Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}