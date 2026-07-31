import { useServerFn } from "@tanstack/react-start";
import { useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { memberLogout } from "@/lib/client-auth.functions";
import { LayoutDashboard, Dumbbell, LogOut, QrCode } from "lucide-react";

export type PortalTab = "dashboard" | "routines";

export function PortalNav({
  member,
  active,
  onQrClick,
}: {
  member: { full_name: string; gym_name: string };
  active: PortalTab;
  onQrClick?: () => void;
}) {
  const navigate = useNavigate();
  const logoutFn = useServerFn(memberLogout);

  async function handleLogout() {
    await logoutFn();
    navigate({ to: "/portal/login" });
  }

  const tabs = [
    {
      key: "dashboard" as PortalTab,
      label: "Mi portal",
      to: "/portal/dashboard",
      icon: LayoutDashboard,
    },
    { key: "routines" as PortalTab, label: "Rutinas", to: "/portal/routines", icon: Dumbbell },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <LogoMark size={28} />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold">{member.gym_name}</p>
            <p className="text-xs text-muted-foreground">Portal del socio</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Link key={tab.key} to={tab.to}>
              <Button
                variant={active === tab.key ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            </Link>
          ))}
          {onQrClick && (
            <Button variant="outline" size="sm" onClick={onQrClick} className="gap-2 ml-1">
              <QrCode className="h-4 w-4" /> Mi acceso
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
