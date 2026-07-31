import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { memberLogin, getCurrentMember } from "@/lib/client-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";
import { Mail, KeyRound, ArrowRight } from "lucide-react";

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
  usePageTitle("Portal del socio");

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
            <CardTitle className="text-xl">Portal del socio</CardTitle>
            <CardDescription>
              Ingresa con el correo y el código de acceso que te dio tu gimnasio.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="accessCode">Código de acceso</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="accessCode"
                    name="accessCode"
                    required
                    inputMode="numeric"
                    placeholder="6 dígitos"
                    className="pl-9 font-mono text-lg tracking-widest"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                {loading ? "Ingresando..." : "Entrar"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              ¿Administrador?{" "}
              <Link
                to="/auth"
                className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
