import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { SidebarMode } from "../sidebar/SidebarModeToggle";
import { MonkeyMascot } from "../MonkeyMascot";
import { Button } from "../ui/Button";

interface EmptyStateProps {
  mode: SidebarMode;
  onCreateGroup: () => void;
}

export function EmptyState({ mode, onCreateGroup }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-gold-300/40"
      >
        <MonkeyMascot className="h-16 w-16" />
      </motion.div>

      {mode === "group" ? (
        <>
          <div>
            <p className="font-medium text-ink">Ready to start a group?</p>
            <p className="text-sm text-ink-soft">
              Create one and invite the troop to join in.
            </p>
          </div>
          <Button onClick={onCreateGroup} className="mt-1">
            <Plus className="h-4 w-4" />
            Create group
          </Button>
        </>
      ) : (
        <div>
          <p className="font-medium text-ink">No chat open yet</p>
          <p className="text-sm text-ink-soft">
            Pick someone online or a group to start chatting.
          </p>
        </div>
      )}
    </div>
  );
}
