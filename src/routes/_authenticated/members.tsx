import { createFileRoute, Link } from "@tanstack/react-router";
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
import { usePageTitle } from "@/components/page-title";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  QrCode,
  Trash2,
  Dumbbell,
  Pencil,
  RefreshCw,
  Search,
  ScanFace,
  Copy,
  Download,
  ChevronDown,
  MoreHorizontal,
  Printer,
} from "lucide-react";
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

const PLAN_BADGES: Record<string, { label: string; className: string }> = {
  mensual: {
    label: "Mensual",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  trimestral: {
    label: "Trimestral",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  anual: {
    label: "Anual",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

const MONTHLY_BASE = 30;

function calculatePrice(plan: "mensual" | "trimestral" | "anual"): number {
  switch (plan) {
    case "mensual":
      return MONTHLY_BASE;
    case "trimestral":
      return MONTHLY_BASE * 3 * 0.9;
    case "anual":
      return MONTHLY_BASE * 12 * 0.8;
  }
}

function MembersPage() {
  usePageTitle("Socios");
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Socios</h1>
          <p className="mt-1 text-muted-foreground">
            {members.length} socio{members.length === 1 ? "" : "s"} registrado
            {members.length === 1 ? "" : "s"}
          </p>
        </div>
        <NewMemberDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o código..."
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="gap-1 px-3 py-1.5">
          {filtered.length} de {members.length}
        </Badge>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <div className="rounded-full bg-secondary p-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Aún no hay socios</p>
              <p className="text-sm text-muted-foreground">
                Añade el primer socio para empezar a gestionar.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <div className="rounded-full bg-secondary p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground">
                Ningún socio coincide con "<strong>{search}</strong>".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-4 font-medium">Socio</th>
                    <th className="px-4 py-4 font-medium">Plan</th>
                    <th className="px-4 py-4 font-medium">Vence</th>
                    <th className="px-4 py-4 font-medium">Precio</th>
                    <th className="hidden px-4 py-4 font-medium md:table-cell">Código</th>
                    <th className="px-4 py-4 font-medium">Estado</th>
                    <th className="px-4 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const expired = new Date(m.end_date) < new Date(new Date().toDateString());
                    const planBadge = PLAN_BADGES[m.plan] ?? { label: m.plan, className: "" };
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border transition-colors hover:bg-secondary/30 last:border-0"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {m.full_name
                                .split(" ")
                                .map((n) => n.charAt(0))
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium">{m.full_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {m.email || m.phone || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={
                              "inline-block rounded-md px-2 py-0.5 text-xs font-medium " +
                              planBadge.className
                            }
                          >
                            {planBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={expired ? "text-destructive" : ""}>{m.end_date}</span>
                        </td>
                        <td className="px-4 py-4 font-medium">${Number(m.price).toFixed(2)}</td>
                        <td className="hidden px-4 py-4 md:table-cell">
                          <code className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">
                            {m.access_code}
                          </code>
                        </td>
                        <td className="px-4 py-4">
                          {expired ? (
                            <Badge
                              variant="secondary"
                              className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            >
                              Vencido
                            </Badge>
                          ) : m.status === "cancelled" ? (
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                            >
                              Cancelado
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            >
                              Activo
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-0.5">
                            <RenewButton member={m} />
                            <IconButton
                              icon={Pencil}
                              title="Editar membresía"
                              onClick={() => setEditing(m)}
                            />
                            <IconButton
                              icon={Dumbbell}
                              title="Rutinas"
                              onClick={() => setShowWorkouts(m)}
                            />
                            <IconButton icon={QrCode} title="Ver QR" onClick={() => setShowQr(m)} />
                            <IconButton
                              icon={ScanFace}
                              title="Registrar rostro"
                              onClick={() => setRegisteringFace(m)}
                              className={
                                m.face_descriptor ? "text-emerald-600 hover:text-emerald-700" : ""
                              }
                            />
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

function IconButton({
  icon: Icon,
  title,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onClick}
      title={title}
      className={"h-8 w-8 " + (className ?? "")}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function Users(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function NewMemberDialog() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"mensual" | "trimestral" | "anual">("mensual");
  const [paymentMethod, setPaymentMethod] = useState<"tarjeta" | "transferencia" | "efectivo">(
    "efectivo",
  );
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const qc = useQueryClient();
  const createFn = useServerFn(createMember);

  const price = calculatePrice(plan);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    const d = new Date(startDate);
    const months = plan === "mensual" ? 1 : plan === "trimestral" ? 3 : 12;
    d.setMonth(d.getMonth() + months);
    setEndDate(d.toISOString().slice(0, 10));
  }, [plan, startDate]);

  const mutation = useMutation({
    mutationFn: (data: {
      fullName: string;
      email?: string;
      phone?: string;
      plan: "mensual" | "trimestral" | "anual";
      price: number;
      startDate: string;
      endDate: string;
    }) => createFn({ data }),
    onSuccess: (res) => {
      toast.success("Socio creado");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });

      const nameInput = document.querySelector<HTMLInputElement>("#fullName")?.value ?? "";

      setReceiptData({
        memberName: nameInput,
        qrToken: res.qrToken ?? "",
        accessCode: res.accessCode ?? "",
        plan,
        startDate,
        endDate,
        price,
        paymentMethod,
      });

      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      fullName: String(fd.get("fullName") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      plan,
      price,
      startDate,
      endDate,
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo socio
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
                    <SelectItem value="mensual">Mensual — $30</SelectItem>
                    <SelectItem value="trimestral">Trimestral — $81 (-10%)</SelectItem>
                    <SelectItem value="anual">Anual — $288 (-20%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio (USD)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={price.toFixed(2)}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Inicio</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fin</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={endDate}
                readOnly
                className="bg-muted"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : "Guardar socio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ReceiptDialog data={receiptData} onClose={() => setReceiptData(null)} />
    </>
  );
}

function RenewalDialog({
  member,
  open,
  onClose,
}: {
  member: MemberRow;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const renewFn = useServerFn(renewMembership);
  const [plan, setPlan] = useState<"mensual" | "trimestral" | "anual">(
    member.plan as "mensual" | "trimestral" | "anual",
  );
  const [paymentMethod, setPaymentMethod] = useState<"tarjeta" | "transferencia" | "efectivo">(
    "efectivo",
  );
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const price = calculatePrice(plan);

  const mutation = useMutation({
    mutationFn: () => renewFn({ data: { id: member.id, plan, price } }),
    onSuccess: (res) => {
      toast.success(`Membresía renovada hasta ${res.newEndDate}`);
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });

      setReceiptData({
        memberName: res.fullName,
        qrToken: res.qrToken,
        accessCode: res.accessCode,
        plan: res.plan,
        startDate: res.startDate,
        endDate: res.endDate,
        price: res.price,
        paymentMethod,
      });

      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const planLabel = PLAN_BADGES[member.plan]?.label ?? member.plan;
  const expired = new Date(member.end_date) < new Date(new Date().toDateString());

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar membresía</DialogTitle>
            <DialogDescription>
              {member.full_name} — Plan actual: <strong>{planLabel}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Periodo actual</p>
                  <p className="font-medium">
                    {member.start_date} → {member.end_date}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p
                    className={
                      expired ? "font-medium text-destructive" : "font-medium text-emerald-600"
                    }
                  >
                    {expired ? "Vencido" : "Activo"}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nuevo periodo</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual — $30</SelectItem>
                  <SelectItem value="trimestral">Trimestral — $81 (-10%)</SelectItem>
                  <SelectItem value="anual">Anual — $288 (-20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4">
              <span className="text-sm font-medium">Total a pagar</span>
              <span className="text-2xl font-bold">${price.toFixed(2)}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`} />
                {mutation.isPending ? "Renovando..." : "Confirmar renovación"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <ReceiptDialog data={receiptData} onClose={() => setReceiptData(null)} />
    </>
  );
}

function RenewButton({ member }: { member: MemberRow }) {
  const [showRenewal, setShowRenewal] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        title={`Renovar ${member.plan} (+${
          member.plan === "mensual" ? "1 mes" : member.plan === "trimestral" ? "3 meses" : "1 año"
        })`}
        onClick={() => setShowRenewal(true)}
        className="h-8 w-8"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      <RenewalDialog
        key={member.id}
        member={member}
        open={showRenewal}
        onClose={() => setShowRenewal(false)}
      />
    </>
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
          <DialogDescription>Actualiza los datos de {member?.full_name}.</DialogDescription>
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
      className="h-8 w-8 text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR de acceso</DialogTitle>
          <DialogDescription>
            {member?.full_name} &mdash; muestra este código en la entrada.
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
          <Separator />
          <div className="grid w-full grid-cols-2 gap-4 text-center text-xs text-muted-foreground">
            <div>
              <p className="mb-1">Token QR</p>
              <code className="mt-1 inline-block rounded-md bg-secondary px-3 py-1.5 font-mono text-xs">
                {member?.qr_token}
              </code>
            </div>
            <div>
              <p className="mb-1">Código de acceso</p>
              <code className="mt-1 inline-block rounded-md bg-secondary px-3 py-1.5 font-mono text-sm font-bold tracking-widest">
                {member?.access_code}
              </code>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------ Receipt Dialog ------------------------

type ReceiptData = {
  memberName: string;
  qrToken: string;
  accessCode: string;
  plan: "mensual" | "trimestral" | "anual";
  startDate: string;
  endDate: string;
  price: number;
  paymentMethod: string;
};

const PAYMENT_LABELS: Record<string, string> = {
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

function ReceiptDialog({ data, onClose }: { data: ReceiptData | null; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (data?.qrToken) {
      QRCode.toDataURL(data.qrToken, { width: 260, margin: 2 }).then(setDataUrl);
    } else {
      setDataUrl("");
    }
  }, [data?.qrToken]);

  async function handlePrint() {
    if (!data) return;
    const qrSrc = dataUrl || (await QRCode.toDataURL(data.qrToken, { width: 260, margin: 2 }));
    const planLabel = PLAN_BADGES[data.plan]?.label ?? data.plan;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Comprobante de Membresía — ${data.memberName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; padding: 2rem; background: #f1f5f9;
          }
          .receipt {
            background: #fff; border-radius: 16px; padding: 2.5rem 2rem;
            max-width: 420px; width: 100%;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
          .header { text-align: center; margin-bottom: 1.5rem; }
          .header h1 { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
          .header p { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; }
          .divider { height: 1px; background: #e2e8f0; margin: 1rem 0; }
          .qr-section { display: flex; justify-content: center; margin-bottom: 1rem; }
          .qr-section img { width: 180px; height: 180px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
          .info-item {}
          .info-item .label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.2rem; }
          .info-item .value { font-size: 0.9rem; font-weight: 600; color: #0f172a; }
          .info-full { grid-column: 1 / -1; }
          .code-block {
            background: #f8fafc; border: 1px solid #e2e8f0;
            border-radius: 8px; padding: 0.5rem 0.75rem;
            font-family: 'Courier New', monospace; font-size: 0.9rem;
            text-align: center; letter-spacing: 0.1em;
            color: #0f172a;
          }
          .footer { text-align: center; margin-top: 1.5rem; font-size: 0.7rem; color: #94a3b8; }
          .total-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 0.75rem 0; border-top: 2px solid #e2e8f0; margin-top: 0.5rem;
          }
          .total-row .label { font-size: 0.85rem; font-weight: 600; color: #0f172a; }
          .total-row .value { font-size: 1.15rem; font-weight: 700; color: #0f172a; }
          @media print {
            body { background: #fff; padding: 0.5in; }
            .receipt { box-shadow: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>🧾 Comprobante de Membresía</h1>
            <p>GymOS</p>
          </div>
          <div class="divider"></div>
          <div class="qr-section">
            <img src="${qrSrc}" alt="QR de acceso" />
          </div>
          <div class="code-block">${data.accessCode}</div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-item info-full">
              <div class="label">Socio</div>
              <div class="value">${data.memberName}</div>
            </div>
            <div class="info-item">
              <div class="label">Plan</div>
              <div class="value">${planLabel}</div>
            </div>
            <div class="info-item">
              <div class="label">Método de pago</div>
              <div class="value">${PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}</div>
            </div>
            <div class="info-item">
              <div class="label">Inicio</div>
              <div class="value">${data.startDate}</div>
            </div>
            <div class="info-item">
              <div class="label">Vencimiento</div>
              <div class="value">${data.endDate}</div>
            </div>
          </div>
          <div class="total-row">
            <span class="label">Total pagado</span>
            <span class="value">$${data.price.toFixed(2)}</span>
          </div>
          <div class="footer">
            <p>Comprobante generado el ${new Date().toLocaleDateString("es-MX")}</p>
          </div>
          <div class="divider no-print"></div>
          <p class="no-print" style="text-align:center;margin-top:0.5rem;">
            <button onclick="window.print()" style="padding:0.6rem 1.5rem;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:0.9rem;cursor:pointer;">
              Imprimir comprobante
            </button>
          </p>
        </div>
        <script>window.onload = function () { setTimeout(function () { window.print(); }, 500); };</script>
      </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <Dialog
      open={!!data}
      onOpenChange={(v) => {
        if (!v) {
          setDataUrl("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comprobante de membresía</DialogTitle>
          <DialogDescription>
            Membresía registrada correctamente para {data?.memberName}.
          </DialogDescription>
        </DialogHeader>
        {data && (
          <div className="space-y-4">
            <div className="flex justify-center">
              {dataUrl ? (
                <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
                  <img src={dataUrl} alt="QR" className="h-40 w-40" />
                </div>
              ) : (
                <div className="h-40 w-40 animate-pulse rounded-xl bg-muted" />
              )}
            </div>
            <div className="rounded-lg bg-secondary/30 p-3 text-center font-mono text-sm tracking-widest">
              {data.accessCode}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Socio</p>
                <p className="font-medium">{data.memberName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-medium">{PLAN_BADGES[data.plan]?.label ?? data.plan}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-medium">{data.startDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencimiento</p>
                <p className="font-medium">{data.endDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Método de pago</p>
                <p className="font-medium capitalize">
                  {PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total pagado</p>
                <p className="text-lg font-bold">${data.price.toFixed(2)}</p>
              </div>
            </div>
            <DialogFooter className="flex sm:justify-between">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            </DialogFooter>
          </div>
        )}
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
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Sin rutinas asignadas todavía.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Rutinas asignadas
      </p>
      {items.map((w) => (
        <div
          key={w.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/20"
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
      className="space-y-4 rounded-xl border border-border bg-secondary/20 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Nueva rutina
      </p>
      <div className="space-y-2">
        <Label htmlFor="w-title">Título</Label>
        <Input
          id="w-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Full body — Lunes"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="w-summary">Resumen</Label>
        <Textarea
          id="w-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Objetivo y notas generales"
          rows={2}
        />
      </div>

      {blocks.map((block, bi) => (
        <div key={bi} className="space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="flex gap-2">
            <Input
              value={block.name}
              onChange={(e) => updateBlock(bi, { name: e.target.value })}
              placeholder="Nombre del bloque"
              className="font-medium"
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
            className="gap-1"
          >
            <Plus className="h-3 w-3" /> Ejercicio
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
          className="gap-1"
        >
          <Plus className="h-3 w-3" /> Bloque
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

              ctx.strokeStyle = "#3b82f6";
              ctx.lineWidth = 3;
              const box = resized.detection.box;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

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
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="text-sm font-medium">Guardando firma facial...</p>
            </div>
          )}

          {status === "done" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 text-center p-6 text-emerald-600">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Guardar Rostro
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
