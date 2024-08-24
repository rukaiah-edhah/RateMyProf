import { currentUser } from '@clerk/nextjs/server';
import { ChatbotUI } from "@/components/chatbot-ui";
import { SignInButton } from '@clerk/nextjs';

export default async function Chatbot() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-semibold mb-4">Access Restricted</h2>
          <p className="text-gray-700 mb-4">You must be signed in to access the chat.</p>
          <SignInButton>
            <button>
              Sign In
            </button>
          </SignInButton>
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
