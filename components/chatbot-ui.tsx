"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  GraduationCap,
  Loader2,
  LogOut,
  SendHorizonal,
  Sparkles,
} from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  "tool-searchProfessors": "Searching professors…",
  "tool-addProfessorFromUrl": "Reading RateMyProfessors page…",
  "tool-saveSharedInfo": "Saving that info…",
};

const SUGGESTIONS = [
  "Find me an easy calculus professor",
  "Who's the best CS professor?",
  "Which professor grades most fairly?",
  "Paste a RateMyProfessors link to add a professor",
];

function MessageParts({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return message.role === "user" ? (
            <p key={index} className="whitespace-pre-wrap">
              {part.text}
            </p>
          ) : (
            <div key={index} className="chat-markdown text-sm leading-relaxed">
              <ReactMarkdown>{part.text}</ReactMarkdown>
            </div>
          );
        }
        const label = TOOL_LABELS[part.type];
        if (label) {
          const state = (part as { state?: string }).state;
          const running =
            state === "input-streaming" || state === "input-available";
          return (
            <div
              key={index}
              className="my-1 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground"
            >
              {running ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-3 w-3 text-primary" />
              )}
              {running ? label : label.replace(/…$/, " — done")}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

export function ChatbotUI() {
  const { user } = useUser();
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              Ms. Ratewell
            </h1>
            <p className="text-xs text-muted-foreground">AI professor guide</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Welcome, {user?.firstName}
          </span>
          <SignOutButton>
            <Button variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </SignOutButton>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-6 pt-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">
                  Ask me about your professors
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  I search real RateMyProfessors reviews to help you pick the
                  right class. Paste a professor&apos;s link to add them.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="rounded-full border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0 border border-border">
                  <AvatarImage
                    src="/ai-rate-my-professor.png"
                    alt="Ms. Ratewell"
                  />
                  <AvatarFallback>R</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-2xl rounded-bl-sm border border-border bg-card text-card-foreground"
                }`}
              >
                <MessageParts message={message} />
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0 border border-border">
                  <AvatarImage src="/user.png" alt="You" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {status === "submitted" && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 shrink-0 border border-border">
                <AvatarImage
                  src="/ai-rate-my-professor.png"
                  alt="Ms. Ratewell"
                />
                <AvatarFallback>R</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-4">
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-3xl p-4">
          {error && (
            <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive-foreground">
              Something went wrong. Please try sending your message again.
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-3"
          >
            <Input
              id="message"
              placeholder="Ask about a professor, or paste a RateMyProfessors link…"
              autoComplete="off"
              className="h-12 flex-1 rounded-xl border-border bg-input text-sm focus-visible:ring-ring"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              className="h-12 w-12 rounded-xl"
              disabled={busy || input.trim().length === 0}
            >
              <SendHorizonal className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
