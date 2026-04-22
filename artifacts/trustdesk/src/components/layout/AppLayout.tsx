import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Ticket, User as UserIcon, Shield, Activity } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isStaff, logout } = useAuth();
  const [location] = useLocation();

  if (!user) {
    return <div className="min-h-[100dvh] bg-background">{children}</div>;
  }

  const navItems = [
    ...(isStaff ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    { href: "/tickets", label: "Tickets", icon: Ticket },
    ...(isStaff ? [{ href: "/audit", label: "Audit Log", icon: Activity }] : []),
    { href: "/profile", label: "Profile", icon: UserIcon },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-mono font-bold tracking-tight text-lg text-sidebar-foreground">{APP_NAME}</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={() => logout()}>
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile nav header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-mono font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => logout()}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      <main className="flex-1 flex flex-col md:pl-0 pt-14 md:pt-0 h-[100dvh] overflow-hidden">
        {children}
      </main>
    </div>
  );
}
