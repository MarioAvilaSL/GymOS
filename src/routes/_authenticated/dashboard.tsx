import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, DollarSign, QrCode } from "lucide-react";

const statsQuery = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: () => getDashboardStats(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function DashboardPage() {
  const { data } = useSuspenseQuery(statsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen operativo de tu gimnasio.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Socios activos" value={data.activeMembers} />
        <StatCard
          icon={AlertTriangle}
          label="Vencen en 7 días"
          value={data.expiringSoon}
          accent={data.expiringSoon > 0 ? "warn" : undefined}
        />
        <StatCard
          icon={DollarSign}
          label="Ingresos del mes"
          value={`$${data.monthlyRevenue.toFixed(2)}`}
        />
        <StatCard icon={QrCode} label="Check-ins hoy" value={data.checkinsToday} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos accesos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay accesos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentCheckins.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("es-EC")}
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-1 text-xs font-medium " +
                      (c.result === "ok"
                        ? "bg-green-100 text-green-800"
                        : c.result === "expired"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800")
                    }
                  >
                    {c.result === "ok"
                      ? "OK"
                      : c.result === "expired"
                        ? "Vencido"
                        : "No encontrado"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: "warn";
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon
            className={
              "h-5 w-5 " + (accent === "warn" ? "text-yellow-600" : "text-primary")
            }
          />
        </div>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
