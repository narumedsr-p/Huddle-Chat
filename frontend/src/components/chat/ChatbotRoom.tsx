import { Bot } from "lucide-react";
import { MessageInput } from "./MessageInput";
import { MessageWindow } from "./MessageWindow";
import { useChatStore } from "../../state/useChatStore"; 

interface ChatbotRoomProps {
  roomId?: string;
}

export function ChatbotRoom({ roomId = "private:chatbot" }: ChatbotRoomProps) {
  const { messagesByRoom, sendMessage, unreadDividers, setTyping, typingRoomIds } = useChatStore();
  
  const messages = messagesByRoom[roomId] ?? [];
  const isTyping = !!typingRoomIds[roomId];

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    sendMessage(roomId, trimmed);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-brown-100 bg-white/70 px-6 py-4">
        <Bot className="h-4 w-4 shrink-0 text-brown-500" />
        <h2 className="truncate text-sm font-semibold text-ink">Chatbot</h2>
      </div>

      <MessageWindow 
        messages={messages} 
        kind="private" 
        typing={isTyping ? "Chatbot" : null}
        unreadCount={unreadDividers[roomId] ?? 0}
      />
      <MessageInput 
        onSend={handleSend} 
        onTyping={(typing) => setTyping(roomId, typing)}
      />
    </div>
  );
}