import { motion } from "framer-motion";
import { useState } from "react";
import { useChatStore } from "../state/useChatStore";
import { MonkeyMascot } from "./MonkeyMascot";
import { Button } from "./ui/Button";

export function JoinScreen() {
  const { join } = useChatStore();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = join(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cream via-cream to-gold-300/30 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm rounded-3xl bg-white/70 p-8 shadow-soft backdrop-blur"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
            className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gold-300/50 shadow-pop"
          >
            <MonkeyMascot className="h-14 w-14" />
          </motion.div>
          <h1 className="text-2xl font-semibold text-ink">1Carry3Monkey</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Pick a unique name to join the troop.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Your display name"
            className="rounded-2xl border border-brown-100 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brown-500 focus:ring-2 focus:ring-brown-300/50"
          />
          {/* Fixed-height slot so the error appearing/disappearing never
              resizes the card — this card is vertically centered on screen,
              so a height change would visibly jump the whole thing. */}
          <div className="min-h-[1.1rem]">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium text-red-500"
              >
                {error}
              </motion.p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Join chat
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
