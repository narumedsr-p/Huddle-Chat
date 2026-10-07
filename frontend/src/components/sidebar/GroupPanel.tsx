import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { formatUnreadCount } from "../../lib/unread";
import { groupRoomId, useChatStore } from "../../state/useChatStore";
import type { Client, Group } from "../../types";
import { GroupMembersModal } from "../GroupMembersModal";
import { SearchInput } from "../ui/SearchInput";
import { CreateGroupModal } from "./CreateGroupModal";

function GroupIcon({ joined }: { joined: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        joined
          ? "bg-gradient-to-br from-gold-400 to-brown-500 text-brown-900"
          : "bg-brown-100 text-brown-400 grayscale opacity-70"
      }`}
    >
      <Users className="h-3.5 w-3.5" />
    </span>
  );
}

export function GroupPanel() {
  const {
    groups,
    clients,
    currentUser,
    joinGroup,
    openGroupRoom,
    activeRoomId,
    unreadCounts,
  } = useChatStore();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [previewGroup, setPreviewGroup] = useState<Group | null>(null);

  const isSearching = query.trim().length > 0;
  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase())),
    [groups, query],
  );
  const myGroups = filtered.filter(
    (g) => !!currentUser && g.memberIds.includes(currentUser.id),
  );
  const discoverGroups = filtered.filter(
    (g) => !currentUser || !g.memberIds.includes(currentUser.id),
  );

  function membersOf(group: Group): Client[] {
    return group.memberIds
      .map((id) => clients.find((c) => c.id === id))
      .filter((c): c is Client => !!c);
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search groups…" />

      {isSearching && filtered.length === 0 ? (
        <p className="px-1 text-sm text-ink-soft">No groups match "{query}".</p>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                My Groups ({myGroups.length})
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-brown-600 transition hover:bg-brown-50"
                aria-label="Create group"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <ul className="flex flex-col gap-1">
              {myGroups.map((group) => {
                const roomId = groupRoomId(group.id);
                const isActive = activeRoomId === roomId;
                const unread = unreadCounts[roomId] ?? 0;
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={() => openGroupRoom(group.id)}
                      className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left text-sm transition-colors ${
                        isActive ? "bg-brown-600 text-cream" : "text-ink hover:bg-brown-50"
                      }`}
                    >
                      <GroupIcon joined />
                      <span className="flex-1 truncate">{group.name}</span>
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
              })}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Discover Groups ({discoverGroups.length})
            </h2>

            <ul className="flex flex-col gap-1">
              {discoverGroups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => setPreviewGroup(group)}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-brown-50/60"
                  >
                    <GroupIcon joined={false} />
                    <span className="flex-1 truncate">
                      {group.name} ({group.memberIds.length})
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {!isSearching && discoverGroups.length === 0 && (
              <p className="px-1 text-sm text-ink-soft">No more groups to discover.</p>
            )}
          </div>
        </>
      )}

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {previewGroup && (
        <GroupMembersModal
          open
          onClose={() => setPreviewGroup(null)}
          groupName={previewGroup.name}
          members={membersOf(previewGroup)}
          onJoin={() => joinGroup(previewGroup.id)}
        />
      )}
    </div>
  );
}
