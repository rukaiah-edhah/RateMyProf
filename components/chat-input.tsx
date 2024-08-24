'use client'
import { type CoreMessage } from "ai";
import { useState, useEffect, useRef } from "react";
import { continueConversation } from '@/app/actions'
import { readStreamableValue } from "ai/rsc";

export function ChatInput({
  input,
  setInput
}: any) {
  const [messages, setMessages] = useState<CoreMessage[]>([]);


  return(
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        const newMessages: CoreMessage[] = [
          ...messages,
          { content: input, role: 'user'}
        ];

        setMessages(newMessages)
        setInput("");

        const result = await continueConversation(newMessages);

        for await (const content of readStreamableValue(result)){
          setMessages([
            ...newMessages,
            {
              role: 'assistant',
              content: content as unknown as string
            }
          ])
        }
      }}
      className="w-full max-w-md p-2 fixed bottom-0 left-0 right-0 mx-auto mb-8 flex items-center" // TODO: add styling to suit
    >
      <input 
        className="w-full border border-gray-300 rounded shadow-xl p-2" // TODO: add styling to suit
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message here..."
      />
    </form>
  )
}