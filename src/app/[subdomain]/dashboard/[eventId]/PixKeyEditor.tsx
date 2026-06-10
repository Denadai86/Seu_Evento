//src/app/[subdomain]/dashboard/[eventId]/PixKeyEditor.tsx

"use client";

import { useState, useTransition } from "react";
import { updatePixKey } from "@/actions/event"; // Ajuste o caminho conforme seu projeto
import { QrCode, Save, CheckCircle2 } from "lucide-react";

interface PixKeyEditorProps {
  eventId: string;
  initialPixKey: string | null;
}

export default function PixKeyEditor({ eventId, initialPixKey }: PixKeyEditorProps) {
  const [pixKey, setPixKey] = useState(initialPixKey || "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      const res = await updatePixKey(eventId, pixKey);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
          <QrCode size={24} />
        </div>
        <div>
          <h3 className="text-white font-bold">Chave PIX do Recebedor</h3>
          <p className="text-slate-400 text-xs">Exibida no PDV para acelerar pagamentos</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <input
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder="CNPJ, E-mail, Celular ou Chave Aleatória"
          className="flex-1 bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || pixKey === initialPixKey}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          {isPending ? (
            "Salvando..."
          ) : saved ? (
            <><CheckCircle2 size={18} /> Salvo!</>
          ) : (
            <><Save size={18} /> Salvar</>
          )}
        </button>
      </div>
      {!pixKey && (
        <p className="text-amber-500/80 text-xs mt-1 font-medium">
          ⚠️ Sem chave PIX, o PDV não gerará QR Codes para os compradores.
        </p>
      )}
    </div>
  );
}