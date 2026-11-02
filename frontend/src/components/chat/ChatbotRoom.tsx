import { Bot, Search } from "lucide-react";
import { useState } from "react";
import type { ApiMessage } from "../../api";
import { useChatStore } from "../../state/useChatStore";
import { MessageInput } from "./MessageInput";
import { MessageWindow } from "./MessageWindow";
import { SearchDrawer } from "./SearchDrawer";

interface ChatbotRoomProps {
  roomId?: string;
}

export function ChatbotRoom({ roomId = "private:chatbot" }: ChatbotRoomProps) {
  const {
    messagesByRoom,
    sendMessage,
    unreadDividers,
    setTyping,
    typingRoomIds,
    ensureMessage,
  } = useChatStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messages = messagesByRoom[roomId] ?? [];
  const isTyping = !!typingRoomIds[roomId];

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    sendMessage(roomId, trimmed);
  }

  const handleSelectMessage = (msg: ApiMessage) => {
    ensureMessage(roomId, msg);
    setHighlightedMessageId(msg.id);
    setTimeout(() => {
      setHighlightedMessageId((curr) => (curr === msg.id ? null : curr));
    }, 3000);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-brown-100 bg-white/70 px-6 py-4">
        <Bot className="h-4 w-4 shrink-0 text-brown-500" />
        <h2 className="truncate text-sm font-semibold text-ink">Chatbot</h2>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              searchOpen
                ? "bg-brown-100 text-brown-800"
                : "text-brown-500 hover:bg-brown-50 hover:text-brown-700"
            }`}
            aria-label="Search conversation"
            title="Search conversation"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          <MessageWindow
            messages={messages}
            kind="private"
            typing={isTyping ? "Chatbot" : null}
            unreadCount={unreadDividers[roomId] ?? 0}
            highlightedMessageId={highlightedMessageId}
          />
          <MessageInput
            onSend={handleSend}
            onTyping={(typing) => setTyping(roomId, typing)}
          />
        </div>

        <SearchDrawer
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          roomId={roomId}
          roomName="Chatbot"
          onSelectMessage={handleSelectMessage}
        />
      </div>
    </div>
  );
}
