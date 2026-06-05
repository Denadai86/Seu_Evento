// src/components/marketing/Navbar.tsx

import Link from "next/link";

import { siteConfig } from "@/config/site";
import { navigation } from "@/config/navigation";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#091510]/80 border-b border-yellow-500/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href={siteConfig.urls.home}
          className="font-black text-xl text-yellow-400"
        >
          🎯 {siteConfig.name}
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href={siteConfig.urls.login}
          className="bg-orange-500 hover:bg-orange-600 transition px-4 py-2 rounded-xl font-bold text-sm"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}
