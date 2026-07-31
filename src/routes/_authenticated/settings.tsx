import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePageTitle } from "@/components/page-title";
import {
  exportMembersCsv,
  exportCheckinsCsv,
  exportRevenueCsv,
  getGymInfo,
} from "@/lib/settings.functions";
import {
  Download,
  Users,
  QrCode,
  DollarSign,
  Building2,
  ShieldCheck,
  Database,
  FileDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const infoQuery = queryOptions({
  queryKey: ["gym-info"],
  queryFn: () => getGymInfo(),
});

function SettingsPage() {
  usePageTitle("Configuración");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">Administra tu gimnasio y exporta tus datos</p>
      </div>

      <GymInfoCard />

      <ExportSection />

      <DangerZone />
    </div>
  );
}

function GymInfoCard() {
  const { data } = useQuery(infoQuery);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Información del gimnasio</CardTitle>
          <CardDescription>Resumen de tu cuenta y base de datos</CardDescription>
        </div>
        <Building2 className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex h-20 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Building2} label="Gimnasio" value={data.gymName} />
            <Stat icon={ShieldCheck} label="Administrador" value={data.adminName} />
            <Stat icon={Users} label="Socios activos" value={String(data.activeMembers)} />
            <Stat
              icon={Database}
              label="Total registros"
              value={String(data.totalMembers + data.totalCheckins)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ExportSection() {
  const membersFn = useServerFn(exportMembersCsv);
  const checkinsFn = useServerFn(exportCheckinsCsv);
  const revenueFn = useServerFn(exportRevenueCsv);

  async function handleExport(fn: () => Promise<string>, filename: string) {
    try {
      const csv = await fn();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${filename} descargado`);
    } catch {
      toast.error("Error al exportar");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Exportar datos</CardTitle>
          <CardDescription>
            Descarga tus registros en formato CSV para análisis externo
          </CardDescription>
        </div>
        <FileDown className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <ExportButton
            icon={Users}
            label="Socios"
            desc="Nombre, plan, fechas, estado"
            filename={`socios-${new Date().toISOString().slice(0, 10)}.csv`}
            onExport={() =>
              handleExport(() => membersFn(), `socios-${new Date().toISOString().slice(0, 10)}.csv`)
            }
          />
          <ExportButton
            icon={QrCode}
            label="Check-ins"
            desc="Socio, resultado, fecha"
            filename={`checkins-${new Date().toISOString().slice(0, 10)}.csv`}
            onExport={() =>
              handleExport(
                () => checkinsFn(),
                `checkins-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
          />
          <ExportButton
            icon={DollarSign}
            label="Ingresos"
            desc="Ingreso mensual (12 meses)"
            filename={`ingresos-${new Date().toISOString().slice(0, 10)}.csv`}
            onExport={() =>
              handleExport(
                () => revenueFn(),
                `ingresos-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ExportButton({
  icon: Icon,
  label,
  desc,
  onExport,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  onExport: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
    >
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary ring-1 ring-primary/20 ring-inset transition-colors group-hover:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <Download className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}

function DangerZone() {
  const { data } = useQuery(infoQuery);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Resumen de la base de datos</CardTitle>
          <CardDescription>Totales acumulados en tu instancia</CardDescription>
        </div>
        <Database className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex h-12 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 text-center">
              <p className="text-2xl font-bold">{data.totalMembers}</p>
              <p className="text-xs text-muted-foreground">Socios registrados</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 text-center">
              <p className="text-2xl font-bold">{data.activeMembers}</p>
              <p className="text-xs text-muted-foreground">Socios activos</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 text-center">
              <p className="text-2xl font-bold">{data.totalCheckins}</p>
              <p className="text-xs text-muted-foreground">Check-ins totales</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
