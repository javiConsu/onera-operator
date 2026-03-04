"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatBarProps {
  projectId?: string;
}

export function ChatBar({ projectId }: ChatBarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: { projectId },
  });

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className="w-full">
      {/* Chat overlay panel */}
      {hasMessages && (
        <div className="border border-dashed border-border border-b-0 bg-background max-h-[400px] overflow-y-auto scrollbar-thin mx-4">
          <div className="flex items-center justify-between px-4 py-2 border-b border-dashed border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Chat
            </span>
            <button
              onClick={clearChat}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
            >
              [close]
            </button>
          </div>
          <div className="p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <span className="text-xs text-primary font-bold shrink-0 mt-0.5">
                    AI&gt;
                  </span>
                )}
                <div
                  className={cn(
                    "px-3 py-2 text-xs max-w-[80%] leading-relaxed",
                    message.role === "user"
                      ? "border-2 border-primary bg-primary text-primary-foreground"
                      : "border border-dashed border-border"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <span className="text-xs text-muted-foreground font-bold shrink-0 mt-0.5">
                    You
                  </span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-primary font-bold shrink-0 mt-0.5">
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
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-3 border-t border-dashed border-border bg-background px-6 py-3",
          hasMessages && "mx-4 border border-dashed border-border border-t-0"
        )}
      >
        <span className="text-xs text-muted-foreground shrink-0">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask Onera anything..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />

        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={!input.trim() || isLoading}
          className="shrink-0 text-[10px] disabled:opacity-30"
        >
          Send &rarr;
        </Button>
      </form>
    </div>
  );
}
