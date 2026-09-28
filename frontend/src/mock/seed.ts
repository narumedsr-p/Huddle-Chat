import type { Client, Group, Message } from "../types";

/** The five "featured" clients anchor the group memberships below. */
const FEATURED_NAMES = ["Nara", "Ploy", "Tar", "Fah", "Korn"] as const;
const FEATURED_ONLINE: Record<string, boolean> = {
  Nara: true,
  Ploy: true,
  Tar: true,
  Fah: false,
  Korn: false,
};

/** Bulk roster so the client list feels like a real ~100-person server. */
const EXTRA_NAMES = [
  "Bank", "Boss", "Bua", "Cherry", "Fon", "Gap", "Gift", "Golf", "Grace", "Guy",
  "Ice", "Ing", "Jane", "Jeans", "Jib", "Job", "June", "Kai", "Kate", "Kem",
  "Ken", "Khai", "Kim", "Kong", "Kwan", "Lek", "Lisa", "Look", "Mai", "Meen",
  "Milk", "Mint", "Mo", "Mook", "Nam", "Nan", "Nat", "New", "Nicky", "Nid",
  "Nok", "Noon", "Nune", "Oil", "Om", "Orn", "Pae", "Palm", "Pang", "Parn",
  "Peach", "Pear", "Plug", "Poon", "Por", "Pream", "Prim", "Punch", "Pupe", "Rain",
  "Ray", "Ren", "Ruby", "Saay", "Salt", "Sand", "Sea", "Show", "Sun", "Tata",
  "Tia", "Ton", "Tong", "Toey", "Tulip", "Un", "View", "Vill", "Waan", "Wan",
  "Win", "Wine", "Yam", "Yo", "Yui", "Ann", "Bella", "Candy", "Dee", "Eve",
  "Faye", "Honey", "Iris", "Joy", "Kiki", "Luna", "Maya", "Nina", "Opal", "Penny",
] as const;

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

const featuredClients: Client[] = FEATURED_NAMES.map((name) => ({
  id: `c-${slug(name)}`,
  name,
  online: FEATURED_ONLINE[name],
}));

const extraClients: Client[] = EXTRA_NAMES.map((name, i) => ({
  id: `c-${slug(name)}`,
  name,
  // roughly 40% online, 60% offline — realistic for a big roster
  online: i % 5 < 2,
}));

export const SEED_CLIENTS: Client[] = [...featuredClients, ...extraClients];

function findId(name: string) {
  return `c-${slug(name)}`;
}

export const SEED_GROUPS: Group[] = [
  {
    id: "g-monkey-business",
    name: "Monkey Business",
    createdBy: findId("Nara"),
    memberIds: [findId("Nara"), findId("Ploy"), findId("Kwan"), findId("Golf")],
  },
  {
    id: "g-banana-republic",
    name: "Banana Republic",
    createdBy: findId("Tar"),
    memberIds: [findId("Tar"), findId("Fah"), findId("Korn"), findId("Milk"), findId("Ray")],
  },
  {
    id: "g-jungle-devs",
    name: "Jungle Devs",
    createdBy: findId("Grace"),
    memberIds: [findId("Grace"), findId("Ice"), findId("Boss"), findId("June")],
  },
];

function minutesAgo(min: number) {
  return Date.now() - min * 60 * 1000;
}

let seq = 0;
function line(senderId: string, senderName: string, text: string, min: number): Omit<Message, "roomId"> {
  seq += 1;
  return {
    id: `seed-${seq}`,
    senderId,
    senderName,
    text,
    timestamp: minutesAgo(min),
    isSelf: false,
  };
}

