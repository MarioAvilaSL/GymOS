import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { memberLogin, getCurrentMember } from "@/lib/client-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/portal/login")({
  ssr: false,
  beforeLoad: async () => {
    const member = await getCurrentMember();
    if (member) throw redirect({ to: "/portal/dashboard" });
  },
  component: PortalLogin,
});

function PortalLogin() {
  const navigate = useNavigate();
  const loginFn = useServerFn(memberLogin);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await loginFn({
        data: {
          email: String(fd.get("email") ?? ""),
          accessCode: String(fd.get("accessCode") ?? ""),
        },
      });
      toast.success("¡Bienvenido!");
      navigate({ to: "/portal/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center">
          <img src="/gymos-logo.png" alt="GymOS" className="h-16 w-auto" />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Portal del socio</CardTitle>
            <CardDescription>
              Ingresa con el correo y el código de acceso que te dio tu gimnasio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessCode">Código de acceso</Label>
                <Input
                  id="accessCode"
                  name="accessCode"
                  required
                  inputMode="numeric"
                  placeholder="6 dígitos"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Entrar"}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              ¿Administrador?{" "}
              <Link to="/auth" className="font-medium text-primary hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
