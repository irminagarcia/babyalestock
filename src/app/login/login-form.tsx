import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  nextPath,
  initialError,
}: {
  nextPath: string;
  initialError?: string;
}) {
  return (
    <form action="/api/auth/login" method="post" className="space-y-4">
      <input type="hidden" name="next" value={nextPath || "/panel"} />
      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          placeholder="admin"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>
      {initialError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {initialError}
        </p>
      )}
      <Button type="submit" className="w-full animate-soft-pulse">
        Entrar
      </Button>
    </form>
  );
}
