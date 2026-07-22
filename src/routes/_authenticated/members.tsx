import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  listMembers,
  createMember,
  updateMember,
  renewMembership,
  deleteMember,
  registerFace,
  type MemberRow,
} from "@/lib/members.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, QrCode, Trash2, Dumbbell, Pencil, RefreshCw, Search, ScanFace } from "lucide-react";
import { listMemberWorkouts, createWorkout, deleteWorkout } from "@/lib/workouts.functions";

const membersQuery = queryOptions({
  queryKey: ["members"],
  queryFn: () => listMembers(),
});

export const Route = createFileRoute("/_authenticated/members")({
  loader: ({ context }) => context.queryClient.ensureQueryData(membersQuery),
  component: MembersPage,
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function MembersPage() {
  const { data: members } = useSuspenseQuery(membersQuery);
  const [showQr, setShowQr] = useState<MemberRow | null>(null);
  const [showWorkouts, setShowWorkouts] = useState<MemberRow | null>(null);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [registeringFace, setRegisteringFace] = useState<MemberRow | null>(null);
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.full_name.toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q) ||
      (m.phone ?? "").toLowerCase().includes(q) ||
      m.access_code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Socios</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} socio{members.length === 1 ? "" : "s"} registrados.
          </p>
        </div>
        <NewMemberDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo, teléfono o código..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Aún no hay socios. Añade el primero.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Ningún socio coincide con "{search}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Socio</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Vence</th>
                    <th className="p-3">Precio</th>
                    <th className="p-3">Código</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const expired = new Date(m.end_date) < new Date(new Date().toDateString());
                    return (
                      <tr key={m.id} className="border-b border-border last:border-0">
                        <td className="p-3">
                          <p className="font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.email || m.phone || "—"}
                          </p>
                        </td>
                        <td className="p-3 capitalize">{m.plan}</td>
                        <td className="p-3">{m.end_date}</td>
                        <td className="p-3">${Number(m.price).toFixed(2)}</td>
                        <td className="p-3">
                          <code className="rounded bg-muted px-2 py-0.5 text-xs">
                            {m.access_code}
                          </code>
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              "rounded-full px-2 py-1 text-xs font-medium " +
                              (expired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800")
                            }
                          >
                            {expired ? "Vencido" : "Activo"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <RenewButton member={m} />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditing(m)}
                              title="Editar membresía"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setShowWorkouts(m)}
                              title="Rutinas"
                            >
                              <Dumbbell className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setShowQr(m)}
                              title="Ver QR"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setRegisteringFace(m)}
                              title="Registrar Rostro"
                              className={
                                m.face_descriptor ? "text-green-600 hover:text-green-700" : ""
                              }
                            >
                              <ScanFace className="h-4 w-4" />
                            </Button>
                            <DeleteMemberButton id={m.id} name={m.full_name} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <QrDialog member={showQr} onClose={() => setShowQr(null)} />
      <WorkoutsDialog member={showWorkouts} onClose={() => setShowWorkouts(null)} />
      <EditMemberDialog
        key={editing?.id ?? "none"}
        member={editing}
        onClose={() => setEditing(null)}
      />
      <FaceRegistrationDialog
        key={registeringFace?.id ?? "face-none"}
        member={registeringFace}
        onClose={() => setRegisteringFace(null)}
      />
    </div>
  );
}

