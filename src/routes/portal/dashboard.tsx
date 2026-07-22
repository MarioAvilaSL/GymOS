import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  getCurrentMember,
  listMyWorkouts,
  memberLogout,
  type ClientWorkout,
  type CurrentMember,
} from "@/lib/client-auth.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Dumbbell,
  CalendarClock,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  Copy,
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
  const navigate = useNavigate();
  const logoutFn = useServerFn(memberLogout);
  const [qrOpen, setQrOpen] = useState(false);

  async function handleLogout() {
    await logoutFn();
    navigate({ to: "/portal/login" });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/gymos-logo.png" alt="GymOS" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{member.gym_name}</p>
              <p className="text-xs text-muted-foreground">Portal del socio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <QrCode className="mr-2 h-4 w-4" /> Mi QR y código
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <MyAccessDialog member={member} open={qrOpen} onClose={() => setQrOpen(false)} />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hola, {member.full_name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Este es el resumen de tu membresía y tus rutinas asignadas.
          </p>
        </div>

        <MembershipCard member={member} />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tus entrenamientos</h2>
            <Badge variant="secondary">{workouts.length} rutina{workouts.length === 1 ? "" : "s"}</Badge>
          </div>

          {workouts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <Dumbbell className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Aún no tienes rutinas asignadas</p>
                <p className="text-sm text-muted-foreground">
                  Habla con tu entrenador para que te asigne un plan.
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
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / msPerDay),
  );
  const elapsed = Math.min(totalDays, Math.max(0, totalDays - Math.max(0, daysLeft)));
  const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const active = daysLeft >= 0 && member.status === "active";

  return (
    <Card
      className={
        active
          ? "border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10"
          : "border-destructive/40 bg-destructive/5"
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription className="uppercase tracking-wide">
              Membresía · Plan {member.plan}
            </CardDescription>
            <CardTitle className="mt-1 text-2xl">
              {active ? "Activa" : "Vencida"}
            </CardTitle>
          </div>
          {active ? (
            <Badge className="gap-1 bg-green-600 hover:bg-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Al día
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Renovar
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Días restantes" value={active ? `${daysLeft}` : "0"} />
          <Metric label="Vence" value={member.end_date} icon={<CalendarClock className="h-4 w-4" />} />
          <Metric label="Desde" value={member.start_date} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso del ciclo</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardContent>
    </Card>
  );
}

function MyAccessDialog({
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi acceso</DialogTitle>
          <DialogDescription>
            Muestra este código QR en la entrada del gimnasio para tu check-in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          {dataUrl ? (
            <img src={dataUrl} alt="QR" className="rounded-md border border-border" />
          ) : (
            <div className="h-[320px] w-[320px] animate-pulse rounded-md bg-muted" />
          )}

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

          <div className="text-center text-xs text-muted-foreground">
            <p>Token QR</p>
            <code className="mt-1 inline-block rounded bg-muted px-2 py-1">
              {member.qr_token}
            </code>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Código de acceso al portal</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <code className="inline-block rounded bg-muted px-2 py-1 text-sm font-semibold">
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
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function WorkoutCard({ workout }: { workout: ClientWorkout }) {
  const totalExercises = workout.blocks.reduce(
    (acc, b) => acc + (b.exercises?.length ?? 0),
    0,
  );
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
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
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{workout.blocks.length} bloques</Badge>
          <Badge variant="outline">{totalExercises} ejercicios</Badge>
        </div>
        <ul className="space-y-2">
          {workout.blocks.map((block, i) => (
            <li key={i} className="rounded-md border border-border bg-background/50 p-3">
              <p className="text-sm font-semibold">{block.name}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {block.exercises.slice(0, 4).map((ex, j) => (
                  <li key={j} className="flex justify-between gap-2">
                    <span className="truncate">{ex.name}</span>
                    <span className="shrink-0 font-medium text-foreground">
                      {[ex.sets, ex.reps].filter(Boolean).join(" × ")}
                    </span>
                  </li>
                ))}
                {block.exercises.length > 4 && (
                  <li className="italic">
                    +{block.exercises.length - 4} más…
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
