"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api-client";

interface TerminalBarProps {
  projectId?: string;
}

export function TerminalBar({ projectId }: TerminalBarProps) {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await api.activity(projectId);
      setLines(data.lines);
    } catch {
      // keep last lines
    }
  }, [projectId]);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  const display =
    lines.length > 0
      ? lines
      : [
          "Initializing OneraOS...",
          "Loading agents: planner, twitter, outreach, research, engineer",
          "Awaiting tasks...",
        ];

  return (
    <div
      ref={scrollRef}
      className="terminal-bar px-6 py-1.5 overflow-hidden shrink-0"
      style={{ maxHeight: 80 }}
    >
      {display.slice(-8).map((line, i) => (
        <div key={i} className="terminal-line opacity-80 truncate leading-snug">
          {line}
        </div>
      ))}
    </div>
  );
}
