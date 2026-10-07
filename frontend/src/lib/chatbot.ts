import type { Client } from "../types";

// Frontend-only stub for a future AI assistant feature — not wired to the
// backend. Pinned at the top of the Users list, always shown online.
export const CHATBOT_CLIENT_ID = "chatbot";

export const CHATBOT_CLIENT: Client = {
  id: CHATBOT_CLIENT_ID,
  name: "Chatbot",
  online: true,
};
