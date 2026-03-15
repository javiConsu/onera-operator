"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type Project } from "@/lib/api-client";
import { CompanyPanel } from "@/components/dashboard/company-panel";
import { TasksPanel } from "@/components/dashboard/tasks-panel";
import { TwitterPanel } from "@/components/dashboard/twitter-panel";
import { EngineerPanel } from "@/components/dashboard/engineer-panel";
import { ReportPanel } from "@/components/dashboard/report-panel";
import { AskPanel } from "@/components/dashboard/ask-panel";
import { CollapsibleColumn } from "@/components/ui/collapsible-column";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [projects, setProjects] = useState < Project[] > ([]);
  const [selectedProject, setSelectedProject] = useState < Project | null > (null);
  const [credits, setCredits] = useState < number | null > (null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      api.projects.list(),
      api.users.credits().catch((err) => {
        console.error("[dashboard] Error al obtener créditos:", err.message || err);
        return { credits: null };
      }),
    ])
      .then(([p, creditsData]) => {
        setProjects(p);
        if (p.length > 0) {
          setSelectedProject(p[0]!);
        }
        if (creditsData.credits != null) setCredits(creditsData.credits);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-xs text-muted-foreground uppercase tracking-wider animate-pulse">
          Cargando panel...
        </span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="border border-destructive/50 bg-destructive/5 p-6 text-center max-w-sm">
          <p className="text-xs text-destructive font-semibold uppercase tracking-wider mb-2">
            Error al cargar el panel
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            No se pudo conectar con el servidor. Verifica que el backend esté funcionando.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-blueprint p-6">
        <div className="border-2 border-dashed border-primary/40 bg-white p-12 text-center max-w-lg relative corner-marks shadow-none">
          <h2 className="text-3xl font-serif font-extrabold text-primary mb-3">
            Bienvenido a Pulsa
          </h2>
          <p className="text-sm font-sans leading-relaxed text-muted-foreground mb-8">
            Crea tu primera empresa para empezar. La IA investigará tu producto
            automáticamente y comenzará a planificar tareas.
          </p>
          <Button
            onClick={() => router.push("/new")}
            className="rounded-sm h-[48px] px-8 shadow-sm bg-primary border-2 border-primary text-primary-foreground hover:bg-primary/90 font-sans font-bold text-[15px]"
          >
            + Crear Empresa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Selector de proyecto — visible cuando hay múltiples */}
      {projects.length > 1 && (
        <div className="border-b border-dashed border-border px-4 py-2 flex items-center gap-3 shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Proyecto:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
            {projects.map((p) => (
              <Button
                key={p.id}
                onClick={() => setSelectedProject(p)}
                size="sm"
                variant={selectedProject?.id === p.id ? "default" : "outline"}
                className={`shrink-0 ${selectedProject?.id === p.id
                    ? ""
                    : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                  } ${p.paused ? "opacity-60" : ""}`}
              >
                {p.paused && <span className="mr-1 text-destructive">||</span>}
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Panel de 5 columnas — colapsables */}
      <div className="flex-1 flex overflow-hidden">
        <CollapsibleColumn title="Empresa" className="p-4">
          <CompanyPanel
            projectName={selectedProject?.name || ""}
            projectId={selectedProject?.id}
            credits={credits}
            projectWebsite={selectedProject?.website}
            projectDescription={selectedProject?.description}
          />
        </CollapsibleColumn>

        <CollapsibleColumn title="Tareas" className="p-4">
          {selectedProject && (
            <TasksPanel key={selectedProject.id} projectId={selectedProject.id} />
          )}
        </CollapsibleColumn>

        <CollapsibleColumn title="Social" className="p-4">
          {selectedProject && (
            <TwitterPanel key={selectedProject.id} projectId={selectedProject.id} />
          )}
        </CollapsibleColumn>

        <CollapsibleColumn title="Ingeniería" className="p-4">
          {selectedProject && (
            <EngineerPanel key={selectedProject.id} projectId={selectedProject.id} />
          )}
        </CollapsibleColumn>

        <CollapsibleColumn title="Informes" isLast className="p-4">
          {selectedProject && (
            <ReportPanel key={selectedProject.id} projectId={selectedProject.id} />
          )}
        </CollapsibleColumn>
      </div>

      {/* Widget flotante de chat con Pulsa */}
      <AskPanel
        projectId={selectedProject?.id}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onProjectChange={(id) => {
          const match = projects.find((p) => p.id === id);
          if (match) setSelectedProject(match);
        }}
      />
    </div>
  );
}
