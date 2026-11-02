import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import type { ApiMessage } from "../../api";
import { Avatar } from "../ui/Avatar";

interface SearchDrawerProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  onSelectMessage: (message: ApiMessage) => void;
}

function formatResultTime(ts: number) {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function SearchDrawer({
  open,
  onClose,
  roomId,
  roomName,
  onSelectMessage,
}: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input whenever drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setQuery("");
      setResults(null);
      setError(null);
    }
  }, [open, roomId]);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const { matches } = await api.searchRoom(roomId, trimmed);
      setResults(matches);
    } catch (err) {
      console.error("Semantic search failed:", err);
      setError("AI search encountered an error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const SUGGESTED_QUERIES = [
    "สรุปเรื่องสำคัญ",
    "Key decisions or agreements",
    "สิ่งที่ต้องทำต่อ",
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex h-full shrink-0 flex-col border-l border-brown-100 bg-white/80 backdrop-blur-md overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-brown-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-500" />
              <h3 className="text-sm font-semibold text-ink">Semantic Search</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-brown-500 transition hover:bg-brown-100/70 hover:text-brown-700"
              aria-label="Close search"
              title="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Input Box */}
          <div className="p-3 border-b border-brown-100/60 bg-cream/40">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-brown-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search in ${roomName}…`}
                className="w-full rounded-xl border border-brown-200/80 bg-white py-2 pl-9 pr-16 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-brown-500 focus:ring-2 focus:ring-brown-300/30"
              />
              <div className="absolute right-1.5 flex items-center gap-1.5">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResults(null);
                      inputRef.current?.focus();
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition hover:bg-brown-100 hover:text-ink"
                    aria-label="Clear query"
                    title="Clear query"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-brown-600 text-cream transition hover:bg-brown-700 disabled:opacity-40 disabled:hover:bg-brown-600"
                  aria-label="Search"
                  title="Search"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </form>
            <p className="mt-1.5 px-1 text-[11px] text-ink-soft/70">
              Matches by meaning and context in Thai or English
            </p>
          </div>

          {/* Search Content / Results */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-brown-500 mb-2" />
                <p className="text-sm font-medium text-ink">Analyzing messages with AI…</p>
                <p className="text-xs text-ink-soft mt-1">Searching past conversation context</p>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3 text-center text-xs text-red-600">
                {error}
              </div>
            )}

            {!loading && results !== null && results.length === 0 && (
              <div className="py-10 text-center text-ink-soft">
                <Search className="mx-auto h-8 w-8 text-brown-300 mb-2" />
                <p className="text-sm font-medium text-ink">No matching messages</p>
                <p className="text-xs text-ink-soft mt-1">
                  Try asking a different question or keyword.
                </p>
              </div>
            )}

            {!loading && results && results.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  {results.length} relevant {results.length === 1 ? "result" : "results"}
                </div>
                {results.map((msg) => {
                  const isBot = msg.senderId === "chatbot";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onSelectMessage(msg)}
                      className="group cursor-pointer rounded-2xl border border-brown-100 bg-white p-3 shadow-sm transition hover:border-brown-400 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar
                          name={msg.senderName}
                          size="sm"
                          showStatusDot={false}
                          icon={isBot ? <Bot className="h-3.5 w-3.5" /> : undefined}
                        />
                        <span className="truncate text-xs font-semibold text-ink">
                          {msg.senderName}
                        </span>
                        <span className="ml-auto text-[10px] text-ink-soft/70">
                          {formatResultTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft group-hover:text-ink line-clamp-3 leading-relaxed">
                        {msg.text}
                      </p>
                      <div className="mt-2 flex items-center justify-end text-[10px] font-medium text-brown-600 opacity-0 transition group-hover:opacity-100">
                        <span>Jump to message →</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {!loading && results === null && (
              <div className="py-6 px-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                  Semantic Search Tips
                </h4>
                <p className="text-xs text-ink-soft leading-relaxed mb-4">
                  Find messages by intent, concept, or questions even if you don't remember the exact
                  words.
                </p>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-ink-soft">Try searching:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTED_QUERIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setQuery(q);
                          setTimeout(() => handleSearch(), 50);
                        }}
                        className="rounded-full border border-brown-200/80 bg-white px-2.5 py-1 text-xs text-ink transition hover:border-brown-400 hover:bg-brown-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

