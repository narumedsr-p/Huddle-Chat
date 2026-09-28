const REPLIES = [
  "Got it, thanks for the update!",
  "Haha nice, I was just about to send that.",
  "Let me check and get back to you.",
  "Sounds good 🍌",
  "Can you send that again as a screenshot?",
  "Working on the socket server now, almost there.",
  "That matches what I saw too.",
];

let cursor = 0;

export function nextAutoReply(): string {
  const reply = REPLIES[cursor % REPLIES.length];
  cursor += 1;
  return reply;
}

export const AUTO_REPLY_TYPING_MS = 1400;
