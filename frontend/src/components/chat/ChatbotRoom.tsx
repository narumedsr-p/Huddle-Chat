import { Bot } from "lucide-react";
import { useState } from "react";
import type { Message } from "../../types";
import { MessageInput } from "./MessageInput";
import { MessageWindow } from "./MessageWindow";

const WELCOME_MESSAGE: Message = {
  id: "chatbot-welcome",
  roomId: "private:chatbot",
  senderId: "chatbot",
  senderName: "Chatbot",
  text: "Hi! I'm a placeholder for a future AI assistant — I can't reply yet.",
  timestamp: Date.now(),
  isSelf: false,
};

// Frontend-only stub: messages here are kept in local state and never hit
// the backend, since there's no AI wired up yet.
export function ChatbotRoom() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        roomId: "private:chatbot",
        senderId: "me",
        senderName: "You",
        text: trimmed,
        timestamp: Date.now(),
        isSelf: true,
      },
    ]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-brown-100 bg-white/70 px-6 py-4">
        <Bot className="h-4 w-4 shrink-0 text-brown-500" />
        <h2 className="truncate text-sm font-semibold text-ink">Chatbot</h2>
      </div>

      <MessageWindow messages={messages} kind="private" />

      <MessageInput onSend={handleSend} />
    </div>
  );
}
