"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, X } from "lucide-react";

export default function QRCodeScanner({
  eventId,
  subdomain,
}: {
  eventId: string | null;
  subdomain: string;
}) {
  const [manualId, setManualId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleManualCheck = () => {
    if (!manualId.trim()) return;
    setLoading(true);
    const url = eventId 
      ? `/verify?event=${eventId}&id=${manualId.trim().toUpperCase()}`
      : `/verify?id=${manualId.trim().toUpperCase()}`;
    window.location.href = url;
  };

const handleScan = (result: any) => {
    if (result && result.length > 0) {
      setLoading(true);
      const code = result[0].rawValue;

      try {
        // 🔥 MÁGICA 1: Tenta ler como URL. Se a câmera leu o link inteiro do QR Code:
        const parsedUrl = new URL(code);
        const idParam = parsedUrl.searchParams.get("id"); // Extrai só as 6 letrinhas!

        if (idParam) {
          window.location.href = `/verify?event=${eventId || ""}&id=${idParam.toUpperCase()}`;
          return;
        }
        
        // Fallback: se for URL mas não tiver ID (quase impossível)
        window.location.href = code;
      } catch (e) {
        // 🔥 MÁGICA 2: Se não for URL (deu erro no new URL), é porque a pessoa só bipou um código puro (ex: 1K8JTK)
        const url = eventId 
          ? `/verify?event=${eventId}&id=${code.toUpperCase()}`
          : `/verify?id=${code.toUpperCase()}`;
        window.location.href = url;
      }
    }
  };

  
  return (
    <div className="mt-8 space-y-4">
      {/* BOTÃO DA CÂMERA */}
      {!showCamera ? (
        <button 
          onClick={() => setShowCamera(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40"
        >
          <Camera size={24} /> LER QR CODE COM A CÂMERA
        </button>
      ) : (
        <div className="bg-black border-2 border-blue-500 rounded-3xl overflow-hidden relative shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <button 
            onClick={() => setShowCamera(false)}
            className="absolute top-4 right-4 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors"
          >
            <X size={20} />
          </button>
          
          <Scanner 
            onScan={handleScan}
            onError={(err) => console.error(err)}
            formats={["qr_code", "code_128"]} // Lê QR e Código de Barras normal
            styles={{ container: { width: '100%', aspectRatio: '1/1' } }}
          />
          <div className="absolute bottom-4 left-0 right-0 text-center text-white text-xs font-bold drop-shadow-md z-10 pointer-events-none">
            Aponte para o código da cartela
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6">
        <p className="text-slate-500 text-xs font-bold mb-4 text-center uppercase tracking-widest">Ou Digite Manualmente</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: A1B2C3"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono uppercase tracking-widest text-center outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleManualCheck()}
          />
          <button
            onClick={handleManualCheck}
            disabled={loading || !manualId.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 px-6 rounded-xl font-bold disabled:opacity-50 transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>
    </div>
  );
}