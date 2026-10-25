import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthGuard, removeAdminToken } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  Dices,
  Store,
  Trophy,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Settings,
  WalletCards,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/users", label: "Users", icon: Users },
  { path: "/bets", label: "Bets", icon: Dices },
  { path: "/markets", label: "Markets", icon: Store },
  { path: "/results", label: "Results", icon: Trophy },
  { path: "/transactions/deposits", label: "Deposits", icon: ArrowDownToLine },
  { path: "/transactions/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/upi-accounts", label: "UPI Accounts", icon: WalletCards },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthGuard();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer whenever the page changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    removeAdminToken();
    toast({ title: "Logged out successfully" });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Backdrop for the mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: fixed drawer on phones/tablets, sticky column on large screens */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[80vw] bg-[#111111] border-r border-[#2a2a2a] flex flex-col h-screen transform transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-[#2a2a2a] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 text-[#bfdb81]">
              <Trophy className="h-8 w-8 text-[#48723e]" />
              <h1 className="text-xl font-bold tracking-wider">LUCKY777</h1>
            </div>
            <p className="text-xs text-[#a0a0a0] mt-1 font-mono uppercase tracking-widest">Admin Control</p>
          </div>
          <button
            className="lg:hidden p-2 -mr-2 -mt-1 text-[#a0a0a0] hover:text-white"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-[#1a4718] to-[#48723e] text-white shadow-lg shadow-[#1a4718]/20"
                    : "text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#2a2a2a]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#2a2a2a] bg-[#111111]/80 backdrop-blur-md sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-8">
          <button
            className="lg:hidden p-2 -ml-2 text-white"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            data-testid="button-open-menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold text-white truncate">
            {navItems.find(i => location.startsWith(i.path))?.label || "Admin Panel"}
          </h2>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
