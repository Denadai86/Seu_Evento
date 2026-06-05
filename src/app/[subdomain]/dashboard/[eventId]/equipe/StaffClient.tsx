// src/app/[subdomain]/dashboard/[eventId]/equipe/StaffClient.tsx
"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation"; // ✅ FIX 1: necessário para router.refresh()
import { 
  createAndAssignStaff, 
  toggleStaffCapability, 
  removeStaffFromEvent, 
  resetStaffPassword,
  assignCardsToStaff
} from "@/actions/equipe";
import { UserPlus, Shield, Mic, Ticket, Trash2, Key, CheckCircle, X, Package } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// ✅ FIX 2: userId adicionado ao tipo.
// O componente recebia userId do servidor (formattedStaff inclui userId),
// mas o tipo não o declarava. handleResetPin passava s.id (EventStaff.id)
// para resetStaffPassword que espera User.id → banco retornava null → PIN nunca aparecia.
// ─────────────────────────────────────────────────────────────────────────────
type StaffMember = {
  id: string;       // EventStaff.id — usado para toggles e remoção
  userId: string;   // User.id — usado para resetar PIN ← estava faltando
  name: string;
  username: string;
  canSell: boolean;
  canOperate: boolean;
  canVerify: boolean;
  cardsTotal: number;
  cardsSold: number;
};

