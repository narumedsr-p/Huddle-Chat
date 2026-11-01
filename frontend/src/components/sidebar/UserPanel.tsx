import { Bot } from "lucide-react";
import { useMemo, useState } from "react";
import { CHATBOT_CLIENT } from "../../lib/chatbot";
import { formatUnreadCount } from "../../lib/unread";
import { privateRoomId, useChatStore } from "../../state/useChatStore";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { SearchInput } from "../ui/SearchInput";

export function UserPanel() {
  const { clients, currentUser, unreadCounts, openPrivateRoom, activeRoomId } = useChatStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [clients, query],
  );
  const online = filtered.filter((c) => c.online);
  const offline = filtered.filter((c) => !c.online);

  function renderClient(client: (typeof clients)[number]) {
    const isSelf = client.id === currentUser?.id;
    const isBot = client.id === CHATBOT_CLIENT.id;
    const roomId = privateRoomId(client.id);
    const isActive = activeRoomId === roomId;
    const unread = unreadCounts[roomId] ?? 0;
    return (
      <li key={client.id}>
        <button
          type="button"
          disabled={isSelf}
          onClick={() => openPrivateRoom(client.id)}
          className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left text-sm transition-colors ${
            isActive
              ? "bg-brown-600 text-cream"
              : isSelf
                ? "cursor-default text-ink-soft"
                : client.online
                  ? "text-ink hover:bg-brown-50"
                  : "text-ink-soft/70 hover:bg-brown-50/60"
          }`}
        >
          <Avatar
            name={client.name}
            size="sm"
            online={client.online}
            icon={isBot ? <Bot className="h-3.5 w-3.5" /> : undefined}
          />
          <span className="flex-1 truncate">{client.name}</span>
          {isSelf && <Badge tone={isActive ? "gold" : "brown"}>you</Badge>}
          {unread > 0 && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-1 text-[10px] font-semibold leading-none ${
                isActive ? "bg-white/20 text-cream" : "bg-brown-600 text-cream"
              }`}
            >
              {formatUnreadCount(unread)}
            </span>
          )}
        </button>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search users…" />

      <div>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Online ({online.length})
        </h2>
        <ul className="flex flex-col gap-1">
          {online.map(renderClient)}
        </ul>
      </div>

      {offline.length > 0 && (
        <div>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Offline ({offline.length})
          </h2>
          <ul className="flex flex-col gap-1">{offline.map(renderClient)}</ul>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="px-1 text-sm text-ink-soft">No users match "{query}".</p>
      )}
    </div>
  );
}
