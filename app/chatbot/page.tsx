import { ChatbotUI } from "@/components/chatbot-ui";

export default async function Chatbot() {
  return (
    <>
      <main className="flex flex-col items-center justify-between min-h-screen w-full">
        <ChatbotUI />
      </main>
    </>
  );
}
