import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Message, RoomKind } from "../../types";
import { MessageBubble } from "./MessageBubble";

interface MessageWindowProps {
  messages: Message[];
  kind: RoomKind;
  typing?: string | null;
}

function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDateLabel(ts: number) {
  const now = Date.now();
  const yesterday = now - 24 * 60 * 60 * 1000;
  if (isSameDay(ts, now)) return "Today";
  if (isSameDay(ts, yesterday)) return "Yesterday";
  return new Date(ts).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-1">
      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-ink-soft shadow-pop">
        {label}
      </span>
    </div>
  );
}

function TypingIndicator({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-2 px-1 text-xs text-ink-soft"
    >
      <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-pop">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brown-300"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      <span>{name} is typing…</span>
    </motion.div>
  );
}

export function MessageWindow({ messages, kind, typing }: MessageWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing]);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
      <AnimatePresence initial={false}>
        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const showDate = !prev || !isSameDay(prev.timestamp, message.timestamp);
          return (
            <div key={message.id}>
              {showDate && <DateSeparator label={formatDateLabel(message.timestamp)} />}
              <MessageBubble message={message} showSender={kind === "group"} />
            </div>
          );
        })}
      </AnimatePresence>
      <AnimatePresence>{typing && <TypingIndicator name={typing} />}</AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
