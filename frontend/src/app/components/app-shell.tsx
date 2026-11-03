
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  ScanLine,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Wallet,
  X,
  Activity,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import OfflineStatus from "./offline-status";

interface AppShellProps {
  children: ReactNode;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

const navigationSections: NavigationSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Items", href: "/items", icon: Package },
      { label: "Locations", href: "/locations", icon: Warehouse },
      { label: "Batches", href: "/batches", icon: ClipboardList },
    ],
  },
  {
    label: "Stock",
    items: [
      { label: "Scanner", href: "/scanner", icon: ScanLine },
      { label: "Stock Operations", href: "/stock-operations", icon: Settings },
      { label: "Stock Movements", href: "/stock-movements", icon: Truck },
    ],
  },
  {
    label: "Procurement",
    items: [
      { label: "Suppliers", href: "/suppliers", icon: Users },
      { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Alerts", href: "/alerts", icon: Bell },
      { label: "Reorder Center", href: "/reorder-center", icon: ClipboardList },
      { label: "Smart Reorder", href: "/smart-reorder", icon: BarChart3 },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Expiry Management", href: "/expiry", icon: ClipboardList },
      { label: "Cost Analysis", href: "/cost-analysis", icon: Wallet },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Audit Log", href: "/audit", icon: ShieldCheck },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicPages = ["/", "/login", "/register", "/onboarding"];

  const isPublicPage = publicPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );

  if (isPublicPage) {
    return <>{children}</>;
  }

  const renderNavigation = (mobile = false) => (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {navigationSections.map((section) => (
        <section key={section.label}>
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {section.label}
          </div>

          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (mobile) setMobileMenuOpen(false);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                    active
                      ? "border-violet-400/20 bg-gradient-to-r from-violet-500/20 via-indigo-500/10 to-cyan-400/10 text-white shadow-[0_0_24px_rgba(139,92,246,0.09)]"
                      : "border-transparent text-slate-400 hover:border-white/[0.07] hover:bg-white/[0.04] hover:text-slate-100"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-300" />
                  )}

                  <Icon
                    className={`h-[17px] w-[17px] shrink-0 transition-colors ${
                      active
                        ? "text-cyan-200"
                        : "text-slate-500 group-hover:text-violet-300"
                    }`}
                  />

                  <span className="min-w-0 flex-1">{item.label}</span>

                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b18] text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute -right-40 top-20 h-[26rem] w-[26rem] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 left-[35%] h-80 w-80 rounded-full bg-indigo-600/[0.06] blur-[110px]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="glass-border hidden w-64 shrink-0 flex-col border-y-0 border-l-0 border-r-white/[0.08] bg-[#0b1020]/85 lg:flex">
          <div className="flex h-[76px] shrink-0 items-center border-b border-white/[0.07] px-5">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <div className="gradient-glow flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 text-sm font-black text-white">
                SP
              </div>

              <div>
                <div className="text-[15px] font-bold tracking-tight text-white">
                  Stock<span className="gradient-text">Pulse</span>
                </div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  Inventory intelligence
                </div>
              </div>
            </Link>
          </div>

          {renderNavigation()}

          <div className="shrink-0 border-t border-white/[0.07] p-4">
            <div className="glass-panel relative overflow-hidden p-3">
              <div className="absolute -right-5 -top-6 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="relative flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.08]">
                  <Activity className="h-4 w-4 text-cyan-200" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    StockPulse
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    Operations workspace
                  </div>
                </div>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-violet-400/50 via-cyan-300/30 to-transparent" />
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                <Sparkles className="h-3 w-3 text-violet-300" />
                Intelligent inventory control
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-border sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between border-x-0 border-t-0 border-b-white/[0.08] bg-[#0b1020]/75 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-violet-300/30 hover:bg-violet-400/10 lg:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-sm font-black text-violet-100 lg:hidden">
                SP
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
                    Stock<span className="gradient-text">Pulse</span>
                  </div>
                  <span className="hidden rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-200 sm:inline-flex">
                    Workspace
                  </span>
                </div>
                <div className="mt-1 hidden text-[11px] text-slate-500 sm:block">
                  Inventory &amp; Reorder Management
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <OfflineStatus />

              <div className="hidden text-right sm:block">
                <div className="text-xs font-semibold text-slate-200">
                  Admin
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  Organization Administrator
                </div>
              </div>

              <div className="gradient-glow flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-gradient-to-br from-violet-500/25 via-indigo-500/20 to-cyan-400/20 text-sm font-bold text-white">
                A
              </div>
            </div>
          </header>

          {mobileMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
              />

              <aside className="glass-panel fixed bottom-0 left-0 top-[76px] z-40 flex w-[min(19rem,88vw)] flex-col rounded-none rounded-tr-2xl border-l-0 border-b-0 border-t-0 bg-[#0b1020]/95 lg:hidden">
                {renderNavigation(true)}
                <div className="border-t border-white/[0.07] p-4 text-[11px] text-slate-500">
                  <span className="text-cyan-200">●</span> Inventory operations workspace
                </div>
              </aside>
            </>
          )}

          <main className="min-w-0 flex-1 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
