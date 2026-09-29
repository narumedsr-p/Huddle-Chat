import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";

interface MessageInputProps {
  onSend: (text: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="flex items-end gap-2 border-t border-brown-100 bg-white/70 px-4 py-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Type a message…"
        rows={1}
        className="h-11 max-h-32 flex-1 resize-none rounded-2xl border border-brown-100 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brown-500 focus:ring-2 focus:ring-brown-300/50"
      />
      <Button
        onClick={submit}
        disabled={!text.trim()}
        aria-label="Send message"
        className="h-11 shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