/** Group history has no "self" lines — the joining user isn't a member until they choose to join. */
export const SEED_MESSAGES: Record<string, Omit<Message, "roomId">[]> = {
  [`group:g-monkey-business`]: [
    line(findId("Nara"), "Nara", "Welcome to Monkey Business! Drop your socket programming questions here.", 130),
    line(findId("Ploy"), "Ploy", "Anyone figured out the group-join requirement yet?", 125),
    line(findId("Kwan"), "Kwan", "Yeah — R10 wants join-by-choice, not auto-added by the creator.", 122),
    line(findId("Golf"), "Golf", "Makes sense, matches how Discord/Slack work too.", 120),
    line(findId("Nara"), "Nara", "Exactly. I'll wire that into the mock today.", 118),
    line(findId("Ploy"), "Ploy", "Nice, let me know if you want a second pair of eyes on it.", 95),
    line(findId("Kwan"), "Kwan", "Also — R9 wants the member list visible before joining, right?", 70),
    line(findId("Nara"), "Nara", "Yep, expandable list with names, no need to join to see who's in it.", 68),
    line(findId("Golf"), "Golf", "Got it, updating my notes.", 60),
    line(findId("Nara"), "Nara", "Standup in 10, don't forget 🐒", 12),
  ],
  [`group:g-banana-republic`]: [
    line(findId("Tar"), "Tar", "Standup notes: sockets are up, working on the chat room UI next.", 200),
    line(findId("Fah"), "Fah", "I'm on the private message encryption question for R7.", 195),
    line(findId("Korn"), "Korn", "R7 doesn't need encryption, just scoping messages to sender/receiver.", 193),
    line(findId("Fah"), "Fah", "Ah good catch, simplifies things a lot.", 192),
    line(findId("Milk"), "Milk", "Can someone review my PR for the group list UI?", 150),
    line(findId("Ray"), "Ray", "On it, looking now.", 148),
    line(findId("Tar"), "Tar", "While you're in there, check the join/open button logic too.", 146),
    line(findId("Ray"), "Ray", "Looks right — shows Join when you're not a member, Open once you are.", 140),
    line(findId("Korn"), "Korn", "Nice. What about the AI feature slot, anyone started that?", 90),
    line(findId("Fah"), "Fah", "Not yet, leaving that for after the mock is approved.", 88),
    line(findId("Milk"), "Milk", "Same, priorities first.", 85),
    line(findId("Tar"), "Tar", "Agreed, let's lock the UI review this week.", 20),
  ],
  [`group:g-jungle-devs`]: [
    line(findId("Grace"), "Grace", "New group! Figured we could talk frontend design here.", 180),
    line(findId("Ice"), "Ice", "Bai Jamjuree font looks great with the brown/yellow theme.", 175),
    line(findId("Boss"), "Boss", "Agreed, the rounded corners feel very 'modern' too.", 172),
    line(findId("June"), "June", "The monkey-eating-banana logo is a nice touch too.", 160),
    line(findId("Grace"), "Grace", "Thanks! Took a few tries to get the proportions right.", 155),
    line(findId("Ice"), "Ice", "Are we doing the browser-tab style for open chats?", 100),
    line(findId("Boss"), "Boss", "Yeah, moved it to the top of the chat panel like Chrome tabs.", 95),
    line(findId("June"), "June", "Much better than burying it in the sidebar.", 92),
    line(findId("Grace"), "Grace", "Next up: trimming some of the heavier animations.", 30),
  ],
};

export const AUTO_REPLY_SOURCE_ID = findId("Nara");

// ---------------------------------------------------------------------------
// Long, bidirectional private-chat history — generated per contact once the
// joining user's identity exists (there's no seeded "self" until join time).
// ---------------------------------------------------------------------------

interface ScriptLine {
  from: "them" | "me";
  text: string;
}

