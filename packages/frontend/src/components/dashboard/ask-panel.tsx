"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AskPanelProps {
  projectId?: string;
}

export function AskPanel({ projectId }: AskPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { projectId },
    streamProtocol: "text",
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestions = [
    "What are you working on right now?",
    "Create a HIGH priority outreach task for this project.",
    "Change the priority of my latest engineering task to MEDIUM.",
  ];

  return (
    <div className="flex flex-col">
      <div className="mb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ask OneraOS
        </h3>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          Ask for status, create tasks, or request updates.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 border-dashed px-2 py-0 text-[9px] normal-case tracking-normal"
              onClick={(e) => {
                e.preventDefault();
                handleInputChange({ target: { value: s } } as any);
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      <div className="overflow-y-auto scrollbar-thin mb-2" style={{ maxHeight: 200 }}>
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground py-4">
            Start a conversation. Example: &ldquo;Create a new marketing task
            for a launch thread.&rdquo;
          </p>
        )}

        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">
                  AI&gt;
                </span>
              )}
              <div
                className={cn(
                  "max-w-[86%] px-3 py-2 text-xs leading-relaxed",
                  message.role === "user"
                    ? "border-2 border-primary bg-primary text-primary-foreground"
                    : "border border-dashed border-border bg-background"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">
                AI&gt;
              </span>
              <div className="border border-dashed border-border px-3 py-2 text-xs">
                <span className="animate-pulse">thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border border-dashed border-border p-2"
      >
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          &gt;
        </span>
        <Input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask anything..."
          className="h-8 flex-1 border-0 border-b-2 border-border bg-transparent px-1 text-xs focus-visible:border-primary"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-8 border-dashed px-3"
          disabled={!input.trim() || isLoading}
        >
          Ask
        </Button>
      </form>
    </div>
  );
}