const ToggleSwitch = ({
  active,
  icon,
  onChange,
}: {
  active: boolean;
  icon: ReactNode;
  onChange: () => void;
}) => (
  <button
    type="button"
    onClick={onChange}
    className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    }`}
    aria-pressed={active}
  >
    {icon}
  </button>
);

export default function StaffClient({
  eventId,
  initialStaff,
  isEventActive,
}: {
  eventId: string;
  initialStaff: StaffMember[];
  isEventActive: boolean;
}) {
  const router = useRouter(); // ✅ FIX 1
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [isPending, startTransition] = useTransition();

  // Estados dos Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [permissions, setPermissions] = useState({ canSell: true, canOperate: false, canVerify: false });
  const [credentialsModal, setCredentialsModal] = useState<{
    username: string;
    pin: string;
    isNewMember: boolean; // distingue criação de reset de PIN
  } | null>(null);

  // Modal de Lote
  const [assignModal, setAssignModal] = useState<{ staffId: string; name: string } | null>(null);
  const [assignQty, setAssignQty] = useState("10");

  // ── TOGGLE DE PERMISSÃO ───────────────────────────────────────────────────
  const handleToggle = (
    staffId: string,
    capability: "canSell" | "canOperate" | "canVerify",
    currentValue: boolean
  ) => {
    // Optimistic UI
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, [capability]: !currentValue } : s))
    );
    startTransition(async () => {
      const res = await toggleStaffCapability(staffId, capability, !currentValue);
      if (!res.success) {
        alert("Erro ao alterar permissão.");
        setStaff(initialStaff);
      }
    });
  };

  // ── CRIAR MEMBRO ─────────────────────────────────────────────────────────
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    startTransition(async () => {
      const res = await createAndAssignStaff(eventId, newStaffName, permissions);
      if (res.success && res.username && res.pin) {
        setShowAddModal(false);
        setNewStaffName("");
        setCredentialsModal({
          username: res.username,
          pin: res.pin,
          isNewMember: true, // ✅ sinaliza que precisa de router.refresh() ao fechar
        });
      } else {
        alert("Erro ao criar membro da equipe.");
      }
    });
  };

  // ── RESETAR PIN ──────────────────────────────────────────────────────────
  // ✅ FIX 2: recebe s.userId (User.id), não s.id (EventStaff.id)
  const handleResetPin = (userId: string, name: string) => {
    if (!confirm(`Gerar novo PIN para ${name}?`)) return;

    startTransition(async () => {
      const res = await resetStaffPassword(userId); // ← agora recebe o User.id correto
      if (res.success && res.newPin) {
        setCredentialsModal({
          username: res.username || name,
          pin: res.newPin,
          isNewMember: false, // reset de PIN não precisa de refresh (nenhuma linha nova)
        });
      } else {
        alert(res.error || "Erro ao resetar PIN.");
      }
    });
  };

  // ── REMOVER DA ESCALA ────────────────────────────────────────────────────
  const handleRemove = (staffId: string) => {
    if (!confirm("Remover da escala deste evento?")) return;
    startTransition(async () => {
      const res = await removeStaffFromEvent(staffId);
      if (res.success) {
        setStaff((prev) => prev.filter((s) => s.id !== staffId));
      } else {
        alert(res.error);
      }
    });
  };

  // ── ENTREGAR LOTE ─────────────────────────────────────────────────────────
  const handleAssignCards = () => {
    if (!assignModal) return;
    const qty = parseInt(assignQty);
    if (isNaN(qty) || qty <= 0) return;

    startTransition(async () => {
      const res = await assignCardsToStaff(eventId, assignModal.staffId, qty);
      if (res.success) {
        setAssignModal(null);
        setAssignQty("10");
        router.refresh(); // atualiza contagem de cartelas na tabela
      } else {
        alert(res.error || "Erro ao entregar cartelas.");
      }
    });
  };

  // ── FECHAR MODAL DE CREDENCIAIS ──────────────────────────────────────────
  // ✅ FIX 1: router.refresh() quando foi criação (nova linha na tabela)
  const handleCloseCredentials = () => {
    const wasNewMember = credentialsModal?.isNewMember;
    setCredentialsModal(null);
    if (wasNewMember) {
      router.refresh(); // re-busca initialStaff do servidor com o novo membro
    }
  };

  return (
    <div>
      {/* TOOLBAR */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Escala do Dia</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition"
        >
          <UserPlus size={18} /> Adicionar Voluntário
        </button>
      </div>

      {/* TABELA DE EQUIPE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4">Identificação</th>
              <th className="p-4 text-center">PDV</th>
              <th className="p-4 text-center">Palco</th>
              <th className="p-4 text-center">Fiscal</th>
              <th className="p-4 text-center">Cartelas</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                <td className="p-4">
                  <p className="font-bold text-slate-900 dark:text-white text-base">{s.name}</p>
                  <p className="text-xs font-mono text-indigo-500">@{s.username}</p>
                </td>

                <td className="p-4 text-center">
                  <ToggleSwitch active={s.canSell} icon={<Ticket size={14} />} onChange={() => handleToggle(s.id, "canSell", s.canSell)} />
                </td>
                <td className="p-4 text-center">
                  <ToggleSwitch active={s.canOperate} icon={<Mic size={14} />} onChange={() => handleToggle(s.id, "canOperate", s.canOperate)} />
                </td>
                <td className="p-4 text-center">
                  <ToggleSwitch active={s.canVerify} icon={<Shield size={14} />} onChange={() => handleToggle(s.id, "canVerify", s.canVerify)} />
                </td>

                <td className="p-4 text-center">
                  <button
                    onClick={() => setAssignModal({ staffId: s.id, name: s.name })}
                    className="flex flex-col items-center mx-auto hover:text-indigo-400 transition"
                    title="Entregar lote de cartelas"
                  >
                    <span className="text-sm font-bold">{s.cardsSold} / {s.cardsTotal}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">Vendidas</span>
                  </button>
                </td>

                <td className="p-4 text-right space-x-1">
                  <button
                    onClick={() => setAssignModal({ staffId: s.id, name: s.name })}
                    className="p-2 text-slate-400 hover:text-indigo-400 transition"
                    title="Entregar lote de cartelas"
                  >
                    <Package size={18} />
                  </button>
                  {/* ✅ FIX 2: passa s.userId (User.id) ao invés de s.id (EventStaff.id) */}
                  <button
                    onClick={() => handleResetPin(s.userId, s.name)}
                    className="p-2 text-slate-400 hover:text-amber-500 transition"
                    title="Resetar PIN"
                  >
                    <Key size={18} />
                  </button>
                  <button
                    onClick={() => handleRemove(s.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition"
                    title="Remover da Escala"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Nenhum membro alocado neste evento ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: ADICIONAR MEMBRO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X />
            </button>
            <h3 className="text-xl font-bold mb-4 dark:text-white">Adicionar à Escala</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-500 mb-1 block">Nome do Voluntário</label>
                <input
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:border-indigo-500"
                  placeholder="Ex: Maria Joaquina"
                />
              </div>
              <div className="pt-2 border-t dark:border-slate-700">
                <label className="text-sm font-bold text-slate-500 mb-2 block">Permissões Iniciais</label>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <span className="text-sm font-medium dark:text-slate-300">Vender Cartelas (PDV)</span>
                  <input type="checkbox" checked={permissions.canSell} onChange={(e) => setPermissions({ ...permissions, canSell: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
                </div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg mt-2">
                  <span className="text-sm font-medium dark:text-slate-300">Acessar Palco (Locutor)</span>
                  <input type="checkbox" checked={permissions.canOperate} onChange={(e) => setPermissions({ ...permissions, canOperate: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
                </div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg mt-2">
                  <span className="text-sm font-medium dark:text-slate-300">Validar Ganhadores (Fiscal)</span>
                  <input type="checkbox" checked={permissions.canVerify} onChange={(e) => setPermissions({ ...permissions, canVerify: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
                </div>
              </div>
              <button
                disabled={isPending}
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl mt-4 disabled:opacity-50"
              >
                {isPending ? "Processando..." : "Confirmar e Gerar PIN"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENTREGAR LOTE DE CARTELAS */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm relative">
            <button onClick={() => setAssignModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X />
            </button>
            <h3 className="text-xl font-bold mb-1 dark:text-white">Entregar Lote</h3>
            <p className="text-slate-400 text-sm mb-6">{assignModal.name}</p>
            <div>
              <label className="text-sm font-bold text-slate-500 mb-1 block">Quantidade de cartelas</label>
              <input
                type="number"
                min="1"
                max="500"
                value={assignQty}
                onChange={(e) => setAssignQty(e.target.value)}
                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:border-indigo-500 text-center text-2xl font-black"
              />
            </div>
            <button
              disabled={isPending}
              onClick={handleAssignCards}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl mt-4 disabled:opacity-50"
            >
              {isPending ? "Entregando..." : `Entregar ${assignQty} cartelas`}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CREDENCIAIS (criação + reset de PIN) */}
      {credentialsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle className="text-emerald-500" size={48} />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">
              {credentialsModal.isNewMember ? "Credenciais Geradas!" : "PIN Atualizado!"}
            </h3>
            <p className="text-slate-400 mb-8">Entregue estas informações ao voluntário.</p>
            <div className="bg-slate-800 rounded-2xl p-6 mb-8 text-left space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">USUÁRIO</p>
                <p className="font-mono text-xl font-bold text-white">{credentialsModal.username}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">SENHA (PIN)</p>
                <p className="font-mono text-4xl font-black text-emerald-400 tracking-[4px]">
                  {credentialsModal.pin}
                </p>
              </div>
            </div>
            {/* ✅ FIX 1: router.refresh() quando foi criação de novo membro */}
            <button
              onClick={handleCloseCredentials}
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-bold text-white transition"
            >
              Entendi, Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}