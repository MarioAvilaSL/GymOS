import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  getCurrentMember,
  listMyWorkouts,
  type ClientWorkout,
  type CurrentMember,
} from "@/lib/client-auth.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PortalNav } from "@/components/portal-nav";
import { usePageTitle } from "@/components/page-title";
import {
  Dumbbell,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  User,
  ShieldCheck,
  Clock,
} from "lucide-react";

const workoutsQuery = queryOptions({
  queryKey: ["my-workouts"],
  queryFn: () => listMyWorkouts(),
});

export const Route = createFileRoute("/portal/dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const member = await getCurrentMember();
    if (!member) throw redirect({ to: "/portal/login" });
    return { member };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(workoutsQuery),
  component: ClientDashboard,
});

function ClientDashboard() {
  const { member } = Route.useRouteContext();
  const { data: workouts } = useSuspenseQuery(workoutsQuery);
  const [qrOpen, setQrOpen] = useState(false);
  usePageTitle("Mi portal");

  return (
    <div className="min-h-screen bg-secondary/20">
      <PortalNav member={member} active="dashboard" onQrClick={() => setQrOpen(true)} />

      <MyAccessModal member={member} open={qrOpen} onClose={() => setQrOpen(false)} />

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {member.full_name
                  .split(" ")
                  .map((n) => n.charAt(0))
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Hola, {member.full_name.split(" ")[0]}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Resumen de tu membresía y rutinas asignadas
                </p>
              </div>
            </div>
          </div>
        </div>

        <MembershipCard member={member} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tus entrenamientos</h2>
              <p className="text-sm text-muted-foreground">
                {workouts.length} rutina{workouts.length === 1 ? "" : "s"} asignada
                {workouts.length === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Dumbbell className="h-3.5 w-3.5" /> {workouts.length}
            </Badge>
          </div>

          {workouts.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                <div className="rounded-full bg-secondary p-4">
                  <Dumbbell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">Aún no tienes rutinas asignadas</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Habla con tu entrenador para que te asigne un plan de entrenamiento personalizado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workouts.map((w) => (
                <WorkoutCard key={w.id} workout={w} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MembershipCard({ member }: { member: CurrentMember }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(member.end_date);
  const start = new Date(member.start_date);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / msPerDay);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
  const elapsed = Math.min(totalDays, Math.max(0, totalDays - Math.max(0, daysLeft)));
  const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const active = daysLeft >= 0 && member.status === "active";

  return (
    <Card
      className={
        active
          ? "border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08]"
          : "border-destructive/20 bg-gradient-to-br from-destructive/[0.04] to-destructive/[0.08]"
      }
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              Membresía · Plan {member.plan}
            </CardDescription>
            <CardTitle className="mt-1.5 text-2xl">{active ? "Activa" : "Vencida"}</CardTitle>
          </div>
          {active ? (
            <Badge className="gap-1.5 bg-emerald-600 hover:bg-emerald-600 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Al día
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Renovar
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric
            label="Días restantes"
            value={active ? `${daysLeft}` : "0"}
            icon={<Clock className="h-4 w-4" />}
          />
          <Metric
            label="Vence"
            value={member.end_date}
            icon={<CalendarClock className="h-4 w-4" />}
          />
          <Metric
            label="Desde"
            value={member.start_date}
            icon={<CalendarClock className="h-4 w-4" />}
          />
          <Metric label="Plan" value={member.plan} icon={<Dumbbell className="h-4 w-4" />} />
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progreso del ciclo</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}

function MyAccessModal({
  member,
  open,
  onClose,
}: {
  member: CurrentMember;
  open: boolean;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState("");

  if (open && !dataUrl) {
    QRCode.toDataURL(member.qr_token, { width: 320, margin: 2 }).then(setDataUrl);
  }

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${member.full_name.trim().replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(member.access_code);
      toast.success("Código copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el código");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setDataUrl("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mi acceso</DialogTitle>
          <DialogDescription>
            Muestra este código QR en la entrada del gimnasio para tu check-in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {dataUrl ? (
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              <img src={dataUrl} alt="QR" className="h-64 w-64" />
            </div>
          ) : (
            <div className="h-64 w-64 animate-pulse rounded-xl bg-muted" />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!dataUrl}
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" /> Descargar QR
            </Button>
          </div>

          <Separator />

          <div className="grid w-full grid-cols-2 gap-4 text-center text-xs text-muted-foreground">
            <div>
              <p className="mb-1">Token QR</p>
              <code className="inline-block rounded-md bg-secondary px-3 py-1.5 font-mono text-xs">
                {member.qr_token}
              </code>
            </div>
            <div>
              <p className="mb-1">Código de acceso</p>
              <div className="flex items-center justify-center gap-1.5">
                <code className="inline-block rounded-md bg-secondary px-3 py-1.5 font-mono text-sm font-bold tracking-widest">
                  {member.access_code}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyCode}
                  title="Copiar código"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutCard({ workout }: { workout: ClientWorkout }) {
  const totalExercises = workout.blocks.reduce((acc, b) => acc + (b.exercises?.length ?? 0), 0);

  return (
    <Card className="flex flex-col transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">{workout.title}</CardTitle>
            {workout.summary && (
              <CardDescription className="mt-1">{workout.summary}</CardDescription>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {workout.blocks.length} bloque{workout.blocks.length === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline">
            {totalExercises} ejercicio{totalExercises === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="space-y-2">
          {workout.blocks.map((block, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-3">
              <p className="text-sm font-semibold">{block.name}</p>
              <ul className="mt-2 space-y-1">
                {block.exercises.slice(0, 4).map((ex, j) => (
                  <li key={j} className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{ex.name}</span>
                    <span className="shrink-0 font-medium text-foreground">
                      {[ex.sets, ex.reps].filter(Boolean).join(" × ")}
                    </span>
                  </li>
                ))}
                {block.exercises.length > 4 && (
                  <li className="text-xs italic text-muted-foreground">
                    +{block.exercises.length - 4} más
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
