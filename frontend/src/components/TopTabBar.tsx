import { AnimatePresence, motion } from "framer-motion";
import { Hash, User as UserIcon, X } from "lucide-react";
import { useChatStore } from "../state/useChatStore";

export function TopTabBar() {
  const { rooms, activeRoomId, setActiveRoom, closeRoom } = useChatStore();

  if (rooms.length === 0) return null;

  return (
    <div className="flex items-end gap-1 overflow-x-auto overflow-y-hidden border-b border-brown-100 bg-brown-100/40 px-3 pt-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <AnimatePresence initial={false}>
        {rooms.map((room) => {
          const isActive = room.id === activeRoomId;
          return (
            <motion.div
              key={room.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
              transition={{ duration: 0.15 }}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              onClick={() => setActiveRoom(room.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveRoom(room.id);
              }}
              className={`group relative flex max-w-[190px] shrink-0 cursor-pointer items-center gap-2 rounded-t-xl px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "z-10 bg-cream text-ink"
                  : "translate-y-0.5 bg-brown-100/70 text-ink-soft hover:bg-brown-100"
              }`}
            >
              <span
                className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
                  isActive ? "bg-gold-300/70 text-brown-700" : "bg-white/60 text-brown-500"
                }`}
              >
                {room.kind === "group" ? (
                  <Hash className="h-2.5 w-2.5" />
                ) : (
                  <UserIcon className="h-2.5 w-2.5" />
                )}
              </span>
              <span className="truncate">{room.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeRoom(room.id);
                }}
                className={`rounded-full p-0.5 transition hover:bg-black/10 ${
                  isActive ? "opacity-60" : "opacity-0 group-hover:opacity-60"
                }`}
                aria-label={`Close ${room.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
