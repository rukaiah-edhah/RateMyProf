import { currentUser } from "@clerk/nextjs/server";
import { ChatbotUI } from "@/components/chatbot-ui";
import Link from "next/link";

export default async function Chatbot() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <h2 className="text-2xl font-semibold text-foreground">
            Access Restricted
          </h2>
          <p className="mb-6 mt-3 text-sm text-muted-foreground">
            You must be signed in to chat with Ms. Ratewell.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="h-dvh w-full">
      <ChatbotUI />
    </main>
  );
}
