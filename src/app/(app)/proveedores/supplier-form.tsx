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
        <Label htmlFor="name">Nombre comercial *</Label>
        <Input id="name" name="name" required placeholder="Ej. Baby Soft S.L." />
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

      <h3 className="font-display text-base text-muted-foreground md:col-span-2 pt-2">
        Datos fiscales
      </h3>
      <div className="space-y-2">
        <Label htmlFor="taxId">NIF / CIF</Label>
        <Input id="taxId" name="taxId" placeholder="B12345678" autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="legalName">Razón social</Label>
        <Input
          id="legalName"
          name="legalName"
          placeholder="Si es distinta del nombre comercial"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="fiscalAddress">Dirección fiscal</Label>
        <Textarea id="fiscalAddress" name="fiscalAddress" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">País</Label>
        <Input id="country" name="country" defaultValue="España" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          Guardar proveedor
        </Button>
      </div>
    </form>
  );
}
