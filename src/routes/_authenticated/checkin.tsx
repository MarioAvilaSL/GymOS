import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { checkInByToken, checkInByFace } from "@/lib/members.functions";
import { usePageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  CameraOff,
  Keyboard,
  ScanFace,
  QrCode,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkin")({
  ssr: false,
  component: CheckinPage,
});

type CheckInResult =
  Awaited<ReturnType<typeof checkInByToken>> | Awaited<ReturnType<typeof checkInByFace>>;

function CheckinPage() {
  usePageTitle("Check-in");
  const [token, setToken] = useState("");
  const [last, setLast] = useState<CheckInResult | null>(null);
  const qc = useQueryClient();
  const checkFn = useServerFn(checkInByToken);
  const faceFn = useServerFn(checkInByFace);

  const mutation = useMutation({
    mutationFn: (t: string) => checkFn({ data: { token: t } }),
    onSuccess: (res) => {
      setLast(res);
      if (res.result === "ok") toast.success("Acceso permitido");
      else if (res.result === "expired") toast.warning("Membresía vencida");
      else toast.error("Socio no encontrado");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setToken("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const faceMutation = useMutation({
    mutationFn: (descriptor: number[]) => faceFn({ data: { descriptor } }),
    onSuccess: (res) => {
      setLast(res);
      if (res.result === "ok") toast.success("Acceso permitido");
      else if (res.result === "expired") toast.warning("Membresía vencida");
      else if (res.result === "no_members_registered") toast.info("No hay rostros registrados");
      else toast.error("Socio no encontrado");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const validate = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t || mutation.isPending) return;
      mutation.mutate(t);
    },
    [mutation],
  );

  const validateFace = useCallback(
    (descriptor: number[]) => {
      if (faceMutation.isPending) return;
      faceMutation.mutate(descriptor);
    },
    [faceMutation],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    validate(token);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Check-in</h1>
        <p className="mt-1 text-muted-foreground">
          Escanea el QR del socio, usa reconocimiento facial o ingresa el token manualmente.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Validar acceso</CardTitle>
          <CardDescription>
            Alterna entre escáner por cámara, reconocimiento facial y token manual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scanner" className="gap-2">
                <Camera className="h-4 w-4" /> QR
              </TabsTrigger>
              <TabsTrigger value="face" className="gap-2">
                <ScanFace className="h-4 w-4" /> Rostro
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Keyboard className="h-4 w-4" /> Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" forceMount className="mt-4 data-[state=inactive]:hidden">
              <QrScanner onDetected={validate} disabled={mutation.isPending} />
            </TabsContent>

            <TabsContent value="face" forceMount className="mt-4 data-[state=inactive]:hidden">
              <FaceScanner onDetected={validateFace} disabled={faceMutation.isPending} />
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <form onSubmit={onSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Token QR o código de acceso"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" disabled={mutation.isPending || !token.trim()}>
                  {mutation.isPending ? "Validando..." : "Validar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {last && <ResultCard result={last} />}
    </div>
  );
}

type ScannerStatus = "idle" | "requesting" | "reading" | "error";

function QrScanner({
  onDetected,
  disabled,
}: {
  onDetected: (token: string) => void;
  disabled: boolean;
}) {
  const containerId = "gymos-qr-reader";
  const scannerRef = useRef<unknown | null>(null);
  const lastRef = useRef<{ text: string; time: number } | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stop = useCallback(async () => {
    const inst = scannerRef.current as { stop?: () => Promise<void>; clear?: () => void } | null;
    scannerRef.current = null;
    try {
      if (inst?.stop) await inst.stop();
      inst?.clear?.();
    } catch {
      // ignore
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      setStatus("requesting");
      setError(null);
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const instance = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            const now = Date.now();
            if (
              lastRef.current &&
              lastRef.current.text === decodedText &&
              now - lastRef.current.time < 2500
            )
              return;
            lastRef.current = { text: decodedText, time: now };
            onDetectedRef.current(decodedText);
          },
          () => {
            // ignore per-frame decode errors
          },
        );
        if (cancelled) {
          await instance.stop();
          instance.clear();
          scannerRef.current = null;
          return;
        }
        setStatus("reading");
      } catch (e) {
        setStatus("error");
        setError(
          e instanceof Error ? e.message : "No se pudo iniciar la cámara. Revisa los permisos.",
        );
        setActive(false);
      }
    })();

    return () => {
      cancelled = true;
      void stop();
    };
  }, [active, stop]);

  useEffect(() => () => void stop(), [stop]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted/40">
        <div
          id={containerId}
          className="aspect-square w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-6 text-center">
            <Camera className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Cámara apagada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enciende la cámara para escanear códigos QR.
              </p>
            </div>
          </div>
        )}
        {status === "reading" && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Escaneando QR
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-6 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {status === "requesting" && "Solicitando permiso de cámara..."}
          {status === "reading" && "Enfoca el código QR dentro del recuadro."}
          {status === "idle" && "Se pedirá permiso al encender la cámara."}
        </p>
        {!active ? (
          <Button
            type="button"
            onClick={() => setActive(true)}
            disabled={disabled}
            className="gap-2"
          >
            <Camera className="h-4 w-4" /> Encender cámara
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setActive(false);
              void stop();
            }}
            className="gap-2"
          >
            <CameraOff className="h-4 w-4" /> Apagar
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: CheckInResult }) {
  if (result.result === "no_members_registered") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-amber-500/10 p-3">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold">Sin registros faciales</p>
            <p className="text-sm text-muted-foreground">
              Aún no hay socios con rostro registrado. Registra un rostro desde la sección Socios.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (result.result === "ok" && result.member) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold">Acceso permitido</p>
            <p className="text-sm text-muted-foreground">
              {result.member.full_name} &middot; Plan {result.member.plan} &middot; Vence{" "}
              {result.member.end_date}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            OK
          </Badge>
        </CardContent>
      </Card>
    );
  }
  if (result.result === "expired" && result.member) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-amber-500/10 p-3">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold">Membresía vencida</p>
            <p className="text-sm text-muted-foreground">
              {result.member.full_name} &middot; Venció {result.member.end_date}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          >
            Vencido
          </Badge>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-full bg-destructive/10 p-3">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold">Error de validación</p>
          <p className="text-sm text-muted-foreground">
            El código ingresado no corresponde a un socio activo.
          </p>
        </div>
        <Badge variant="destructive">No encontrado</Badge>
      </CardContent>
    </Card>
  );
}

