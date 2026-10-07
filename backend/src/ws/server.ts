import type { IncomingMessage, Server as HttpServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { groupRoomKey, parseRoomId, privateRoomKey } from "../lib/roomId";
import { clientRepository } from "../repositories/clientRepository";
import { groupRepository } from "../repositories/groupRepository";
import { sessionRepository } from "../repositories/sessionRepository";
import { hub } from "./hub";

const WS_PATH = "/ws";
// WebSocket's own ping/pong (RFC 6455 §5.5.2/5.5.3) is what actually detects
// a half-open socket — a dead peer never sends a FIN, it just stops
// answering control frames, so without this a closed laptop lid would look
// online forever.
const PING_INTERVAL_MS = 30_000;

interface TypingFrame {
  type: "typing";
  roomId: string;
  typing: boolean;
}

function parseFrame(raw: unknown): TypingFrame | null {
  try {
    const data = JSON.parse(String(raw));
    if (data?.type === "typing" && typeof data.roomId === "string") {
      return { type: "typing", roomId: data.roomId, typing: Boolean(data.typing) };
    }
  } catch {
    // not well-formed JSON — ignore the datagram rather than tear down the connection
  }
  return null;
}

async function tokenFromUpgrade(req: IncomingMessage) {
  const url = new URL(req.url ?? "", "http://internal");
  const token = url.searchParams.get("token");
  if (!token) return null;
  const session = await sessionRepository.findByToken(token);
  return session?.client ?? null;
}

async function fanOutTyping(senderId: string, senderName: string, frame: TypingFrame) {
  const ref = parseRoomId(frame.roomId);
  if (ref.kind === "group") {
    const group = await groupRepository.findByIdWithMembers(ref.groupId);
    if (!group) return;
    const recipients = group.members.map((m) => m.clientId).filter((id) => id !== senderId);
    hub.sendToMany(recipients, "typing", {
      roomId: groupRoomKey(ref.groupId),
      clientId: senderId,
      name: senderName,
      typing: frame.typing,
    });
    return;
  }
  // Private rooms are addressed relative to the viewer — "my chat with X" and
  // "X's chat with me" are two different room ids for the same conversation.
  hub.sendTo(ref.otherClientId, "typing", {
    roomId: privateRoomKey(senderId),
    clientId: senderId,
    name: senderName,
    typing: frame.typing,
  });
}

export function attachWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "", "http://internal");
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const client = await tokenFromUpgrade(req);
    if (!client) {
      ws.close(4001, "unauthorized");
      return;
    }

    let alive = true;
    ws.on("pong", () => {
      alive = true;
    });

    const cameOnline = hub.add(client.id, ws);
    if (cameOnline) {
      await clientRepository.setOnline(client.id, true);
      hub.broadcast("presence", { clientId: client.id, online: true });
    }

    ws.on("message", (raw) => {
      const frame = parseFrame(raw);
      if (frame) fanOutTyping(client.id, client.name, frame).catch(() => {});
    });

    ws.on("close", async () => {
      const wentOffline = hub.remove(client.id, ws);
      if (wentOffline) {
        await clientRepository.setOnline(client.id, false);
        hub.broadcast("presence", { clientId: client.id, online: false });
      }
    });

    const pinger = setInterval(() => {
      if (!alive) {
        ws.terminate();
        return;
      }
      alive = false;
      ws.ping();
    }, PING_INTERVAL_MS);
    ws.on("close", () => clearInterval(pinger));
  });

  return wss;
}
