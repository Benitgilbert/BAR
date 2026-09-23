"use client";

import {
  BedDouble,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Menu,
  PackageOpen,
  ShoppingCart,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { businessConfig } from "@/config/business";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Point of Sale", href: "/pos", icon: ShoppingCart },
  { label: "Rooms", href: "/rooms", icon: BedDouble },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Inventory", href: "/inventory", icon: PackageOpen },
];

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Primary navigation">
      {navigation.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`group flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors lg:px-4 ${
              isActive
                ? "bg-forest-900 text-white shadow-[0_8px_20px_rgba(18,55,42,0.16)]"
                : "text-slate-600 hover:bg-forest-50 hover:text-forest-950"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="hidden xl:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Drawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-forest-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close navigation"
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <BrandLogo />
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 space-y-2" aria-label="Mobile navigation">
          {navigation.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-bold ${
                  isActive
                    ? "bg-forest-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-45" />
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-forest-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-forest-950">
            <MapPin className="h-4 w-4 text-gold-600" />
            {businessConfig.location}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {businessConfig.slogan}
          </p>
        </div>
      </aside>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-slate-900">
      <header className="sticky top-0 z-40 border-b border-forest-900/8 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo compact={false} />
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-5 md:flex">
              <MapPin className="h-4 w-4 text-gold-600" />
              <span className="text-xs font-semibold text-slate-500">
                {businessConfig.location}
              </span>
            </div>
          </div>

          <div className="hidden lg:block">
            <NavigationLinks />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:flex">
              <Wifi className="h-3.5 w-3.5" />
              Online
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-forest-100 text-sm font-extrabold text-forest-900 ring-4 ring-canvas">
              AU
            </div>
            <div className="hidden leading-tight md:block">
              <p className="text-xs font-bold text-forest-950">Alice Uwase</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Receptionist
              </p>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && <Drawer onClose={() => setMenuOpen(false)} />}

      <main className="app-main mx-auto min-h-[calc(100vh-72px)] max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:min-h-[calc(100vh-80px)] lg:px-8 lg:py-8">
        {children}
      </main>

      <nav
        className="mobile-nav-safe fixed inset-x-3 z-30 flex min-h-[68px] items-center justify-around rounded-2xl border border-white/70 bg-forest-950/96 px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_18px_50px_rgba(9,39,29,0.35)] backdrop-blur-xl lg:hidden"
        aria-label="Quick navigation"
      >
        {navigation.slice(0, 4).map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold transition-colors ${
                isActive ? "bg-white/12 text-gold-300" : "text-white/55"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label.replace("Point of Sale", "POS")}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