type FaceScannerStatus = "idle" | "loading" | "reading" | "saving" | "error";

function FaceScanner({
  onDetected,
  disabled,
}: {
  onDetected: (descriptor: number[]) => void;
  disabled: boolean;
}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<FaceScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef<number>(0);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    let cancelled = false;

    async function initScanner() {
      try {
        setStatus("loading");
        setError(null);

        const faceapi = await import("@vladmandic/face-api");
        if (cancelled) return;

        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        setStatus("reading");
        detectFace(faceapi);
      } catch (err) {
        console.error(err);
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la cámara para el reconocimiento facial.",
        );
        setActive(false);
      }
    }

    async function detectFace(api: typeof import("@vladmandic/face-api")) {
      if (cancelled || !streamRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === 4 && canvas) {
        const detection = await api
          .detectSingleFace(video, new api.SsdMobilenetv1Options({ minConfidence: 0.55 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!cancelled) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
              const dims = api.matchDimensions(canvas, video, true);
              const resized = api.resizeResults(detection, dims);

              const box = resized.detection.box;

              ctx.strokeStyle = "#10b981";
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              ctx.fillStyle = "#10b981";
              ctx.font = "14px Inter, sans-serif";
              ctx.fillText("Validando socio...", box.x, box.y - 10);

              const now = Date.now();
              if (now - lastScanRef.current > 3000) {
                lastScanRef.current = now;
                onDetectedRef.current(Array.from(detection.descriptor));
              }
            }
          }
        }
      }

      setTimeout(() => detectFace(api), 250);
    }

    initScanner();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active, stop]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
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

        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-6 text-center">
            <ScanFace className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Reconocimiento facial apagado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enciende la cámara para identificar socios por su rostro.
              </p>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 text-center p-6">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Iniciando cámara y cargando modelos...</p>
          </div>
        )}

        {status === "reading" && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-blue-500/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Escaneando rostro
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-6 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {status === "loading" && "Cargando inteligencia artificial..."}
          {status === "reading" && "Sitúate frente a la cámara."}
          {status === "idle" && "Se solicitará acceso a la cámara al encender."}
        </p>
        {!active ? (
          <Button
            type="button"
            onClick={() => setActive(true)}
            disabled={disabled}
            className="gap-2"
          >
            <ScanFace className="h-4 w-4" /> Encender reconocimiento
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setActive(false)}
            className="gap-2"
          >
            <CameraOff className="h-4 w-4" /> Apagar
          </Button>
        )}
      </div>
    </div>
  );
}
