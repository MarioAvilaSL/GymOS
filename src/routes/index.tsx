import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";
import {
  QrCode,
  Users,
  LineChart,
  ShieldCheck,
  Dumbbell,
  CheckCircle,
  ArrowRight,
  Star,
  Quote,
  Sparkles,
  ScanFace,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const stats = [
  { label: "Gimnasios activos", value: "500+" },
  { label: "Socios gestionados", value: "25,000+" },
  { label: "Check-ins procesados", value: "1M+" },
  { label: "Disponibilidad", value: "99.9%" },
];

const features = [
  {
    icon: Users,
    title: "Socios y membresías",
    description:
      "Registro, planes personalizados (mensual, trimestral, anual), control de vencimientos y renovaciones en un solo clic.",
  },
  {
    icon: QrCode,
    title: "Control de acceso QR",
    description:
      "Cada socio recibe un QR único. Escanea desde cualquier dispositivo y registra el ingreso al instante.",
  },
  {
    icon: Dumbbell,
    title: "Rutinas y entrenamiento",
    description:
      "Asigna rutinas personalizadas con bloques de ejercicios y seguimiento desde el portal del socio.",
  },
  {
    icon: LineChart,
    title: "Métricas en tiempo real",
    description:
      "Dashboard interactivo con ingresos, asistencias, socios activos y tendencias semanales.",
  },
  {
    icon: ScanFace,
    title: "Reconocimiento facial",
    description: "Check-in biométrico opcional con detección facial. Identificación sin contacto.",
  },
  {
    icon: ShieldCheck,
    title: "Tus datos, tu control",
    description:
      "Corre sobre tu propia base PostgreSQL. Sin dependencias externas ni suscripciones mensuales.",
  },
];

function Landing() {
  usePageTitle();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link to="/portal/login">
              <Button variant="ghost" size="sm">
                Portal socio
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "register" }}>
              <Button size="sm" className="gap-1.5">
                Crear cuenta <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/3 to-background" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pb-32 sm:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Plataforma SaaS para gestión de gimnasios
              </Badge>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Gestiona tu gimnasio,
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  no tu papeleo
                </span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                GymOS centraliza membresías, control de acceso QR, rutinas y métricas en una sola
                plataforma. Sin hardware adicional. Sin Excel. Sin complicaciones.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link to="/auth" search={{ mode: "register" }}>
                  <Button size="lg" className="gap-2 px-8 text-base">
                    Empezar gratis <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="px-8 text-base">
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/40 bg-secondary/30">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl font-bold tracking-tight sm:text-4xl">{s.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">
                Funcionalidades
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Todo lo que necesitas para administrar tu gimnasio
              </h2>
              <p className="mt-4 text-muted-foreground">
                Desde el registro de socios hasta el control de acceso, GymOS cubre cada aspecto de
                la gestión diaria.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary ring-1 ring-primary/20 ring-inset">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-gradient-to-b from-secondary/30 to-background py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">
                Planes
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Flexibilidad para cada tipo de gimnasio
              </h2>
              <p className="mt-4 text-muted-foreground">
                Ofrece a tus socios la libertad de elegir el plan que mejor se adapte a sus
                necesidades.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  name: "Mensual",
                  price: "$30",
                  desc: "Para quienes buscan flexibilidad mensual sin compromiso.",
                  popular: false,
                },
                {
                  name: "Trimestral",
                  price: "$25/mes",
                  desc: "Ideal para socios con compromiso a medio plazo.",
                  popular: true,
                },
                {
                  name: "Anual",
                  price: "$20/mes",
                  desc: "Máximo ahorro para los que entrenan todo el año.",
                  popular: false,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-6 transition-all hover:shadow-lg ${
                    plan.popular
                      ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
                      : "border-border/60 bg-card"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1">
                      <Star className="h-3 w-3" /> Más popular
                    </Badge>
                  )}
                  <p className="text-lg font-semibold">{plan.name}</p>
                  <p className="mt-3">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.name !== "Mensual" && (
                      <span className="text-sm text-muted-foreground"> + IVA</span>
                    )}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{plan.desc}</p>
                  <Link to="/auth" search={{ mode: "register" }}>
                    <Button className="mt-6 w-full" variant={plan.popular ? "default" : "outline"}>
                      Elegir plan
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">
                Testimonios
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Lo que dicen nuestros usuarios
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  quote:
                    "GymOS me ahorró horas de papeleo semanal. El control de acceso QR transformó la entrada al gimnasio.",
                  author: "Carlos Mendoza",
                  role: "Director, FitZone Gym",
                },
                {
                  quote:
                    "Mis socios aman el portal donde ven sus rutinas y membresía. La renovación automática fue un game changer.",
                  author: "Ana Guerrero",
                  role: "Gerente, IronFit Center",
                },
                {
                  quote:
                    "Implementarlo fue sencillo. En una tarde tenía todo configurado. El dashboard me da visibilidad total del negocio.",
                  author: "Roberto Paredes",
                  role: "CEO, PowerHouse Gym",
                },
              ].map((t) => (
                <div key={t.author} className="rounded-2xl border border-border/60 bg-card p-6">
                  <Quote className="h-8 w-8 text-primary/30" />
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.quote}</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-border/40 pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-gradient-to-b from-primary/5 to-background py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Listo para digitalizar tu gimnasio?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Únete a cientos de gimnasios que ya confían en GymOS. Crea tu cuenta gratis y empieza
              a gestionar en minutos.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/auth" search={{ mode: "register" }}>
                <Button size="lg" className="gap-2 px-8 text-base">
                  Crear cuenta gratis <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <Logo height={24} />
              <p className="mt-3 text-sm text-muted-foreground">
                Plataforma SaaS para gestión integral de gimnasios.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Producto</p>
              <ul className="mt-3 space-y-2">
                {["Funcionalidades", "Planes", "FAQ", "Documentación"].map((item) => (
                  <li key={item}>
                    <Link
                      to="/"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Legal</p>
              <ul className="mt-3 space-y-2">
                {["Términos de servicio", "Privacidad", "Contacto"].map((item) => (
                  <li key={item}>
                    <Link
                      to="/"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} GymOS &middot; Prototipo académico
          </div>
        </div>
      </footer>
    </div>
  );
}
