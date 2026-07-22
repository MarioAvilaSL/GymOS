import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { QrCode, Users, LineChart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/gymos-logo.png" alt="GymOS" className="h-10 w-auto" />
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/portal/login">
              <Button variant="ghost">Soy socio</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link to="/auth" search={{ mode: "register" }}>
              <Button>Crear cuenta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
                Plataforma SaaS · B2B
              </p>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
                Gestiona tu gimnasio, no tu papeleo.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                GymOS centraliza membresías, control de acceso por QR, socios y
                métricas en una sola plataforma web. Sin hardware. Sin Excel.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth" search={{ mode: "register" }}>
                  <Button size="lg">Empezar gratis</Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src="/gymos-logo.png"
                alt="GymOS"
                className="w-full max-w-md drop-shadow-2xl"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-secondary/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <f.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} GymOS · Prototipo académico
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Users,
    title: "Socios y membresías",
    description: "Alta de socios, planes, vencimientos y estado en un solo panel.",
  },
  {
    icon: QrCode,
    title: "Control de acceso QR",
    description: "Cada socio recibe un QR dinámico. Escanea y valida al instante.",
  },
  {
    icon: LineChart,
    title: "Métricas en vivo",
    description: "Ingresos del mes, asistencias del día y socios por vencer.",
  },
  {
    icon: ShieldCheck,
    title: "Datos en tu servidor",
    description: "Corre con tu propia base PostgreSQL local. Control total.",
  },
];