const SCRIPTS: ScriptLine[][] = [
  [
    { from: "them", text: "Hey! Have you looked at the R7 requirement yet?" },
    { from: "me", text: "Not yet, was buried in the socket server code lol" },
    { from: "them", text: "Ah no worries. Private messages just need to be scoped to sender + receiver only." },
    { from: "me", text: "Right, that's what I figured. No group broadcast for DMs." },
    { from: "them", text: "Exactly. Let me know if you want to pair on the UI for it." },
    { from: "me", text: "Sure, maybe later today?" },
    { from: "them", text: "Works for me 👍" },
  ],
  [
    { from: "them", text: "hey! welcome to 1Carry3Monkey 🐒" },
    { from: "me", text: "thanks! excited to be here" },
    { from: "them", text: "let me know if you need help finding anything" },
    { from: "me", text: "will do, appreciate it" },
    { from: "them", text: "np, see you around" },
    { from: "me", text: "for sure 👋" },
  ],
  [
    { from: "them", text: "bro the deadline is in 2 days and I haven't started the group feature 😭" },
    { from: "me", text: "same tbh, let's just divide it up" },
    { from: "them", text: "ok you take groups, I'll do private messages" },
    { from: "me", text: "deal" },
    { from: "them", text: "sending you my progress tonight" },
    { from: "me", text: "sounds good, thanks for handling this" },
    { from: "them", text: "np, we got this" },
  ],
  [
    { from: "them", text: "found a bug — messages don't scroll to bottom automatically" },
    { from: "me", text: "oh good catch, I'll add an auto-scroll effect" },
    { from: "them", text: "also the online list doesn't update when someone logs off" },
    { from: "me", text: "yeah that one's tricky without a real socket connection yet" },
    { from: "them", text: "makes sense, it's just the mock for now right?" },
    { from: "me", text: "yep, backend comes later" },
    { from: "them", text: "cool, makes sense to nail the UI first" },
    { from: "me", text: "exactly the plan" },
  ],
  [
    { from: "them", text: "lunch after this class?" },
    { from: "me", text: "yeah I'm down, the usual place?" },
    { from: "them", text: "yeah let's go around noon" },
    { from: "me", text: "see you then!" },
    { from: "them", text: "bringing my laptop, we can debug over food lol" },
    { from: "me", text: "haha deal" },
  ],
  [
    { from: "them", text: "your chat UI looks really clean btw" },
    { from: "me", text: "thanks! spent way too long on the color palette lol" },
    { from: "them", text: "worth it, the brown/yellow theme is nice" },
    { from: "me", text: "appreciate it 🍌" },
    { from: "them", text: "good luck with the presentation!" },
    { from: "me", text: "you too!" },
  ],
  [
    { from: "them", text: "did you join any of the groups yet?" },
    { from: "me", text: "not yet, still exploring" },
    { from: "them", text: "Monkey Business is pretty active if you want in" },
    { from: "me", text: "oh nice, I'll check it out" },
    { from: "them", text: "it's mostly project questions but sometimes memes too" },
    { from: "me", text: "sounds like my kind of group" },
    { from: "them", text: "haha same, see you in there" },
  ],
  [
    { from: "them", text: "are you using websockets or raw TCP sockets for this?" },
    { from: "me", text: "raw TCP for now, might layer websockets later for the browser client" },
    { from: "them", text: "makes sense given the course requirement" },
    { from: "me", text: "yeah, professor wants us to show socket programming directly" },
    { from: "them", text: "good luck with the server code!" },
    { from: "me", text: "thanks, going to need it" },
    { from: "them", text: "shout if you get stuck, happy to rubber-duck" },
    { from: "me", text: "will do, appreciate it" },
  ],
];

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function generatePrivateHistory(
  currentUser: { id: string; name: string },
  other: Client,
): Message[] {
  const h = hashId(other.id);
  const script = SCRIPTS[h % SCRIPTS.length];
  const baseMinutesAgo = 8 + (h % (60 * 24 * 3)); // spread across the last ~3 days
  const gap = 1 + (h % 4);

  return script.map((entry, i) => {
    const isSelf = entry.from === "me";
    const minutesFromEnd = (script.length - 1 - i) * gap;
    return {
      id: `hist-${other.id}-${i}`,
      roomId: `private:${other.id}`,
      senderId: isSelf ? currentUser.id : other.id,
      senderName: isSelf ? currentUser.name : other.name,
      text: entry.text,
      timestamp: minutesAgo(baseMinutesAgo + minutesFromEnd),
      isSelf,
    };
  });
}
