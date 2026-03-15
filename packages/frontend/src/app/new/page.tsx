"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import Link from "next/link";

export default function NewCompanyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.projects.create({
        name,
        website: website || undefined,
        autoResearch: !!website,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Algo salió mal";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background px-4 bp-texture">
      <div className="relative z-10 mx-auto my-auto w-full max-w-lg overflow-y-auto py-8 scrollbar-thin">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider mb-6"
        >
          &larr; Volver al Panel
        </Link>

        <div className="inline-block border-2 border-primary bg-primary text-primary-foreground px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">
          Nueva Empresa
        </div>

        <div className="border-[1.5px] border-dashed border-border p-8 relative bp-corners">
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-primary">
              Crear una Empresa
            </h1>
            <p className="text-xs text-muted-foreground mt-2">
              Introduce el nombre y sitio web de tu empresa. La IA investigará
              automáticamente tu producto, competidores y público objetivo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                Nombre de la Empresa
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Mi Empresa S.L."
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="website"
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                URL del Sitio Web
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://miempresa.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Opcional &middot; Activa la investigación automática
              </p>
            </div>

            {error && (
              <div className="border border-destructive/50 bg-destructive/5 px-3 py-2">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <span className="animate-pulse">Investigando...</span>
              ) : (
                "Crear e Iniciar Investigación"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
