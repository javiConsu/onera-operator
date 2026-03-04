"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "System initialized",
    "Connecting to agents...",
  ]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  // Poll real activity from backend
  const fetchActivity = useCallback(async () => {
    try {
      const data = await api.activity();
      if (data.lines && data.lines.length > 0) {
        setTerminalLines(data.lines);
      }
    } catch {
      // silently fail — terminal bar is non-critical
    }
  }, []);

  useEffect(() => {
    // Fetch immediately
    fetchActivity();

    // Then poll every 5 seconds
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <span className="text-xs text-muted-foreground uppercase tracking-wider animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Terminal bar at top — real agent activity */}
      <div className="terminal-bar px-4 py-2 overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {terminalLines.slice(-3).map((line, i) => (
            <span
              key={i}
              className={
                i === terminalLines.slice(-3).length - 1 ? "" : "opacity-50"
              }
            >
              <span className="opacity-40">&gt; </span>
              {line}
            </span>
          ))}
          <span className="animate-blink">_</span>
        </div>
      </div>

      {/* Navigation header */}
      <header className="border-b border-dashed border-border bg-background">
        <div className="flex h-12 items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight text-primary"
          >
            OneraOS
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/new">
              <Button size="sm" variant="outline" className="gap-1.5">
                + New
              </Button>
            </Link>

            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
