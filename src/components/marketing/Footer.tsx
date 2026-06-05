// src/components/marketing/Footer.tsx
// Melhorado — WhatsApp, tagline de interior SP, links de políticas

import Link from "next/link";

import { siteConfig } from "@/config/site";
import { navigation } from "@/config/navigation";

export default function Footer() {
  return (
    <footer className="border-t border-white/8">
      <div className="max-w-6xl mx-auto px-6 py-14">

        <div className="grid md:grid-cols-3 gap-10 mb-10">

          {/* Marca */}

          <div>
            <div className="text-yellow-400 font-black text-2xl mb-2">
              🎯 {siteConfig.name}
            </div>

            <p className="text-zinc-500 text-sm leading-relaxed">
              Gestão profissional de bingos beneficentes para igrejas,
              ONGs e associações.
            </p>
          </div>

          {/* Navegação */}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
              Produto
            </p>

            <div className="flex flex-col gap-3 text-sm text-zinc-400">

              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}

            </div>
          </div>

          {/* Suporte */}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
              Suporte
            </p>

            <div className="flex flex-col gap-3 text-sm text-zinc-400">

              <a
                href={siteConfig.urls.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                💬 WhatsApp
              </a>

              <Link
                href={siteConfig.urls.login}
                className="hover:text-white transition-colors"
              >
                Acessar minha conta
              </Link>

              <Link
                href={siteConfig.urls.privacy}
                className="hover:text-white transition-colors"
              >
                Política de Privacidade
              </Link>

              <Link
                href={siteConfig.urls.terms}
                className="hover:text-white transition-colors"
              >
                Termos de Uso
              </Link>

            </div>
          </div>

        </div>

        <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">

          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>

          <span>
            Feito com ☕ no interior de SP 🌽
          </span>

        </div>

      </div>
    </footer>
  );
}