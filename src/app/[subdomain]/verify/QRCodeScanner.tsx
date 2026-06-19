// src/app/[subdomain]/verify/QRCodeScanner.tsx
"use client";

import { useState, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, X, AlertCircle, CheckCircle2 } from "lucide-react";

export default function QRCodeScanner({
  eventId,
  subdomain,
}: {
  eventId: string | null;
  subdomain: string;
}) {
  const [manualId, setManualId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Feedback auditivo (beep)
  const playBeep = (isSuccess: boolean) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(isSuccess ? "/success-beep.mp3" : "/error-beep.mp3");
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  // Feedback tátil (vibração)
  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const showFeedback = (type: "success" | "error", text: string) => {
    setScanStatus(type);
    setMessage(text);
    
    if (type === "success") {
      playBeep(true);
      vibrate([100, 50, 100]);
    } else {
      playBeep(false);
      vibrate(200);
    }

    // Limpa feedback após 2.5s
    setTimeout(() => {
      setScanStatus("idle");
      setMessage("");
    }, 2500);
  };

  const handleScan = (result: any) => {
    if (!result || result.length === 0) return;

    const code = result[0].rawValue.trim();

    try {
      // Tenta extrair ID de URL completa
      const parsedUrl = new URL(code);
      const idParam = parsedUrl.searchParams.get("id");
      
      if (idParam) {
        redirectToVerify(idParam);
        return;
      }
      // Se for URL mas não tem ?id=, usa o path
      redirectToVerify(code);
    } catch {
      // Código puro (ex: ABC123)
      redirectToVerify(code);
    }
  };

  const redirectToVerify = (id: string) => {
    const cleanId = id.toUpperCase().trim();
    const url = eventId 
      ? `/verify?event=${eventId}&id=${cleanId}`
      : `/verify?id=${cleanId}`;

    showFeedback("success", `Cartela ${cleanId} detectada!`);
    
    // Pequeno delay para o usuário ver o feedback
    setTimeout(() => {
      window.location.href = url;
    }, 800);
  };

  const handleManualCheck = () => {
    if (!manualId.trim()) return;
    
    const cleanId = manualId.trim().toUpperCase();
    showFeedback("success", `Buscando cartela ${cleanId}...`);
    
    setTimeout(() => {
      const url = eventId 
        ? `/verify?event=${eventId}&id=${cleanId}`
        : `/verify?id=${cleanId}`;
      window.location.href = url;
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Status Feedback */}
      {scanStatus !== "idle" && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium transition-all ${
          scanStatus === "success" 
            ? "bg-emerald-500/10 border border-emerald-500 text-emerald-400" 
            : "bg-red-500/10 border border-red-500 text-red-400"
        }`}>
          {scanStatus === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message}
        </div>
      )}

      {/* Botão da Câmera */}
      {!isScanning ? (
        <button
          type="button"
          onClick={() => setIsScanning(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 text-lg shadow-xl shadow-blue-900/30 active:scale-[0.985] transition-all"
        >
          <Camera size={28} />
          LER QR CODE COM A CÂMERA
        </button>
      ) : (
        <div className="relative bg-black rounded-3xl overflow-hidden border-4 border-blue-500 shadow-2xl">
          <button
            type="button"
            onClick={() => setIsScanning(false)}
            aria-label="Fechar scanner"
            title="Fechar scanner"
            className="absolute top-4 right-4 z-50 bg-black/70 hover:bg-red-600 text-white p-3 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          <Scanner
            onScan={handleScan}
            onError={(err) => {
              console.error(err);
              showFeedback("error", "Erro na câmera. Tente novamente.");
            }}
            formats={["qr_code", "code_128", "ean_13"]}
            styles={{
              container: { width: "100%", aspectRatio: "1/1" },
              video: { objectFit: "cover" }
            }}
          />

          <div className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm font-medium pointer-events-none">
            Aponte para o QR Code da cartela
          </div>
        </div>
      )}

      {/* Entrada Manual */}
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 text-center">
          OU DIGITE O CÓDIGO MANUALMENTE
        </p>
        
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ex: A1B2C3"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualCheck()}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-xl font-mono uppercase tracking-widest text-center outline-none focus:border-blue-500 transition-colors"
            maxLength={8}
          />
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={!manualId.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 px-8 rounded-2xl font-bold transition-all"
          >
            Buscar
          </button>
        </div>
      </div>
    </div>
  );
}