import { ClerkProvider } from '@clerk/nextjs';
import { ptBR } from '@clerk/localizations';
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={ptBR}>
      <html lang="pt-BR">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}