"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api, type QueuedTweet } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

type StatusFilter = "PENDING" | "POSTED" | "DELETED" | "ALL";

export default function AdminTweetsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [tweets, setTweets] = useState<QueuedTweet[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (isLoaded && user) {
      const role = (user.publicMetadata as Record<string, unknown>)?.role;
      if (role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [isLoaded, user, router]);

  const fetchTweets = useCallback(async () => {
    try {
      const filters: { status?: string } = {};
      if (filter !== "ALL") filters.status = filter;
      const data = await api.admin.tweets.list(filters);
      setTweets(data.tweets);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch tweets:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchTweets();
  }, [fetchTweets]);

  const handleMarkPosted = async (id: string) => {
    setActionLoading(id);
    try {
      await api.admin.tweets.update(id, { status: "POSTED" });
      await fetchTweets();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await api.admin.tweets.update(id, { status: "DELETED" });
      await fetchTweets();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async (id: string) => {
    setActionLoading(id);
    try {
      await api.admin.tweets.regenerate(id);
      await fetchTweets();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (editContent.length > 280) return;
    setActionLoading(id);
    try {
      await api.admin.tweets.update(id, { content: editContent });
      setEditingId(null);
      await fetchTweets();
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (tweet: QueuedTweet) => {
    setEditingId(tweet.id);
    setEditContent(tweet.content);
  };

  const openXIntent = (content: string) => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(url, "_blank");
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-xs text-muted-foreground uppercase tracking-wider animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  const role = (user.publicMetadata as Record<string, unknown>)?.role;
  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-primary uppercase tracking-wider">
            Tweet Queue
          </h1>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Review AI-generated tweets and post them manually on X.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-dashed border-border pb-3">
        {(["PENDING", "POSTED", "DELETED", "ALL"] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
            className={
              filter === s
                ? ""
                : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
            }
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {total} tweet{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tweet list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-xs text-muted-foreground animate-pulse">Loading tweets...</span>
        </div>
      ) : tweets.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center bp-corners">
          <p className="text-xs text-muted-foreground">
            No {filter !== "ALL" ? filter.toLowerCase() : ""} tweets in the queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tweets.map((tweet) => (
            <div
              key={tweet.id}
              className="border border-dashed border-border p-4 space-y-3 relative"
            >
              {/* Project name + status badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {tweet.project?.name || "Unknown Project"}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      tweet.status === "PENDING"
                        ? "outline"
                        : tweet.status === "POSTED"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {tweet.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {tweet.tone}
                  </span>
                </div>
              </div>

              {/* Tweet content or edit mode */}
              {editingId === tweet.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-background border border-border p-3 text-xs leading-relaxed font-mono resize-none focus:outline-none focus:border-primary"
                    rows={4}
                    maxLength={280}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono ${
                        editContent.length > 280
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {editContent.length}/280
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(tweet.id)}
                        disabled={editContent.length > 280 || actionLoading === tweet.id}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs leading-relaxed">{tweet.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {tweet.content.length}/280
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(tweet.generatedAt)}
                      </span>
                      {tweet.postedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Posted {formatRelativeTime(tweet.postedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              {editingId !== tweet.id && (
                <div className="flex items-center gap-2 pt-1 border-t border-dashed border-border/50">
                  {tweet.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openXIntent(tweet.content)}
                      >
                        Post on X
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkPosted(tweet.id)}
                        disabled={actionLoading === tweet.id}
                      >
                        Mark as Posted
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(tweet)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegenerate(tweet.id)}
                        disabled={actionLoading === tweet.id}
                      >
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(tweet.id)}
                        disabled={actionLoading === tweet.id}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                  {tweet.status === "POSTED" && (
                    <span className="text-[10px] text-muted-foreground">
                      Posted by admin
                    </span>
                  )}
                  {tweet.status === "DELETED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegenerate(tweet.id)}
                      disabled={actionLoading === tweet.id}
                    >
                      Restore &amp; Regenerate
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
