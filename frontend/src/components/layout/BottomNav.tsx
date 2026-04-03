"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wine, Camera, Utensils, Calendar } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/cellar", label: "Cellar", icon: Wine },
  { href: "/scan", label: "Scan", icon: Camera },
  { href: "/pairing", label: "Pairings", icon: Utensils },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-wood border-t border-burgundy/30 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 min-w-[44px] py-1 px-2 rounded-lg transition-colors ${
                active ? "text-gold" : "text-cream/50 hover:text-cream/80"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
