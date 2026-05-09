"use client";

import { useState } from "react";

export default function QRCodeScanner({
  eventId,
  subdomain,
}: {
  eventId: string | null;
  subdomain: string;
}) {
  const [manualId, setManualId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleManualCheck = () => {
    if (!manualId.trim()) return;
    setLoading(true);
    const url = `/${subdomain}/verify?event=${eventId || ""}&id=${manualId.trim().toUpperCase()}`;
    window.location.href = url;
  };

  return (
    <div className="mt-8">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
        <p className="text-slate-400 text-sm mb-4 text-center">Escanear ou Digitar</p>

        {/* Input Manual */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Digite o ID da cartela"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono uppercase tracking-widest text-center"
            onKeyDown={(e) => e.key === 'Enter' && handleManualCheck()}
          />
          <button
            onClick={handleManualCheck}
            disabled={loading || !manualId.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 px-8 rounded-xl font-bold disabled:opacity-50"
          >
            Verificar
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center mt-6">
          Aponte a câmera para o QR Code impresso na cartela
        </p>
      </div>
    </div>
  );
}