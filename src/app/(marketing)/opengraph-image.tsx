// src/app/(marketing)/opengraph-image.tsx
// Imagem de prévia (1200x630) gerada no servidor — aparece quando o link é compartilhado no WhatsApp.
import { ImageResponse } from "next/og";

export const alt = "Seu Evento — gestão de bingos beneficentes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #113a20 0%, #091510 60%, #000000 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#facc15" }}>Seu Evento</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 28 }}>
          Eventos beneficentes com controle de verdade
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 36, color: "#a1a1aa" }}>
          Cartelas, voluntários, telão ao vivo e fechamento de caixa
        </div>
      </div>
    ),
    { ...size }
  );
}
