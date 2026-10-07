import type { WebSocket } from "ws";

// A client isn't a socket — the same client can hold several open connections
// at once (one per open tab), so presence has to be tracked at the client
// granularity while delivery still has to reach every one of its sockets.
const socketsByClient = new Map<string, Set<WebSocket>>();

function send(socket: WebSocket, type: string, payload: unknown) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify({ type, payload }));
}

export const hub = {
  add(clientId: string, socket: WebSocket) {
    const sockets = socketsByClient.get(clientId) ?? new Set<WebSocket>();
    sockets.add(socket);
    socketsByClient.set(clientId, sockets);
    return sockets.size === 1; // first socket for this client — was offline
  },

  remove(clientId: string, socket: WebSocket) {
    const sockets = socketsByClient.get(clientId);
    if (!sockets) return true;
    sockets.delete(socket);
    if (sockets.size > 0) return false;
    socketsByClient.delete(clientId);
    return true; // last socket closed — now offline
  },

  sendTo(clientId: string, type: string, payload: unknown) {
    const sockets = socketsByClient.get(clientId);
    if (!sockets) return;
    for (const socket of sockets) send(socket, type, payload);
  },

  sendToMany(clientIds: Iterable<string>, type: string, payload: unknown) {
    for (const id of clientIds) hub.sendTo(id, type, payload);
  },

  broadcast(type: string, payload: unknown) {
    for (const id of socketsByClient.keys()) hub.sendTo(id, type, payload);
  },
};
