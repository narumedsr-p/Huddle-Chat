import { LogOut } from "lucide-react";
import { useState } from "react";
import { useChatStore } from "../../state/useChatStore";
import { MonkeyMascot } from "../MonkeyMascot";
import { Avatar } from "../ui/Avatar";
import { ConfirmModal } from "../ui/ConfirmModal";
import { GroupPanel } from "./GroupPanel";
import { SidebarModeToggle } from "./SidebarModeToggle";
import type { SidebarMode } from "./SidebarModeToggle";
import { UserPanel } from "./UserPanel";

interface SidebarProps {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
}

export function Sidebar({ mode, onModeChange }: SidebarProps) {
  const { currentUser, logout } = useChatStore();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-brown-100 bg-white/60 backdrop-blur">
      <div className="flex items-center gap-2.5 border-b border-brown-100 px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-300/50">
          <MonkeyMascot className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">1Carry3Monkey</p>
          <p className="truncate text-xs text-ink-soft">Term Project Chat</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <SidebarModeToggle mode={mode} onChange={onModeChange} />
        {mode === "user" ? <UserPanel /> : <GroupPanel />}
      </div>

      {currentUser && (
        <div className="flex items-center gap-2.5 border-t border-brown-100 px-4 py-3">
          <Avatar name={currentUser.name} size="sm" online />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{currentUser.name}</p>
            <p className="text-xs text-emerald-600">Online</p>
          </div>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brown-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      <ConfirmModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={logout}
        title="Log out?"
        message="You'll return to the join screen and this session's chats will reset."
        confirmLabel="Log out"
      />
    </aside>
  );
}
