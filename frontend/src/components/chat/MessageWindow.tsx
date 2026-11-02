import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api";
import { formatUnreadCount } from "../../lib/unread";
import type { Message, RoomKind } from "../../types";
import { ChatMarkdown } from "./ChatMarkdown";
import { MessageBubble } from "./MessageBubble";

interface MessageWindowProps {
  roomId: string;
  messages: Message[];
  kind: RoomKind;
  typing?: string | null;
  /** Number of trailing messages that were unread when this room was opened. */
  unreadCount?: number;
  highlightedMessageId?: string | null;
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

function UnreadSeparator({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center py-1">
      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-ink-soft shadow-pop">
        {formatUnreadCount(count)} unread message{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

type RecapState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error"; message: string };

function UnreadSummary({ roomId, unreadCount }: { roomId: string; unreadCount: number }) {
  const [recap, setRecap] = useState<RecapState>({ status: "idle" });

  async function recapWhatYouMissed() {
    setRecap({ status: "loading" });
    try {
      const result = await api.summarizeRoom(roomId, unreadCount);
      setRecap({ status: "done", text: result.summary });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't recap this chat.";
      setRecap({ status: "error", message });
    }
  }

  return (
    <div className="mx-auto mb-1 flex max-w-sm items-start gap-2 rounded-2xl bg-white/80 px-3.5 py-2.5 text-xs text-ink-soft shadow-pop">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
      {recap.status === "idle" && (
        <button
          type="button"
          onClick={recapWhatYouMissed}
          className="text-left underline decoration-dotted hover:text-ink"
        >
          Recap what you missed
        </button>
      )}
      {recap.status === "loading" && (
        <span role="status" className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Summarizing…
        </span>
      )}
      {recap.status === "error" && <span role="alert">{recap.message}</span>}
      {recap.status === "done" && (
        <div className="[&_p]:mb-1">
          <ChatMarkdown>{recap.text}</ChatMarkdown>
        </div>
      )}
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

export function MessageWindow({
  roomId,
  messages,
  kind,
  typing,
  unreadCount = 0,
  highlightedMessageId,
}: MessageWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Anchor the divider to a fixed position the first time enough history has
  // loaded to place it, then freeze it there — recomputing from messages.length
  // on every render would keep shoving it toward the bottom as new messages
  // (sent or received) get appended during the same room visit.
  const [anchor, setAnchor] = useState({ unreadCount, index: -1 });
  if (anchor.unreadCount !== unreadCount) {
    setAnchor({ unreadCount, index: -1 });
  }
  if (anchor.index === -1 && unreadCount > 0) {
    const candidate = messages.length - unreadCount;
    if (candidate >= 0) setAnchor({ unreadCount, index: candidate });
  }
  const unreadStartIndex = unreadCount > 0 ? anchor.index : -1;

  useEffect(() => {
    if (highlightedMessageId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing, highlightedMessageId]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const el = document.getElementById(`msg-${highlightedMessageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedMessageId]);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
      <AnimatePresence initial={false}>
        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const showDate = !prev || !isSameDay(prev.timestamp, message.timestamp);
          const isHighlighted = message.id === highlightedMessageId;
          return (
            <div
              key={message.id}
              id={`msg-${message.id}`}
              className={`rounded-2xl transition-all duration-500 ${
                isHighlighted
                  ? "ring-4 ring-gold-400/80 bg-gold-100/40 p-1 -m-1"
                  : ""
              }`}
            >
              {showDate && <DateSeparator label={formatDateLabel(message.timestamp)} />}
              {i === unreadStartIndex && (
                <>
                  <UnreadSeparator count={unreadCount} />
                  <UnreadSummary roomId={roomId} unreadCount={unreadCount} />
                </>
              )}
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
