import { ChatbotUI } from "@/components/chatbot-ui";

export default async function Chatbot() {
    return (
      <>
        <main className="flex flex-col items-center justify-between p-10 lg:p-16">
          <ChatbotUI/>
        </main>
      </>
    );
  }