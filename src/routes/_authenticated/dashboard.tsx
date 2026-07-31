import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { usePageTitle } from "@/components/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  QrCode,
  CalendarClock,
  Dumbbell,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

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

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];
const PLAN_LABELS: Record<string, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

function DashboardPage() {
  const { data } = useSuspenseQuery(statsQuery);
  usePageTitle("Dashboard");

  const revenueChange =
    data.previousMonthRevenue > 0
      ? ((data.monthlyRevenue - data.previousMonthRevenue) / data.previousMonthRevenue) * 100
      : 100;

  const checkinChange =
    data.checkinsYesterday > 0
      ? ((data.checkinsToday - data.checkinsYesterday) / data.checkinsYesterday) * 100
      : data.checkinsToday > 0
        ? 100
        : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Resumen operativo de tu gimnasio</p>
        </div>
        <Link to="/auth" search={{ mode: "register" }}>
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-xs">
            <Activity className="h-3 w-3" /> Actualizado en vivo
          </Badge>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={Users}
          label="Socios activos"
          value={data.activeMembers}
          sub={`de ${data.totalMembers} totales`}
          accent="blue"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Vencen en 7 días"
          value={data.expiringSoon}
          sub={data.expiringSoon > 0 ? "requieren atención" : "sin novedades"}
          accent={data.expiringSoon > 0 ? "amber" : "green"}
        />
        <MetricCard
          icon={CalendarClock}
          label="Vencen este mes"
          value={data.expiringThisMonth}
          sub="próximos 30 días"
          accent={data.expiringThisMonth > 0 ? "amber" : "green"}
        />
        <MetricCard
          icon={DollarSign}
          label="Ingresos mensuales"
          value={`$${data.monthlyRevenue.toFixed(0)}`}
          sub={
            <span className="flex items-center gap-0.5">
              {revenueChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              {Math.abs(revenueChange).toFixed(0)}% vs mes anterior
            </span>
          }
          accent="green"
        />
        <MetricCard
          icon={QrCode}
          label="Check-ins hoy"
          value={data.checkinsToday}
          sub={
            <span className="flex items-center gap-0.5">
              {checkinChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              {Math.abs(checkinChange).toFixed(0)}% vs ayer
            </span>
          }
          accent="blue"
        />
        <QuickActionsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Ingresos mensuales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.revenueByMonth.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByMonth}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border/50"
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                      formatter={(v: number) => [`$${v.toFixed(0)}`, "Ingresos"]}
                    />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Datos de ingresos disponibles próximamente
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Distribución de planes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.planDistribution.length > 0 ? (
              <div className="flex h-72 items-center justify-center gap-6">
                <div className="h-56 w-56 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="count"
                        nameKey="plan"
                        strokeWidth={0}
                      >
                        {data.planDistribution.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        formatter={(v: number, name: string) => [v, PLAN_LABELS[name] ?? name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {data.planDistribution.map((p, idx) => (
                    <div key={p.plan} className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-medium">{PLAN_LABELS[p.plan] ?? p.plan}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.count} socio{p.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Sin datos de planes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Check-ins semanales</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.checkinTrend.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.checkinTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border/50"
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Aún no hay check-ins esta semana
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Accesos recientes</CardTitle>
            <Badge variant="outline" className="text-xs">
              {data.recentCheckins.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentCheckins.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aún no hay accesos registrados
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentCheckins.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("es-EC", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <span className="hidden text-xs capitalize text-muted-foreground sm:inline">
                        {c.plan}
                      </span>
                      {c.result === "ok" ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                          OK
                        </Badge>
                      ) : c.result === "expired" ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          Vencido
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        >
                          No encontrado
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string | React.ReactNode;
  accent?: "blue" | "green" | "amber" | "red";
}) {
  const accentStyles: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className={"rounded-lg p-2 " + accentStyles[accent ?? "blue"]}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Acciones rápidas
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            to="/members"
            className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <UserPlus className="h-3.5 w-3.5" /> Nuevo socio
          </Link>
          <Link
            to="/checkin"
            className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            <QrCode className="h-3.5 w-3.5" /> Check-in rápido
          </Link>
          <Link
            to="/members"
            className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
          >
            <Dumbbell className="h-3.5 w-3.5" /> Asignar rutina
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
