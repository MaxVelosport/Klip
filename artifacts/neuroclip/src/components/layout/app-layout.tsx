import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogoutUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Film,
  CreditCard,
  User as UserIcon,
  Shield,
  LogOut,
  Menu,
  LayoutTemplate,
  Palette
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HelpFab } from "@/components/help-fab";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logout = useLogoutUser();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    setLocation("/");
    onClose?.();
  };

  const navItems = [
    { href: "/app/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { href: "/app/projects", label: "Проекты", icon: Film },
    { href: "/app/templates", label: "Шаблоны", icon: LayoutTemplate },
    { href: "/app/brand", label: "Бренд-кит", icon: Palette },
    { href: "/app/billing", label: "Подписка и токены", icon: CreditCard },
    { href: "/app/profile", label: "Профиль", icon: UserIcon },
  ];

  if (user?.role === "admin") {
    navItems.push({ href: "/app/admin", label: "Админ-панель", icon: Shield });
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <Link href="/app/dashboard">
          <div className="flex items-center gap-2 font-bold text-xl text-primary mb-8 cursor-pointer group">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-fuchsia-600 text-white flex items-center justify-center shadow-md"
            >
              <Film className="w-5 h-5" />
            </motion.div>
            <span className="bg-gradient-to-r from-primary to-fuchsia-600 bg-clip-text text-transparent">
              НейроКлип
            </span>
          </div>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} onClick={() => onClose?.()}>
                <div
                  className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? "text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary to-fuchsia-600 shadow-md"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 ${isActive ? "drop-shadow" : ""}`} />
                  <span className="relative z-10">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-6 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Выйти
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
            <Film className="w-4 h-4" />
          </div>
          НейроКлип
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
      <HelpFab />
    </div>
  );
}
