import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  getCurrentMember,
  listMyWorkouts,
  createMyWorkout,
  deleteMyWorkout,
  type ClientWorkout,
} from "@/lib/client-auth.functions";
import {
  listAvailablePresets,
  selectPresetWorkout,
  type PresetWorkout,
} from "@/lib/preset-workouts.functions";
import { PortalNav } from "@/components/portal-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageTitle } from "@/components/page-title";
import {
  Dumbbell,
  Plus,
  CheckCircle2,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/portal/routines")({
  ssr: false,
  beforeLoad: async () => {
    const member = await getCurrentMember();
    if (!member) throw redirect({ to: "/portal/login" });
    return { member };
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(presetsQuery),
      context.queryClient.ensureQueryData(myWorkoutsQuery),
    ]);
  },
  component: PortalRoutines,
});

const presetsQuery = queryOptions({
  queryKey: ["available-presets"],
  queryFn: () => listAvailablePresets(),
});

const myWorkoutsQuery = queryOptions({
  queryKey: ["my-workouts"],
  queryFn: () => listMyWorkouts(),
});

function PortalRoutines() {
  const { member } = Route.useRouteContext();
  const { data: presets } = useSuspenseQuery(presetsQuery);
  const { data: myWorkouts } = useSuspenseQuery(myWorkoutsQuery);
  const qc = useQueryClient();
  usePageTitle("Mis rutinas");

  const deleteFn = useServerFn(deleteMyWorkout);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteFn({ data: { id } });
      toast.success("Rutina eliminada");
      qc.invalidateQueries({ queryKey: ["my-workouts"] });
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  const myTitles = new Set(myWorkouts.map((w) => w.title));

  return (
    <div className="min-h-screen bg-secondary/20">
      <PortalNav member={member} active="routines" />

      <main className="mx-auto max-w-5xl space-y-10 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis rutinas</h1>
            <p className="mt-1 text-sm text-muted-foreground">Administra tus rutinas personales</p>
          </div>
          <CreateWorkoutDialog onDone={() => qc.invalidateQueries({ queryKey: ["my-workouts"] })} />
        </div>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Tus rutinas</h2>
          {myWorkouts.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
                <div className="rounded-full bg-secondary p-4">
                  <Dumbbell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">Aún no tienes rutinas</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Crea tu propia rutina o selecciona una de las rutinas predefinidas del gimnasio.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myWorkouts.map((w) => (
                <MyWorkoutCard
                  key={w.id}
                  workout={w}
                  deleting={deleting === w.id}
                  onDelete={() => handleDelete(w.id)}
                />
              ))}
            </div>
          )}
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-lg font-semibold">Rutinas del gimnasio</h2>
          {presets.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
                <div className="rounded-full bg-secondary p-4">
                  <Dumbbell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">Aún no hay rutinas disponibles</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Tu gimnasio aún no ha publicado rutinas predefinidas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {presets.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  alreadySelected={myTitles.has(p.title)}
                  onSelect={async () => {
                    try {
                      await selectPresetWorkout({ data: { presetId: p.id } });
                      toast.success(`"${p.title}" añadida a tus rutinas`);
                      qc.invalidateQueries({ queryKey: ["my-workouts"] });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Error al seleccionar");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MyWorkoutCard({
  workout,
  deleting,
  onDelete,
}: {
  workout: ClientWorkout;
  deleting: boolean;
  onDelete: () => void;
}) {
  const totalEx = workout.blocks.reduce((a, b) => a + (b.exercises?.length ?? 0), 0);

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
            {totalEx} ejercicio{totalEx === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="space-y-1.5">
          {workout.blocks.slice(0, 3).map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              {b.name}
              {b.exercises.length > 0 && (
                <span className="text-muted-foreground/60">
                  ({b.exercises.map((e) => e.name).join(", ")}
                  {b.exercises.length > 3 ? "..." : ""})
                </span>
              )}
            </div>
          ))}
          {workout.blocks.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{workout.blocks.length - 3} bloques más
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
          disabled={deleting}
          onClick={onDelete}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Eliminar rutina
        </Button>
      </CardContent>
    </Card>
  );
}

function PresetCard({
  preset,
  alreadySelected,
  onSelect,
}: {
  preset: PresetWorkout;
  alreadySelected: boolean;
  onSelect: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const totalEx = preset.blocks.reduce((a, b) => a + (b.exercises?.length ?? 0), 0);

  return (
    <Card className="flex flex-col transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">{preset.title}</CardTitle>
            {preset.summary && <CardDescription className="mt-1">{preset.summary}</CardDescription>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {preset.blocks.length} bloque{preset.blocks.length === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline">
            {totalEx} ejercicio{totalEx === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="space-y-1.5">
          {preset.blocks.slice(0, 3).map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              {b.name}
              {b.exercises.length > 0 && (
                <span className="text-muted-foreground/60">
                  ({b.exercises.map((e) => e.name).join(", ")}
                  {b.exercises.length > 3 ? "..." : ""})
                </span>
              )}
            </div>
          ))}
          {preset.blocks.length > 3 && (
            <p className="text-xs text-muted-foreground">+{preset.blocks.length - 3} bloques más</p>
          )}
        </div>
        <Button
          className="w-full gap-2"
          variant={alreadySelected ? "outline" : "default"}
          disabled={alreadySelected || loading}
          onClick={async () => {
            setLoading(true);
            await onSelect();
            setLoading(false);
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : alreadySelected ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {alreadySelected ? "Ya la tienes asignada" : "Seleccionar rutina"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateWorkoutDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Crear rutina
        </Button>
      </DialogTrigger>
      <WorkoutForm
        onDone={() => {
          setOpen(false);
          onDone();
        }}
      />
    </Dialog>
  );
}

interface WorkoutBlock {
  name: string;
  exercises: { name: string; sets?: string; reps?: string }[];
}

function WorkoutForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createMyWorkout);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([
    { name: "Bloque 1", exercises: [{ name: "", sets: "", reps: "" }] },
  ]);

  function addBlock() {
    setBlocks([
      ...blocks,
      { name: `Bloque ${blocks.length + 1}`, exercises: [{ name: "", sets: "", reps: "" }] },
    ]);
  }

  function updateBlock(i: number, field: keyof WorkoutBlock, value: string) {
    const copy = [...blocks];
    copy[i] = { ...copy[i], [field]: value };
    setBlocks(copy);
  }

  function addExercise(blockIdx: number) {
    const copy = [...blocks];
    copy[blockIdx] = {
      ...copy[blockIdx],
      exercises: [...copy[blockIdx].exercises, { name: "", sets: "", reps: "" }],
    };
    setBlocks(copy);
  }

  function updateExercise(blockIdx: number, exIdx: number, field: string, value: string) {
    const copy = [...blocks];
    copy[blockIdx] = {
      ...copy[blockIdx],
      exercises: copy[blockIdx].exercises.map((ex, ei) =>
        ei === exIdx ? { ...ex, [field]: value } : ex,
      ),
    };
    setBlocks(copy);
  }

  function removeExercise(blockIdx: number, exIdx: number) {
    const copy = [...blocks];
    copy[blockIdx] = {
      ...copy[blockIdx],
      exercises: copy[blockIdx].exercises.filter((_, ei) => ei !== exIdx),
    };
    setBlocks(copy);
  }

  function removeBlock(i: number) {
    setBlocks(blocks.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const cleaned = blocks
      .filter((b) => b.name.trim())
      .map((b) => ({
        ...b,
        exercises: b.exercises.filter((ex) => ex.name.trim()),
      }))
      .filter((b) => b.exercises.length > 0);
    if (cleaned.length === 0) {
      toast.error("Agrega al menos un bloque con ejercicios");
      return;
    }
    try {
      await createFn({
        data: { title: title.trim(), summary: summary.trim() || undefined, blocks: cleaned },
      });
      toast.success("Rutina creada");
      qc.invalidateQueries({ queryKey: ["my-workouts"] });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Nueva rutina personalizada</DialogTitle>
        <DialogDescription>
          Crea tu propia rutina con los bloques y ejercicios que prefieras.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="wtitle">Título</Label>
          <Input
            id="wtitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Full Body"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wsummary">Descripción (opcional)</Label>
          <Textarea
            id="wsummary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Breve descripción de la rutina"
            rows={2}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Bloques de ejercicios</p>
          <Button type="button" variant="outline" size="sm" onClick={addBlock} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Añadir bloque
          </Button>
        </div>
        {blocks.map((block, bi) => (
          <div key={bi} className="rounded-xl border border-border/60 bg-secondary/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Input
                  value={block.name}
                  onChange={(e) => updateBlock(bi, "name", e.target.value)}
                  placeholder="Nombre del bloque"
                  className="h-8 text-sm font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => removeBlock(bi)}
                className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 pl-6">
              {block.exercises.map((ex, ei) => (
                <div key={ei} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs text-muted-foreground">Ejercicio</Label>
                    <Input
                      value={ex.name}
                      onChange={(e) => updateExercise(bi, ei, "name", e.target.value)}
                      placeholder="Nombre"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-16">
                    <Label className="text-xs text-muted-foreground">Sets</Label>
                    <Input
                      value={ex.sets ?? ""}
                      onChange={(e) => updateExercise(bi, ei, "sets", e.target.value)}
                      placeholder="3"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-16">
                    <Label className="text-xs text-muted-foreground">Reps</Label>
                    <Input
                      value={ex.reps ?? ""}
                      onChange={(e) => updateExercise(bi, ei, "reps", e.target.value)}
                      placeholder="12"
                      className="h-8 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExercise(bi, ei)}
                    className="mb-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addExercise(bi)}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> Ejercicio
              </Button>
            </div>
          </div>
        ))}
        <DialogFooter>
          <Button type="submit">Crear rutina</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
