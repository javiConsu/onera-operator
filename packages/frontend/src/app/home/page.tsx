"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { publicApi } from "@/lib/api-client";
import type { PublicLiveData } from "@/lib/api-client";

export default function LandingPage() {
  const [liveData, setLiveData] = useState < PublicLiveData | null > (null);

  const fetchLive = useCallback(async () => {
    try {
      setLiveData(await publicApi.live());
    } catch {
      /* mantener datos anteriores */
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 8000);
    return () => clearInterval(id);
  }, [fetchLive]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background bp-texture overflow-x-hidden">
      {/* Barra terminal siempre visible arriba */}
      <LiveTerminalBar liveData={liveData} />

      {/* Banner naranja — en vivo */}
      <TopLiveBanner liveData={liveData} />

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <div className="mx-auto max-w-[850px] w-full flex flex-col justify-center pb-[6vh] sm:pb-[10vh]">

          {/* Etiqueta */}
          <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/5 text-primary px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium font-mono mb-6 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Pulsa &mdash; IA Autónoma para Emprendedores
          </div>

          <h1 className="font-serif text-[1.75rem] leading-[1.1] tracking-tight text-primary sm:text-[2.5rem] md:text-[3.75rem] mb-4 sm:mb-6 text-left font-extrabold">
            Tu cofundador de IA que nunca para.
          </h1>

          <p className="text-[0.95rem] sm:text-[1.1rem] leading-[1.6] text-muted-foreground mb-8 sm:mb-10 max-w-[700px] pr-4 sm:pr-8 text-left font-sans">
            Dale la URL de tu empresa. Cada 4 horas planifica tareas de crecimiento, encuentra leads, envía emails en frío, publica en Twitter y genera un informe diario — todo sin que toques nada.
          </p>

          <div className="flex flex-col items-start gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                asChild
                className="rounded-sm h-[42px] sm:h-[48px] px-6 sm:px-8 shadow-sm bg-primary border-2 border-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground transition-all font-sans font-bold text-[13px] sm:text-[15px]"
              >
                <Link href="/login">Empezar gratis</Link>
              </Button>
              <Link
                href="/live"
                className="text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 uppercase tracking-wider font-mono font-medium"
              >
                Ver en vivo &rsaquo;
              </Link>
            </div>
            <p className="text-[10px] sm:text-[12px] text-muted-foreground font-mono uppercase tracking-wider">
              Sin tarjeta de crédito &middot; Gratis para empezar
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="w-full px-4 sm:px-6 pb-8 sm:pb-12 flex justify-center shrink-0 relative z-10">
        <footer className="w-full max-w-[850px] border-t-2 border-dashed border-border pt-4 sm:pt-6 flex items-start justify-start">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] sm:text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
            <Link href="https://github.com/javiConsu/onera-operator" target="_blank" className="hover:text-primary transition-colors">GitHub</Link>
            <Link href="https://x.com/pulsaai" target="_blank" className="hover:text-primary transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-primary transition-colors">Términos</Link>
            <a href="mailto:hola@pulsa.pro" className="hover:text-primary transition-colors">
              hola@pulsa.pro
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra terminal en vivo
// ---------------------------------------------------------------------------
function LiveTerminalBar({ liveData }: { liveData: PublicLiveData | null }) {
  const scrollRef = useRef < HTMLDivElement | null > (null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [liveData]);

  const lines: string[] = [];

  if (liveData) {
    for (const t of liveData.tasks.filter((t: any) => t.status === "IN_PROGRESS").slice(0, 2)) {
      lines.push(`Ejecutando: ${t.title}`);
    }
    for (const l of liveData.terminalLines.slice(0, 4)) {
      lines.push(l.text);
    }
    for (const t of liveData.tasks.filter((t: any) => t.status === "COMPLETED").slice(0, 2)) {
      lines.push(`Completado: ${t.title}`);
    }
  }

  const display =
    lines.length > 0
      ? lines
      : [
        "Iniciando Pulsa...",
        "Agentes activos: planificador, twitter, outreach, investigación",
        "Ciclo de agentes programado: cada 4 horas",
        "Sistema listo. Esperando configuración de empresa",
      ];

  return (
    <div
      ref={scrollRef}
      className="terminal-bar px-3 sm:px-6 py-1.5 overflow-hidden shrink-0 relative z-10 text-[10px] sm:text-[11px]"
      style={{ maxHeight: 64 }}
    >
      {display.slice(-4).map((line, i) => (
        <div key={i} className="terminal-line opacity-80 truncate leading-snug">
          {line}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Banner en vivo (naranja)
// ---------------------------------------------------------------------------
function TopLiveBanner({ liveData }: { liveData: PublicLiveData | null }) {
  const tasksDone = liveData?.stats?.totalTasksCompleted || null;

  return (
    <Link
      href="/live"
      className="w-full bg-[#fa782a] hover:bg-[#d96522] text-white flex items-center justify-center py-2 sm:py-[10px] text-[11px] sm:text-[13px] font-bold font-mono uppercase tracking-wide transition-colors shrink-0 group relative z-20"
    >
      <span className="h-[5px] w-[5px] sm:h-[6px] sm:w-[6px] rounded-full bg-white group-hover:bg-white/80 transition-colors animate-pulse mr-2 sm:mr-[10px] shrink-0" />
      <span className="truncate">Ve a Pulsa trabajar en {tasksDone ? tasksDone.toLocaleString("es") : "..."} tareas en vivo &rarr;</span>
    </Link>
  );
}
