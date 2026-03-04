"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api, type Project } from "@/lib/api-client";
import { CompanyPanel } from "@/components/dashboard/company-panel";
import { TasksPanel } from "@/components/dashboard/tasks-panel";
import { TwitterPanel } from "@/components/dashboard/twitter-panel";
import { ReportPanel } from "@/components/dashboard/report-panel";
import { ChatBar } from "@/components/dashboard/chat-bar";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = user?.id;
    api.projects
      .list(userId)
      .then((p) => {
        setProjects(p);
        if (p.length > 0) {
          setSelectedProject(p[0]!);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5.5rem)]">
        <span className="text-xs text-muted-foreground uppercase tracking-wider animate-pulse">
          Loading dashboard...
        </span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5.5rem)] gap-6">
        <div className="border-[1.5px] border-dashed border-border p-10 text-center max-w-md relative bp-corners">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Welcome to OneraOS
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Create your first company to get started. The AI will automatically
            research your product and begin planning tasks.
          </p>
          <Button onClick={() => router.push("/new")}>+ Create Company</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)]">
      {/* 4-column dashboard grid */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-12 h-full">
          {/* Column 1: Company status */}
          <div className="col-span-2 border-r border-dashed border-border overflow-y-auto scrollbar-thin p-4">
            <CompanyPanel
              projectName={selectedProject?.name || ""}
              projectId={selectedProject?.id}
              credits={100}
            />
          </div>

          {/* Column 2: Tasks */}
          <div className="col-span-3 border-r border-dashed border-border overflow-y-auto scrollbar-thin p-4">
            {selectedProject && (
              <TasksPanel projectId={selectedProject.id} />
            )}
          </div>

          {/* Column 3: Twitter + Email */}
          <div className="col-span-3 border-r border-dashed border-border overflow-y-auto scrollbar-thin p-4">
            {selectedProject && (
              <TwitterPanel projectId={selectedProject.id} />
            )}
          </div>

          {/* Column 4: Daily Report */}
          <div className="col-span-4 overflow-y-auto scrollbar-thin p-4">
            {selectedProject && (
              <ReportPanel projectId={selectedProject.id} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom chat bar */}
      <ChatBar projectId={selectedProject?.id} />
    </div>
  );
}
