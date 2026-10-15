// src/components/manual/TopicIcon.tsx
import {
  ShoppingCart, Undo2, Users, Package, Wallet, Ban, ScanLine, Mic,
  Settings, AlertTriangle, ShieldCheck, KeyRound, BookOpen,
} from "lucide-react";
import type { IconKey } from "@/lib/manual/types";

const ICONS = {
  cart: ShoppingCart, undo: Undo2, users: Users, package: Package, wallet: Wallet, ban: Ban,
  scan: ScanLine, mic: Mic, settings: Settings, alert: AlertTriangle, shield: ShieldCheck, key: KeyRound, book: BookOpen,
} as const;

export default function TopicIcon({ name, size = 22, className }: { name: IconKey; size?: number; className?: string }) {
  const Icon = ICONS[name] ?? BookOpen;
  return <Icon size={size} className={className} />;
}
