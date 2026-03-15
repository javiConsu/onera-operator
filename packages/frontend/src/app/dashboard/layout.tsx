"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TerminalBar } from "@/components/dashboard/terminal-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden bg-background bg-blueprint flex flex-col">
      {/* Barra terminal arriba del todo */}
      <TerminalBar />

      {/* Cabecera de navegación */}
      <header className="border-b-2 border-dashed border-border bg-background/90 backdrop-blur-sm">
        <div className="flex h-12 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="font-serif text-2xl font-extrabold tracking-tight text-primary hover:opacity-80 transition-opacity"
            >
              Pulsa
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/live"
              className="flex items-center gap-1.5 border border-[#fa782a]/30 bg-[#fa782a]/10 hover:bg-[#fa782a]/20 text-[#ea580c] px-2 py-1 text-[10px] uppercase tracking-wider font-bold transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#fa782a] animate-pulse" />
              En Vivo
            </Link>

            <Link href="/new">
              <Button size="sm" variant="outline" className="gap-1.5">
                + Nuevo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
