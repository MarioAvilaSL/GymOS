import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { login, register } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";
import { ArrowRight, Mail, Lock, User, Building2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [isRegister, setIsRegister] = useState(mode === "register");
  usePageTitle(isRegister ? "Crear cuenta" : "Iniciar sesión");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background px-4 py-10">
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo height={32} />
        </Link>
        <Card className="border-border/60 shadow-xl shadow-primary/5">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">
              {isRegister ? "Crear cuenta" : "Iniciar sesión"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Registra tu gimnasio para empezar a gestionar."
                : "Accede al panel de administración de tu gimnasio."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRegister ? <RegisterForm /> : <LoginForm />}
            <Separator className="my-6" />
            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
              <button
                type="button"
                onClick={() => setIsRegister((v) => !v)}
                className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                {isRegister ? "Inicia sesión" : "Regístrate"}
              </button>
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} GymOS &middot; Prototipo académico
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const loginFn = useServerFn(login);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await loginFn({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        },
      });
      toast.success("¡Bienvenido!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="pl-9"
          />
        </div>
      </div>
      <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const registerFn = useServerFn(register);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await registerFn({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          fullName: String(fd.get("fullName") ?? ""),
          gymName: String(fd.get("gymName") ?? ""),
        },
      });
      toast.success("Cuenta creada");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Tu nombre</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="fullName" name="fullName" required className="pl-9" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gymName">Gimnasio</Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="gymName" name="gymName" required className="pl-9" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="pl-9"
          />
        </div>
      </div>
      <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
        {loading ? "Creando cuenta..." : "Crear cuenta"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
}
