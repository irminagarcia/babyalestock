"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupplier } from "@/lib/actions/taxonomy";

export function SupplierForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          const result = await createSupplier(fd);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Proveedor guardado.");
          form.reset();
          router.refresh();
        });
      }}
    >
      <h2 className="font-display text-lg md:col-span-2">Nuevo proveedor</h2>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactName">Persona de contacto</Label>
        <Input id="contactName" name="contactName" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