function NewMemberDialog() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"mensual" | "trimestral" | "anual">("mensual");
  const qc = useQueryClient();
  const createFn = useServerFn(createMember);

  type MemberInput = {
    fullName: string;
    email?: string;
    phone?: string;
    plan: "mensual" | "trimestral" | "anual";
    price: number;
    startDate: string;
    endDate: string;
  };
  const mutation = useMutation({
    mutationFn: (data: MemberInput) => createFn({ data }),
    onSuccess: () => {
      toast.success("Socio creado");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = (() => {
    const d = new Date();
    const months = plan === "mensual" ? 1 : plan === "trimestral" ? 3 : 12;
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  })();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      fullName: String(fd.get("fullName") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      plan,
      price: Number(fd.get("price") ?? 0),
      startDate: String(fd.get("startDate") ?? today),
      endDate: String(fd.get("endDate") ?? defaultEnd),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nuevo socio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo socio</DialogTitle>
          <DialogDescription>Registra un nuevo socio en tu gimnasio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio (USD)</Label>
              <Input id="price" name="price" type="number" step="0.01" defaultValue="30" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Inicio</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fin</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={defaultEnd} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar socio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenewButton({ member }: { member: MemberRow }) {
  const qc = useQueryClient();
  const renewFn = useServerFn(renewMembership);
  const mutation = useMutation({
    mutationFn: () => renewFn({ data: { id: member.id } }),
    onSuccess: (res) => {
      toast.success(`Membresía renovada hasta ${res.newEndDate}`);
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <Button
      size="icon"
      variant="ghost"
      title={`Renovar ${member.plan} (+${
        member.plan === "mensual" ? "1 mes" : member.plan === "trimestral" ? "3 meses" : "1 año"
      })`}
      disabled={mutation.isPending}
      onClick={() => {
        if (
          confirm(
            `¿Renovar la membresía ${member.plan} de ${member.full_name}? Se extenderá desde hoy o desde su fecha de vencimiento (la que sea posterior).`,
          )
        ) {
          mutation.mutate();
        }
      }}
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
}

function EditMemberDialog({ member, onClose }: { member: MemberRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateMember);
  const [plan, setPlan] = useState<"mensual" | "trimestral" | "anual">(
    (member?.plan as "mensual" | "trimestral" | "anual") ?? "mensual",
  );
  const [status, setStatus] = useState<"active" | "expired" | "cancelled">(
    (member?.status as "active" | "expired" | "cancelled") ?? "active",
  );

  type MemberUpdateInput = {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    plan: "mensual" | "trimestral" | "anual";
    price: number;
    startDate: string;
    endDate: string;
    status: "active" | "expired" | "cancelled";
  };
  const mutation = useMutation({
    mutationFn: (data: MemberUpdateInput) => updateFn({ data }),
    onSuccess: () => {
      toast.success("Membresía actualizada");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!member) return;
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      id: member.id,
      fullName: String(fd.get("fullName") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      plan,
      price: Number(fd.get("price") ?? 0),
      startDate: String(fd.get("startDate") ?? ""),
      endDate: String(fd.get("endDate") ?? ""),
      status,
    });
  }

  return (
    <Dialog
      open={!!member}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar membresía</DialogTitle>
          <DialogDescription>
            Actualiza los datos de {member?.full_name} en lugar de crear un socio nuevo.
          </DialogDescription>
        </DialogHeader>
        {member && (
          <form key={member.id} onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Nombre completo</Label>
              <Input id="edit-fullName" name="fullName" defaultValue={member.full_name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Correo</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={member.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input id="edit-phone" name="phone" defaultValue={member.phone ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Precio (USD)</Label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={member.price}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Inicio</Label>
                <Input
                  id="edit-startDate"
                  name="startDate"
                  type="date"
                  defaultValue={member.start_date}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">Fin</Label>
                <Input
                  id="edit-endDate"
                  name="endDate"
                  type="date"
                  defaultValue={member.end_date}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="expired">Vencido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteMemberButton({ id, name }: { id: string; name: string }) {
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteMember);
  const mutation = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Socio eliminado");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  return (
    <Button
      size="icon"
      variant="ghost"
      title="Eliminar"
      onClick={() => {
        if (confirm(`¿Eliminar a ${name}?`)) mutation.mutate();
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

function QrDialog({ member, onClose }: { member: MemberRow | null; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useState(() => {
    // noop placeholder to satisfy linter
  });

  if (member && !dataUrl) {
    QRCode.toDataURL(member.qr_token, { width: 320, margin: 2 }).then(setDataUrl);
  }

  return (
    <Dialog
      open={!!member}
      onOpenChange={(v) => {
        if (!v) {
          setDataUrl("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR de acceso</DialogTitle>
          <DialogDescription>
            {member?.full_name} — muestra este código en la entrada.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          {dataUrl ? (
            <img src={dataUrl} alt="QR" className="rounded-md border border-border" />
          ) : (
            <div className="h-[320px] w-[320px] animate-pulse rounded-md bg-muted" />
          )}
          <div className="text-center text-xs text-muted-foreground">
            <p>Token QR</p>
            <code className="mt-1 inline-block rounded bg-muted px-2 py-1">{member?.qr_token}</code>
            <p className="mt-2">Código de acceso al portal</p>
            <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-sm font-semibold">
              {member?.access_code}
            </code>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------ Workouts Dialog ------------------------

type ExerciseInput = { name: string; sets: string; reps: string; notes: string };
type BlockInput = { name: string; exercises: ExerciseInput[] };

function WorkoutsDialog({ member, onClose }: { member: MemberRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMemberWorkouts);
  const createFn = useServerFn(createWorkout);
  const deleteFn = useServerFn(deleteWorkout);

  const workoutsQ = useQuery({
    queryKey: ["member-workouts", member?.id ?? ""],
    queryFn: () => listFn({ data: { memberId: member!.id } }),
    enabled: !!member,
  });

  return (
    <Dialog
      open={!!member}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rutinas de {member?.full_name}</DialogTitle>
          <DialogDescription>
            Asigna bloques de ejercicios que el socio verá en su portal.
          </DialogDescription>
        </DialogHeader>

        {member && (
          <div className="space-y-6">
            <ExistingWorkouts
              items={workoutsQ.data ?? []}
              onDelete={async (id) => {
                await deleteFn({ data: { id } });
                qc.invalidateQueries({ queryKey: ["member-workouts", member.id] });
                toast.success("Rutina eliminada");
              }}
            />
            <NewWorkoutForm
              onSubmit={async (payload) => {
                await createFn({ data: { memberId: member.id, ...payload } });
                qc.invalidateQueries({ queryKey: ["member-workouts", member.id] });
                toast.success("Rutina creada");
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ExistingWorkouts({
  items,
  onDelete,
}: {
  items: { id: string; title: string; summary: string | null; created_at: string }[];
  onDelete: (id: string) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Sin rutinas asignadas todavía.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Rutinas asignadas</p>
      {items.map((w) => (
        <div
          key={w.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
        >
          <div>
            <p className="text-sm font-medium">{w.title}</p>
            {w.summary && <p className="text-xs text-muted-foreground">{w.summary}</p>}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (confirm(`¿Eliminar rutina "${w.title}"?`)) void onDelete(w.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function NewWorkoutForm({
  onSubmit,
}: {
  onSubmit: (data: { title: string; summary: string; blocks: BlockInput[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [blocks, setBlocks] = useState<BlockInput[]>([
    { name: "Bloque 1", exercises: [{ name: "", sets: "", reps: "", notes: "" }] },
  ]);
  const [saving, setSaving] = useState(false);

  function updateBlock(i: number, patch: Partial<BlockInput>) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function updateExercise(bi: number, ei: number, patch: Partial<ExerciseInput>) {
    setBlocks((b) =>
      b.map((block, idx) =>
        idx !== bi
          ? block
          : {
              ...block,
              exercises: block.exercises.map((ex, j) => (j === ei ? { ...ex, ...patch } : ex)),
            },
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = blocks
      .map((b) => ({
        name: b.name.trim(),
        exercises: b.exercises.filter((ex) => ex.name.trim()),
      }))
      .filter((b) => b.name && b.exercises.length > 0);
    if (!title.trim() || clean.length === 0) {
      toast.error("Añade un título y al menos un ejercicio.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), summary: summary.trim(), blocks: clean });
      setTitle("");
      setSummary("");
      setBlocks([{ name: "Bloque 1", exercises: [{ name: "", sets: "", reps: "", notes: "" }] }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-border bg-secondary/30 p-4"
    >
      <p className="text-xs font-semibold uppercase text-muted-foreground">Nueva rutina</p>
      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Full body — Lunes"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Resumen</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Objetivo y notas generales"
          rows={2}
        />
      </div>

      {blocks.map((block, bi) => (
        <div key={bi} className="space-y-2 rounded-md border border-border bg-background p-3">
          <div className="flex gap-2">
            <Input
              value={block.name}
              onChange={(e) => updateBlock(bi, { name: e.target.value })}
              placeholder="Nombre del bloque"
            />
            {blocks.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setBlocks((b) => b.filter((_, i) => i !== bi))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {block.exercises.map((ex, ei) => (
            <div key={ei} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-5"
                value={ex.name}
                onChange={(e) => updateExercise(bi, ei, { name: e.target.value })}
                placeholder="Ejercicio"
              />
              <Input
                className="col-span-2"
                value={ex.sets}
                onChange={(e) => updateExercise(bi, ei, { sets: e.target.value })}
                placeholder="Sets"
              />
              <Input
                className="col-span-2"
                value={ex.reps}
                onChange={(e) => updateExercise(bi, ei, { reps: e.target.value })}
                placeholder="Reps"
              />
              <Input
                className="col-span-3"
                value={ex.notes}
                onChange={(e) => updateExercise(bi, ei, { notes: e.target.value })}
                placeholder="Notas"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateBlock(bi, {
                exercises: [...block.exercises, { name: "", sets: "", reps: "", notes: "" }],
              })
            }
          >
            <Plus className="mr-1 h-3 w-3" /> Ejercicio
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setBlocks((b) => [
              ...b,
              {
                name: `Bloque ${b.length + 1}`,
                exercises: [{ name: "", sets: "", reps: "", notes: "" }],
              },
            ])
          }
        >
          <Plus className="mr-1 h-3 w-3" /> Bloque
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Asignar rutina"}
        </Button>
      </div>
    </form>
  );
}

function FaceRegistrationDialog({
  member,
  onClose,
}: {
  member: MemberRow | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<
    "loading" | "ready" | "detected" | "saving" | "done" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<Float32Array | null>(null);
  const qc = useQueryClient();
  const saveFaceFn = useServerFn(registerFace);

  const mutation = useMutation({
    mutationFn: (descriptor: number[]) => {
      if (!member) throw new Error("No member selected");
      return saveFaceFn({ data: { memberId: member.id, descriptor } });
    },
    onSuccess: () => {
      toast.success("Rostro registrado correctamente");
      qc.invalidateQueries({ queryKey: ["members"] });
      setStatus("done");
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Error al guardar rostro");
      setStatus("ready");
    },
  });

  useEffect(() => {
    if (!member) return;
    let active = true;

    async function initCamera() {
      try {
        setStatus("loading");
        const faceapi = await import("@vladmandic/face-api");
        if (!active) return;

        // Cargar modelos si no están cargados
        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

        if (!active) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        setStatus("ready");
        detectFace(faceapi);
      } catch (err) {
        console.error(err);
        setErrorMsg("Error al acceder a la cámara o cargar los modelos.");
        setStatus("error");
      }
    }

    async function detectFace(api: typeof import("@vladmandic/face-api")) {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === 4 && canvas) {
        const detection = await api
          .detectSingleFace(video, new api.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (active) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (detection) {
              const dims = api.matchDimensions(canvas, video, true);
              const resized = api.resizeResults(detection, dims);

              // Dibujar marco verde/azul
              ctx.strokeStyle = "#3b82f6"; // Tailwind blue-500
              ctx.lineWidth = 3;
              const box = resized.detection.box;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              // Texto indicador
              ctx.fillStyle = "#3b82f6";
              ctx.font = "14px Inter, sans-serif";
              ctx.fillText("Rostro Detectado", box.x, box.y - 10);

              detectionRef.current = detection.descriptor;
              setStatus("detected");
            } else {
              detectionRef.current = null;
              setStatus("ready");
            }
          }
        }
      }

      // Siguiente frame
      setTimeout(() => detectFace(api), 200);
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [member]);

  function handleCapture() {
    if (!detectionRef.current) {
      toast.warning("Alinea tu rostro frente a la cámara");
      return;
    }
    setStatus("saving");
    const arr = Array.from(detectionRef.current);
    mutation.mutate(arr);
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Rostro</DialogTitle>
          <DialogDescription>
            Registra el rostro de <strong>{member?.full_name}</strong> para permitirle el check-in
            facial.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border border-border">
          <video
            ref={videoRef}
            className="h-full w-full object-cover transform -scale-x-100"
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 h-full w-full object-cover transform -scale-x-100 pointer-events-none"
          />

          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 text-center p-6">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium">Iniciando cámara y cargando modelos...</p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive/10 text-center p-6 text-destructive">
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          )}

          {status === "saving" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 text-center p-6">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
              <p className="text-sm font-medium">Guardando firma facial...</p>
            </div>
          )}

          {status === "done" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 text-center p-6 text-green-600">
              <p className="text-lg font-bold">¡Guardado con éxito!</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            {status === "ready" && "Buscando rostro..."}
            {status === "detected" && "Rostro detectado. Listo para guardar."}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCapture}
              disabled={status !== "detected" || mutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Guardar Rostro
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
