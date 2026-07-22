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

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center">
          <img src="/gymos-logo.png" alt="GymOS" className="h-16 w-auto" />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Registra tu gimnasio para empezar."
                : "Accede al panel de administración."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRegister ? <RegisterForm /> : <LoginForm />}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isRegister ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
              <button
                type="button"
                onClick={() => setIsRegister((v) => !v)}
                className="font-medium text-primary hover:underline"
              >
                {isRegister ? "Inicia sesión" : "Regístrate"}
              </button>
            </p>
          </CardContent>
        </Card>
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Tu nombre</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gymName">Nombre del gimnasio</Label>
        <Input id="gymName" name="gymName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creando..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
