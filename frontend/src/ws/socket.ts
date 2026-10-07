type Handler = (payload: unknown) => void;

const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 15_000;

// One full-duplex connection per tab, multiplexing every push type (message,
// typing, presence, unread, group) over the same socket instead of opening
// a separate connection — or separate poll — per concern.
export class ChatSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private retryMs = MIN_RETRY_MS;
  private closedByCaller = false;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.connect();
  }

  private connect() {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws?token=${encodeURIComponent(this.token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.retryMs = MIN_RETRY_MS;
      // Synthetic, not something the server sent — a reconnect is exactly
      // the "resync from a snapshot" case a sequence-numbered protocol would
      // handle with its own resume logic; here the caller just refetches.
      const set = this.handlers.get("open");
      if (set) for (const handler of set) handler(undefined);
    });

    ws.addEventListener("message", (event) => {
      let frame: { type?: string; payload?: unknown };
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (typeof frame.type !== "string") return;
      const set = this.handlers.get(frame.type);
      if (!set) return;
      for (const handler of set) handler(frame.payload);
    });

    // No distinction between a clean close and a dropped connection here —
    // either way the right move is the same backoff-and-retry a TCP sender
    // would do after a lost segment, just at the application layer instead.
    ws.addEventListener("close", () => {
      if (this.closedByCaller) return;
      const delay = this.retryMs;
      this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
      setTimeout(() => {
        if (!this.closedByCaller) this.connect();
      }, delay);
    });
  }

  on(type: string, handler: Handler): () => void {
    const set = this.handlers.get(type) ?? new Set<Handler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  send(type: string, data: Record<string, unknown>) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type, ...data }));
  }

  close() {
    this.closedByCaller = true;
    this.ws?.close();
  }
}
