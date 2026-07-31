import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  listPresetWorkouts,
  createPresetWorkout,
  updatePresetWorkout,
  deletePresetWorkout,
  type PresetWorkout,
  type PresetBlock,
} from "@/lib/preset-workouts.functions";
import { Plus, Dumbbell, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/routines")({
  component: RoutinesPage,
});

const presetsQuery = queryOptions({
  queryKey: ["preset-workouts"],
  queryFn: () => listPresetWorkouts(),
});

function RoutinesPage() {
  usePageTitle("Rutinas predefinidas");
  const { data } = useQuery(presetsQuery);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PresetWorkout | null>(null);
  const qc = useQueryClient();

  const deleteFn = useServerFn(deletePresetWorkout);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteFn({ data: { id } });
      toast.success("Rutina eliminada");
      qc.invalidateQueries({ queryKey: ["preset-workouts"] });
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Rutinas predefinidas</h1>
          <p className="mt-1 text-muted-foreground">
            Crea catálogos de rutinas para que tus socios elijan libremente
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nueva rutina
            </Button>
          </DialogTrigger>
          <PresetForm
            onDone={() => {
              setCreateOpen(false);
              qc.invalidateQueries({ queryKey: ["preset-workouts"] });
            }}
          />
        </Dialog>
      </div>

      {!data || data.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-4 p-16 text-center">
            <div className="rounded-full bg-secondary p-4">
              <Dumbbell className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Aún no hay rutinas predefinidas</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Crea tu primer catálogo de rutinas para que los socios puedan escogerlas desde su
              portal.
            </p>
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Crear primera rutina
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} className="flex flex-col transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg">{p.title}</CardTitle>
                    {p.summary && <CardDescription className="mt-1">{p.summary}</CardDescription>}
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {p.blocks.length} bloque{p.blocks.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">
                    {p.blocks.reduce((a, b) => a + (b.exercises?.length ?? 0), 0)} ejercicio
                    {p.blocks.reduce((a, b) => a + (b.exercises?.length ?? 0), 0) === 1 ? "" : "s"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Dialog
                    open={editTarget?.id === p.id}
                    onOpenChange={(v) => {
                      if (!v) setEditTarget(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setEditTarget(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                    </DialogTrigger>
                    {editTarget?.id === p.id && (
                      <PresetForm
                        preset={editTarget}
                        onDone={() => {
                          setEditTarget(null);
                          qc.invalidateQueries({ queryKey: ["preset-workouts"] });
                        }}
                      />
                    )}
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={deleting === p.id}
                    onClick={() => handleDelete(p.id)}
                  >
                    {deleting === p.id ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}{" "}
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PresetForm({ preset, onDone }: { preset?: PresetWorkout; onDone: () => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createPresetWorkout);
  const updateFn = useServerFn(updatePresetWorkout);
  const [title, setTitle] = useState(preset?.title ?? "");
  const [summary, setSummary] = useState(preset?.summary ?? "");
  const [blocks, setBlocks] = useState<PresetBlock[]>(
    preset?.blocks ?? [{ name: "Bloque 1", exercises: [{ name: "", sets: "", reps: "" }] }],
  );

  function addBlock() {
    setBlocks([
      ...blocks,
      { name: `Bloque ${blocks.length + 1}`, exercises: [{ name: "", sets: "", reps: "" }] },
    ]);
  }

  function updateBlock(i: number, field: keyof PresetBlock, value: string) {
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
      if (preset) {
        await updateFn({
          data: {
            id: preset.id,
            title: title.trim(),
            summary: summary.trim() || undefined,
            blocks: cleaned,
          },
        });
        toast.success("Rutina actualizada");
      } else {
        await createFn({
          data: { title: title.trim(), summary: summary.trim() || undefined, blocks: cleaned },
        });
        toast.success("Rutina creada");
      }
      qc.invalidateQueries({ queryKey: ["preset-workouts"] });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{preset ? "Editar rutina" : "Nueva rutina predefinida"}</DialogTitle>
        <DialogDescription>
          Define los bloques y ejercicios. Los socios podrán escoger esta rutina desde su portal.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ptitle">Título</Label>
          <Input
            id="ptitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Full Body"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="psummary">Descripción (opcional)</Label>
          <Textarea
            id="psummary"
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
          <BlockEditor
            key={bi}
            block={block}
            index={bi}
            onChange={(field, value) => updateBlock(bi, field, value)}
            onAddExercise={() => addExercise(bi)}
            onUpdateExercise={(ei, field, value) => updateExercise(bi, ei, field, value)}
            onRemoveExercise={(ei) => removeExercise(bi, ei)}
            onRemove={() => removeBlock(bi)}
          />
        ))}
        <DialogFooter>
          <Button type="submit">{preset ? "Guardar cambios" : "Crear rutina"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function BlockEditor({
  block,
  index,
  onChange,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onRemove,
}: {
  block: PresetBlock;
  index: number;
  onChange: (field: "name", value: string) => void;
  onAddExercise: () => void;
  onUpdateExercise: (ei: number, field: string, value: string) => void;
  onRemoveExercise: (ei: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" onClick={() => setOpen(!open)} className="p-0.5">
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <Input
            value={block.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Nombre del bloque"
            className="h-8 text-sm font-medium"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="space-y-2 pl-6">
          {block.exercises.map((ex, ei) => (
            <div key={ei} className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <Label className="text-xs text-muted-foreground">Ejercicio</Label>
                <Input
                  value={ex.name}
                  onChange={(e) => onUpdateExercise(ei, "name", e.target.value)}
                  placeholder="Nombre"
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-16">
                <Label className="text-xs text-muted-foreground">Sets</Label>
                <Input
                  value={ex.sets ?? ""}
                  onChange={(e) => onUpdateExercise(ei, "sets", e.target.value)}
                  placeholder="3"
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-16">
                <Label className="text-xs text-muted-foreground">Reps</Label>
                <Input
                  value={ex.reps ?? ""}
                  onChange={(e) => onUpdateExercise(ei, "reps", e.target.value)}
                  placeholder="12"
                  className="h-8 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveExercise(ei)}
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
            onClick={onAddExercise}
            className="gap-1 text-xs"
          >
            <Plus className="h-3 w-3" /> Ejercicio
          </Button>
        </div>
      )}
    </div>
  );
}
