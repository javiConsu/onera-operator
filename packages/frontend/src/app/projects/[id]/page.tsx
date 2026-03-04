"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Project } from "@/lib/api-client";
import Link from "next/link";

export default function ProjectSettingsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [product, setProduct] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [goals, setGoals] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    api.projects.get(projectId)
      .then((p) => {
        setProject(p);
        setName(p.name || "");
        setWebsite(p.website || "");
        setDescription(p.description || "");
        setProduct(p.product || "");
        setTargetUsers(p.targetUsers || "");
        // Flatten JSON arrays to newline-separated text for editing
        try {
          const parsed = JSON.parse(p.competitors || "[]");
          setCompetitors(Array.isArray(parsed) ? parsed.join("\n") : p.competitors || "");
        } catch {
          setCompetitors(p.competitors || "");
        }
        try {
          const parsed = JSON.parse(p.goals || "[]");
          setGoals(Array.isArray(parsed) ? parsed.join("\n") : p.goals || "");
        } catch {
          setGoals(p.goals || "");
        }
      })
      .catch(() => setError("Failed to load project"))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, projectId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // Convert newline-separated text back to JSON arrays
      const competitorsList = competitors.split("\n").map((s) => s.trim()).filter(Boolean);
      const goalsList = goals.split("\n").map((s) => s.trim()).filter(Boolean);

      await api.projects.update(projectId, {
        name: name || undefined,
        website: website || undefined,
        description: description || undefined,
        product: product || undefined,
        targetUsers: targetUsers || undefined,
        competitors: competitorsList.length > 0 ? JSON.stringify(competitorsList) : undefined,
        goals: goalsList.length > 0 ? JSON.stringify(goalsList) : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project?.name}"? This cannot be undone. All tasks and reports will be lost.`)) return;
    setDeleting(true);
    try {
      await api.projects.delete(projectId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-xs text-muted-foreground uppercase tracking-wider animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xs text-destructive mb-4">{error}</p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">&larr; Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background bp-texture">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-dashed border-border px-8 py-4">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-primary">
          OneraOS
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider mb-6"
          >
            &larr; Back to Dashboard
          </Link>

          <div className="inline-block border-2 border-primary bg-primary text-primary-foreground px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">
            Project Settings
          </div>

          <div className="border-[1.5px] border-dashed border-border p-8 relative bp-corners">
            <h1 className="text-2xl font-bold tracking-tight text-primary mb-6">
              {project?.name}
            </h1>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Company Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://acme.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What does your company do?"
                  className="flex w-full border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Product
                </Label>
                <textarea
                  id="product"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  rows={2}
                  placeholder="Core product or service description"
                  className="flex w-full border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="targetUsers" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Target Users
                </Label>
                <textarea
                  id="targetUsers"
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  rows={2}
                  placeholder="Who are your customers?"
                  className="flex w-full border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="competitors" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Competitors <span className="normal-case">(one per line)</span>
                  </Label>
                  <textarea
                    id="competitors"
                    value={competitors}
                    onChange={(e) => setCompetitors(e.target.value)}
                    rows={4}
                    placeholder="Competitor A&#10;Competitor B&#10;Competitor C"
                    className="flex w-full border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goals" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Goals <span className="normal-case">(one per line)</span>
                  </Label>
                  <textarea
                    id="goals"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    rows={4}
                    placeholder="Reach 100 customers&#10;Launch paid tier&#10;Get press coverage"
                    className="flex w-full border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              {saved && (
                <p className="text-xs text-primary font-semibold">Settings saved successfully.</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-[10px]"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
