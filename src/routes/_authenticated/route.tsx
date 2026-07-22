import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentAdmin, logout } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, QrCode, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const admin = await getCurrentAdmin();
    if (!admin) throw redirect({ to: "/auth" });
    return { admin };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();
  const logoutFn = useServerFn(logout);

  async function handleLogout() {
    await logoutFn();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border p-6">
          <img src="/gymos-logo.png" alt="GymOS" className="h-10 w-auto" />
          <p className="mt-3 text-sm font-medium text-foreground">{admin.gym_name}</p>
          <p className="text-xs text-muted-foreground">{admin.full_name}</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/members" icon={Users} label="Socios" />
          <NavItem to="/checkin" icon={QrCode} label="Check-in" />
        </nav>
        <div className="border-t border-border p-4">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 md:hidden">
          <img src="/gymos-logo.png" alt="GymOS" className="h-8 w-auto" />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <nav className="flex gap-1 border-b border-border bg-card px-2 py-1 md:hidden">
          <MobileNav to="/dashboard" icon={LayoutDashboard} label="Panel" />
          <MobileNav to="/members" icon={Users} label="Socios" />
          <MobileNav to="/checkin" icon={QrCode} label="Check-in" />
        </nav>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
      activeProps={{ className: "active" }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function MobileNav({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
      activeProps={{ className: "active" }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
