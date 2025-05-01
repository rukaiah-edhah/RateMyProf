import { currentUser } from "@clerk/nextjs/server";
import { ChatbotUI } from "@/components/chatbot-ui";
import Link from "next/link";

export default async function Chatbot() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center rounded-2xl">
          <h2 className="text-2xl font-semibold mb-4">Access Restricted</h2>
          <p className="text-gray-700 mb-4">
            You must be signed in to access the chat.
          </p>
          <Link
            href="/login"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="flex flex-col items-center justify-between min-h-screen w-full">
        <ChatbotUI />
      </main>
    </>
  );
}
