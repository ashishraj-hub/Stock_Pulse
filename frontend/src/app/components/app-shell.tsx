"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  ScanLine,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Wallet,
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
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Inventory",
        href: "/inventory",
        icon: Boxes,
      },
      {
        label: "Items",
        href: "/items",
        icon: Package,
      },
      {
        label: "Locations",
        href: "/locations",
        icon: Warehouse,
      },
      {
        label: "Batches",
        href: "/batches",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Stock",
    items: [
      {
        label: "Scanner",
        href: "/scanner",
        icon: ScanLine,
      },
      {
        label: "Stock Operations",
        href: "/stock-operations",
        icon: Settings,
      },
      {
        label: "Stock Movements",
        href: "/stock-movements",
        icon: Truck,
      },
    ],
  },
  {
    label: "Procurement",
    items: [
      {
        label: "Suppliers",
        href: "/suppliers",
        icon: Users,
      },
      {
        label: "Purchase Orders",
        href: "/purchase-orders",
        icon: ShoppingCart,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "Alerts",
        href: "/alerts",
        icon: Bell,
      },
      {
        label: "Reorder Center",
        href: "/reorder-center",
        icon: ClipboardList,
      },
      {
        label: "Smart Reorder",
        href: "/smart-reorder",
        icon: BarChart3,
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
      {
        label: "Cost Analysis",
        href: "/cost-analysis",
        icon: Wallet,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users",
        href: "/users",
        icon: Users,
      },
      {
        label: "Audit Log",
        href: "/audit",
        icon: ShieldCheck,
      },
    ],
  },
];

function isActivePath(
  pathname: string,
  href: string,
): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();

  const publicPages = [
    "/",
    "/login",
    "/register",
    "/onboarding",
  ];

  const isPublicPage =
    publicPages.some(
      (page) =>
        pathname === page ||
        pathname.startsWith(`${page}/`),
    );

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-slate-800 px-5">
            <Link
              href="/dashboard"
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                SP
              </div>

              <div>
                <div className="text-sm font-semibold text-white">
                  StockPulse
                </div>

                <div className="text-xs text-slate-400">
                  Inventory Intelligence
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-5">
            <div className="space-y-6">
              {navigationSections.map(
                (section) => (
                  <div
                    key={section.label}
                  >
                    <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {section.label}
                    </div>

                    <div className="space-y-1">
                      {section.items.map(
                        (item) => {
                          const Icon =
                            item.icon;

                          const active =
                            isActivePath(
                              pathname,
                              item.href,
                            );

                          return (
                            <Link
                              key={item.href}
                              href={
                                item.href
                              }
                              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                                active
                                  ? "bg-blue-600/15 text-blue-400"
                                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />

                              <span>
                                {
                                  item.label
                                }
                              </span>
                            </Link>
                          );
                        },
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="rounded-lg bg-slate-800/60 p-3">
              <div className="text-xs font-medium text-slate-300">
                StockPulse
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Inventory management
                system
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/15 text-sm font-semibold text-blue-400 lg:hidden">
                SP
              </div>

              <div>
                <div className="text-sm font-semibold text-white">
                  StockPulse
                </div>

                <div className="text-xs text-slate-500">
                  Inventory & Reorder
                  Management
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <OfflineStatus />

              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-slate-200">
                  Admin
                </div>

                <div className="text-xs text-slate-500">
                  Organization
                  Administrator
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
                A
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}