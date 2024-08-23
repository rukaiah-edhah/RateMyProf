import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChatbotUI(): JSX.Element {
  return (
    <div className="flex flex-col h-[80vh] max-w-md mx-auto bg-background rounded-2xl shadow-lg overflow-hidden">
      <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center gap-4">
        <Avatar>
          <AvatarImage src="/ai-rate-my-professor.png" alt="Chatbot Avatar" />
          <AvatarFallback>CB</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-medium">Ms. Ratewell</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="shrink-0">
            <AvatarImage src="/path-to-chatbot-avatar.jpg" alt="Chatbot Avatar" />
            <AvatarFallback>CB</AvatarFallback>
          </Avatar>
          <div className="bg-muted text-muted-foreground rounded-lg p-4 max-w-[75%]">
            {/* AI's message */}
            <p>{/* AI response here */}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 justify-end">
          <div className="bg-primary text-primary-foreground rounded-lg p-4 max-w-[75%]">
            {/* User's message */}
            <p>{/* User message here */}</p>
          </div>
          <Avatar className="shrink-0">
            {/* Replace with the actual user avatar */}
            <AvatarImage src="/path-to-user-avatar.jpg" alt="User Avatar" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="bg-muted px-6 py-4 flex items-center gap-4">
        <Input id="message" placeholder="Type your message..." className="flex-1" autoComplete="off" />
        <Button type="submit" size="icon">
          <SendIcon className="w-4 h-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
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