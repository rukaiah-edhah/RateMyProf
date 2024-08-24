'use client';

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { readStreamableValue } from "ai/rsc";
import { CoreMessage } from "ai";
import { continueConversation } from "@/app/actions";
import ReactMarkdown from 'react-markdown';
import { useUser } from "@clerk/nextjs";
import { SignOutButton } from "@clerk/nextjs";


export function ChatbotUI(): JSX.Element {
  const { user } = useUser()
  const [messages, setMessages] = useState<CoreMessage[]>([
    { role: "assistant", content: `Hello, how can I help you today?` },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const newMessages: CoreMessage[] = [
      ...messages,
      { role: "user", content: input }
    ];
    setMessages(newMessages);
    setInput("");

    const result = await continueConversation(newMessages);

    for await (const content of readStreamableValue(result)) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: content as string },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full mx-auto bg-background rounded-2xl shadow-lg overflow-hidden">
      <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center gap-4 justify-between">
        <h2 className="text-lg font-medium">Ms. Ratewell</h2>
        <h2 className="text-lg font-medium">Welcome, {user?.firstName}</h2>
        <SignOutButton>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
            Logout
          </button>
        </SignOutButton>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-4 ${
              message.role === "user" ? "justify-end" : ""
            }`}
          >
            {message.role === "assistant" && (
              <Avatar className="shrink-0">
                <AvatarImage src="/ai-rate-my-professor.png" alt="Chatbot Avatar" />
                <AvatarFallback>R</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              } rounded-lg p-4 max-w-[75%]`}
            >
              <ReactMarkdown>{`${String(message.content)}`}</ReactMarkdown>
            </div>
            {message.role === "user" && (
              <Avatar className="shrink-0 w-6 h-6">
                <AvatarImage src="/user.png" alt="User Avatar"/>
                <AvatarFallback>User</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="bg-muted px-6 py-4 flex items-center gap-4">
        <Input
          id="message"
          placeholder="Type your message..."
          className="flex-1 h-14 mb-2"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" size="icon">
          <SendIcon className="w-4 h-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}

function SendIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}