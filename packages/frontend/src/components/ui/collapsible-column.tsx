"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleColumnProps {
  /** Label shown on the collapsed tab */
  title: string;
  /** Whether the column starts expanded (default: true) */
  defaultOpen?: boolean;
  /** Whether this is the last column (no right border) */
  isLast?: boolean;
  /** Additional className for the expanded content wrapper */
  className?: string;
  /** Content rendered when expanded */
  children: ReactNode;
}

export function CollapsibleColumn({
  title,
  defaultOpen = true,
  isLast = false,
  className,
  children,
}: CollapsibleColumnProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    // Collapsed: narrow vertical tab
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "shrink-0 flex flex-col items-center justify-center gap-1 cursor-pointer select-none",
          "w-9 min-w-[36px] bg-muted/30 hover:bg-primary/5 transition-colors group",
          !isLast && "border-r border-dashed border-border"
        )}
        title={`Expand ${title}`}
      >
        {/* Expand arrow */}
        <span className="text-[9px] text-muted-foreground/50 group-hover:text-primary transition-colors">
          ▶
        </span>
        {/* Vertical label */}
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors"
          style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}
        >
          {title}
        </span>
      </button>
    );
  }

  // Expanded: full column
  return (
    <div
      className={cn(
        "flex flex-col min-w-0 flex-1 overflow-hidden",
        !isLast && "border-r border-dashed border-border"
      )}
    >
      {/* Collapse handle — thin top bar */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 border-b border-dashed border-border/50 bg-muted/20 hover:bg-primary/5 cursor-pointer select-none group transition-colors"
        title={`Collapse ${title}`}
      >
        <span className="text-[9px] text-muted-foreground/50 group-hover:text-primary transition-colors">
          ◀
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
          {title}
        </span>
      </button>

      {/* Column content */}
      <div className={cn("flex-1 overflow-y-auto scrollbar-thin", className)}>
        {children}
      </div>
    </div>
  );
}
