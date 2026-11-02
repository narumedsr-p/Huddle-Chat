import { DoorOpen, Hash, Search, User as UserIcon, Users } from "lucide-react";
import { useState } from "react";
import type { ApiMessage } from "../../api";
import { CHATBOT_CLIENT_ID } from "../../lib/chatbot";
import { roomMeta, useChatStore } from "../../state/useChatStore";
import { GroupMembersModal } from "../GroupMembersModal";
import { ConfirmModal } from "../ui/ConfirmModal";
import { ChatbotRoom } from "./ChatbotRoom";
import { MessageInput } from "./MessageInput";
import { MessageWindow } from "./MessageWindow";
import { SearchDrawer } from "./SearchDrawer";

interface ChatRoomProps {
  roomId: string;
}

export function ChatRoom({ roomId }: ChatRoomProps) {
  const {
    clients,
    groups,
    messagesByRoom,
    typingRoomIds,
    unreadDividers,
    sendMessage,
    leaveGroup,
    setTyping,
    ensureMessage,
  } = useChatStore();
  const [membersOpen, setMembersOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const meta = roomMeta(roomId, clients, groups);
  if (!meta) return null;
  if (meta.kind === "private" && meta.refId === CHATBOT_CLIENT_ID) {
    return <ChatbotRoom roomId={roomId} />;
  }

  const messages = messagesByRoom[roomId] ?? [];
  const isTyping = !!typingRoomIds[roomId];
  const typingName =
    meta.kind === "private" ? meta.name : (meta.group?.name ?? "Someone");
  const group = meta.kind === "group" ? meta.group : undefined;
  const groupMembers = group
    ? group.memberIds
        .map((id) => clients.find((c) => c.id === id))
        .filter((c): c is (typeof clients)[number] => !!c)
    : [];

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
        {meta.kind === "group" ? (
          <Hash className="h-4 w-4 shrink-0 text-brown-500" />
        ) : (
          <UserIcon className="h-4 w-4 shrink-0 text-brown-500" />
        )}
        <h2 className="truncate text-sm font-semibold text-ink">
          {meta.name}
          {group && (
            <span className="ml-1 font-normal text-ink-soft">
              ({group.memberIds.length})
            </span>
          )}
        </h2>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              searchOpen
                ? "bg-brown-100 text-brown-800"
                : "text-brown-500 hover:bg-brown-50 hover:text-brown-700"
            }`}
            aria-label="Search in conversation"
            title="Search in conversation"
          >
            <Search className="h-4 w-4" />
          </button>

          {group && (
            <>
              <button
                type="button"
                onClick={() => setMembersOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-brown-500 transition hover:bg-brown-50 hover:text-brown-700"
                aria-label="View members"
                title="View members"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLeaveOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-brown-500 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Leave group"
                title="Leave group"
              >
                <DoorOpen className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          <MessageWindow
            messages={messages}
            kind={meta.kind}
            typing={isTyping ? typingName : null}
            unreadCount={unreadDividers[roomId] ?? 0}
            highlightedMessageId={highlightedMessageId}
          />

          <MessageInput
            onSend={(text) => sendMessage(roomId, text)}
            onTyping={(typing) => setTyping(roomId, typing)}
          />
        </div>

        <SearchDrawer
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          roomId={roomId}
          roomName={meta.name}
          onSelectMessage={handleSelectMessage}
        />
      </div>

      {group && (
        <>
          <GroupMembersModal
            open={membersOpen}
            onClose={() => setMembersOpen(false)}
            groupName={group.name}
            members={groupMembers}
          />
          <ConfirmModal
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            onConfirm={() => leaveGroup(group.id)}
            title="Leave group?"
            message={`You'll stop seeing messages from "${group.name}" until you join again.`}
            confirmLabel="Leave group"
          />
        </>
      )}
    </div>
  );
}
