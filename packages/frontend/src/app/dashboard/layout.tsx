"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TerminalBar } from "@/components/dashboard/terminal-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

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
    <div className="h-screen overflow-hidden bg-background bg-blueprint flex flex-col">
      {/* Terminal bar at the very top — like the live page */}
      <TerminalBar />

      {/* Navigation header */}
      <header className="border-b-2 border-dashed border-border bg-background/90 backdrop-blur-sm">
        <div className="flex h-12 items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="font-serif text-2xl font-extrabold tracking-tight text-primary"
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

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
