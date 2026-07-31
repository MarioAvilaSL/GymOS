import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentAdmin, logout } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePageTitle } from "@/components/page-title";
import {
  LayoutDashboard,
  Users,
  QrCode,
  Settings,
  Dumbbell,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const admin = await getCurrentAdmin();
    if (!admin) throw redirect({ to: "/auth" });
    return { admin };
  },
  component: AuthedLayout,
});

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/members", icon: Users, label: "Socios" },
  { to: "/checkin", icon: QrCode, label: "Check-in" },
  { to: "/routines", icon: Dumbbell, label: "Rutinas" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

function AuthedLayout() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();
  const location = useLocation();
  const logoutFn = useServerFn(logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  usePageTitle("Dashboard");

  async function handleLogout() {
    await logoutFn();
    navigate({ to: "/auth" });
  }

  const initials = admin.full_name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-secondary/20">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <LogoMark size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{admin.gym_name}</p>
            <p className="truncate text-xs text-muted-foreground">{admin.full_name}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                {item.label}
                {active && <ChevronRight className="ml-auto h-4 w-4 text-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <LogoMark size={28} />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium text-foreground">{admin.full_name}</p>
              <p className="text-muted-foreground">{admin.gym_name}</p>
            </div>
          </div>
        </header>

        {mobileOpen && (
          <div className="border-b border-border bg-card md:hidden">
            <nav className="flex gap-1 p-2">
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
