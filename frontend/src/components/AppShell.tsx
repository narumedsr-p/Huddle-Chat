import { useState } from "react";
import { useChatStore } from "../state/useChatStore";
import { ChatRoom } from "./chat/ChatRoom";
import { EmptyState } from "./chat/EmptyState";
import { CreateGroupModal } from "./sidebar/CreateGroupModal";
import { Sidebar } from "./sidebar/Sidebar";
import type { SidebarMode } from "./sidebar/SidebarModeToggle";
import { TopTabBar } from "./TopTabBar";

export function AppShell() {
  const { activeRoomId } = useChatStore();
  const [mode, setMode] = useState<SidebarMode>("user");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar mode={mode} onModeChange={setMode} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <TopTabBar />
        {activeRoomId ? (
          <div key={activeRoomId} className="flex min-h-0 flex-1 flex-col">
            <ChatRoom roomId={activeRoomId} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <EmptyState mode={mode} onCreateGroup={() => setCreateGroupOpen(true)} />
          </div>
        )}
      </main>

      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
    </div>
  );
}
