"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowDownUp,
  Tags,
  Truck,
  FileSpreadsheet,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/movimientos", label: "Movimientos", icon: ArrowDownUp },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/csv", label: "Importar / Exportar", icon: FileSpreadsheet },
  { href: "/ayuda", label: "Ayuda", icon: HelpCircle },
];

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-[color-mix(in_oklab,var(--card)_92%,#d9ebe7)] p-4 shadow-sm transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-2xl tracking-tight text-primary">
              BabyAlestock
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Inventario local · boutique bebé
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X />
          </Button>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 border-t pt-4 text-sm">
          <p className="text-muted-foreground">Sesión</p>
          <p className="font-medium">{userName}</p>
          <form action="/api/auth/logout" method="post" className="mt-3">
            <Button type="submit" variant="outline" size="sm" className="w-full">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-[color-mix(in_oklab,var(--background)_85%,white)] px-4 py-3 backdrop-blur md:px-6">
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">
              Control de existencias · es-ES · EUR
            </p>
          </div>
        </header>
        <main className="animate-fade-up flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
