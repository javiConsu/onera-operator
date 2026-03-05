"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AskPanelProps {
  projectId?: string;
}

export function AskPanel({ projectId }: AskPanelProps) {
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: { projectId },
      streamProtocol: "text",
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const suggestions = [
    "What are you working on?",
    "Create a HIGH priority outreach task",
    "Summarize today's progress",
  ];

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center gap-2 border border-dashed px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
          open
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-primary hover:border-primary hover:bg-primary/5"
        )}
      >
        {open ? "Close" : "> Ask OneraOS"}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-16 right-5 z-50 flex w-[400px] flex-col border border-dashed border-border bg-background shadow-lg"
          style={{ maxHeight: "min(520px, calc(100vh - 120px))" }}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-dashed border-border px-4 py-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ask OneraOS
            </h3>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
              Ask for status, create tasks, or request updates.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Try asking:
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="block w-full text-left text-[11px] text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary/40 px-3 py-2 transition-colors"
                    onClick={() => {
                      handleInputChange({
                        target: { value: s },
                      } as React.ChangeEvent<HTMLInputElement>);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id}>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block mb-1">
                  {message.role === "user" ? "You" : "OneraOS"}
                </span>
                {message.role === "user" ? (
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    {message.content}
                  </div>
                ) : (
                  <div className="border-l-2 border-primary pl-3 text-xs leading-relaxed prose-sm">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="text-xs leading-relaxed mb-1.5 last:mb-0">
                            {children}
                          </p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-primary">
                            {children}
                          </strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-4 space-y-0.5 mb-1.5">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-4 space-y-0.5 mb-1.5">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-xs leading-relaxed">
                            {children}
                          </li>
                        ),
                        code: ({ children }) => (
                          <code className="bg-muted px-1 py-0.5 text-[10px] font-mono">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block mb-1">
                  OneraOS
                </span>
                <div className="border-l-2 border-primary pl-3 text-xs text-primary animate-pulse">
                  thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 flex items-center gap-2 border-t border-dashed border-border px-4 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-7 border-dashed px-3 text-[10px]"
              disabled={!input.trim() || isLoading}
            >
              Send
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
