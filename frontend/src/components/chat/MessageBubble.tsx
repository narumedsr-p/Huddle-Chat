import { motion } from "framer-motion";
import type { Message } from "../../types";
import { Avatar } from "../ui/Avatar";
import Markdown from "react-markdown";

interface MessageBubbleProps {
  message: Message;
  showSender: boolean;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, showSender }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex items-end gap-2 ${message.isSelf ? "flex-row-reverse" : ""}`}
    >
      {!message.isSelf && <Avatar name={message.senderName} size="sm" showStatusDot={false} />}
      <div className={`flex max-w-[70%] flex-col ${message.isSelf ? "items-end" : "items-start"}`}>
        {showSender && !message.isSelf && (
          <span className="mb-1 px-1 text-xs font-medium text-ink-soft">
            {message.senderName}
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm shadow-pop ${
            message.isSelf
              ? "rounded-br-md bg-brown-600 text-cream"
              : "rounded-bl-md bg-white text-ink"
          }`}
        >
          <Markdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              ul: ({ children }) => <ul className="mb-2 list-inside list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 list-inside list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
            }}
          >
            {message.text}
          </Markdown>
        </div>
        <span className="mt-1 px-1 text-[11px] text-ink-soft/70">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}
