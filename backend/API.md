# 1Carry3Monkey — API Specification (v1, REST-only)

Derived from the current mock frontend (`frontend/src/state/useChatStore.tsx`,
`frontend/src/mock/seed.ts`, `frontend/src/mock/autoReply.ts`). This spec covers what the backend
needs to implement to replace the in-memory mock with a real API. **No WebSocket** — everything is
plain REST, including things that would normally be realtime (new messages, typing, presence),
handled via short-interval polling. AI features (TTS, summarization, chatbot) are intentionally
excluded from this document.

## 1. Scope

Features observed in the mock that need a real API:

- **Join**: pick a unique display name → becomes a new client. No password/account system in the
  mock.
- **Clients (users)**: online/offline status, searchable by name, open a private room with another
  client.
- **Groups**: split into "My Groups" (member) vs "Discover Groups" (not a member yet). Member list
  is visible *before* joining (`GroupMembersModal` doesn't require membership to preview). Create
  group, join group, leave group. Creating a group does not auto-add anyone else.
- **Rooms**: `private:<clientId>` and `group:<groupId>` are derived ids, not separate entities to
  create. Open/close/switch rooms (tab bar), per-room unread count.
- **Messaging**: send a message in a room, fetch history, typing indicator. The mock's auto-reply
  bot is not part of the real API — a real backend only delivers messages from real clients (AI
  chatbot is a separate concern, see note at the end).
- **Presence**: per-client online/offline.
- **Logout**: end session.

Not present in the mock, so not required, but worth flagging for backend design: real
password/auth, message edit/delete, reactions, per-member read receipts (today there's only the
viewer's own unread count), file/image attachments.

## 2. Transport & conventions

Base URL: `/api/v1`

Everything is request/response REST. Anything that would be realtime in a full implementation
(new messages arriving, someone typing, presence changes, group membership changes from other
users) is surfaced through **polling** instead of push:

| Data | Suggested poll interval | Endpoint |
|---|---|---|
| New messages in the active room | 2–3s while a room is open/active | `GET /rooms/:roomId/messages?after=<timestamp>` |
| Typing indicator in the active room | same cadence as messages | `GET /rooms/:roomId/typing` |
| Client list (presence) | 10–15s | `GET /clients` |
| Group list (membership changes by others) | 15–30s | `GET /groups` |

This is a deliberate simplification to avoid needing a WebSocket/realtime layer for the first
backend pass. It's straightforward to swap the polling calls for WebSocket pushes later without
changing the data model — each polling endpoint maps 1:1 to what would become a push event.

### Auth

The mock has no password — joining with an unused name is enough to become a client. Keep that
behavior, but issue a **session token** on join so requests can be tied to a client id without a
real account system. Send it as `Authorization: Bearer <token>` on every request except
`POST /sessions`.

### Error format (all endpoints)

```json
{ "error": { "code": "NAME_TAKEN", "message": "\"Nara\" is already taken. Try another name." } }
```

HTTP status follows normal semantics: `400` validation, `401` missing/expired token, `403` not
authorized for the resource (e.g. posting into a group you haven't joined), `404` not found, `409`
conflict (duplicate name, duplicate group name).

## 3. Data models

```ts
Client {
  id: string
  name: string
  online: boolean
}

Group {
  id: string
  name: string
  createdBy: string   // Client.id
  memberIds: string[]
}

Message {
  id: string
  roomId: string       // "private:<clientId>" | "group:<groupId>"
  senderId: string
  senderName: string
  text: string
  timestamp: number     // epoch ms
}
```

Note: `isSelf` in the current frontend is a derived field (`senderId === currentUser.id`) — don't
return it from the backend, compute it client-side.

## 4. Endpoints

### 4.1 Session

**`POST /sessions`** — join
```json
// request
{ "name": "Nara" }
// response 201
{
  "token": "sess_abc123",
  "client": { "id": "c-nara", "name": "Nara", "online": true }
}
```
Errors: `400 EMPTY_NAME`, `400 NAME_TOO_LONG` (>24 chars), `409 NAME_TAKEN`

**`DELETE /sessions/me`** — logout (auth required). Marks the client offline and invalidates the
token.
Response: `204`

**`POST /sessions/me/heartbeat`** — keep-alive, call every ~20s while the tab is open. Backend
marks a client `offline` if no heartbeat is received within a timeout window (e.g. 45s). This
replaces a real presence/disconnect signal since there's no persistent connection.
Response: `204`

### 4.2 Clients

**`GET /clients`** — all clients (for the Users tab). Poll this to pick up presence changes.
```json
{ "clients": [ { "id": "c-nara", "name": "Nara", "online": true }, ... ] }
```

**`GET /clients/me`** — the current client, resolved from the token.

### 4.3 Groups

**`GET /groups`** — every group, joined or not (frontend splits My/Discover itself).
```json
{
  "groups": [
    { "id": "g-monkey-business", "name": "Monkey Business", "createdBy": "c-nara",
      "memberIds": ["c-nara", "c-ploy", "c-kwan", "c-golf"] }
  ]
}
```
Note: `memberIds` is always returned in full, even if the caller hasn't joined, because
`GroupMembersModal` previews members before joining. Poll this to see group creations/membership
changes made by other clients.

**`POST /groups`** — create a group (creator is immediately the sole member).
```json
// request
{ "name": "Jungle Devs" }
// response 201
{ "id": "g-jungle-devs-172...", "name": "Jungle Devs", "createdBy": "c-nara", "memberIds": ["c-nara"] }
```
Errors: `400 EMPTY_NAME`, `409 GROUP_NAME_TAKEN`

**`POST /groups/:groupId/members`** — join a group as the caller (no body; client comes from the
token).
Response `200`, returns the updated group.
Errors: `404 GROUP_NOT_FOUND`, `409 ALREADY_MEMBER`

**`DELETE /groups/:groupId/members/me`** — leave a group.
Response `204`
Errors: `404 GROUP_NOT_FOUND`, `409 NOT_A_MEMBER`

### 4.4 Messages

Room id is passed straight through from the frontend: `private:c-nara` or
`group:g-monkey-business` (URL-encode the `:` when calling).

**`GET /rooms/:roomId/messages`** — history, cursor-paginated.

Query params:
- `before=<timestamp>&limit=50` — paging backwards for scroll-up history (initial load on opening
  a room)
- `after=<timestamp>` — paging forward, used for polling new messages while a room stays open

Fetch lazily on room open, not preloaded for every contact at join time like the mock does (the
mock generates private history for every client up front — fine for a handful of seed clients,
not for a real roster).

```json
{
  "messages": [ { "id": "m1", "roomId": "private:c-nara", "senderId": "c-nara",
                  "senderName": "Nara", "text": "hey!", "timestamp": 1735900000000 } ],
  "hasMore": true
}
```
Errors: `403 NOT_A_PARTICIPANT` (private room you're not part of, or a group room you haven't
joined)

**`POST /rooms/:roomId/messages`** — send a message.
```json
// request
{ "text": "are we on track for the deadline" }
// response 201 — server fills id/senderId/senderName/timestamp
{ "id": "m2", "roomId": "group:g-monkey-business", "senderId": "c-nara", "senderName": "Nara",
  "text": "are we on track for the deadline", "timestamp": 1735900100000 }
```
Errors: `400 EMPTY_TEXT`, `403 NOT_A_PARTICIPANT`

Other participants pick this up via their own `GET .../messages?after=` poll — no push from this
endpoint.

**`GET /rooms/:roomId/typing`** — who's currently typing in this room (poll while the room is
open/active).
```json
{ "typing": [ { "clientId": "c-ploy", "name": "Ploy" } ] }
```

**`PUT /rooms/:roomId/typing`** — report your own typing state. Call on keypress (debounced) and
again on send/stop. Treat as short-lived — the backend should expire an entry automatically after
a few seconds (e.g. 5s) even if no explicit "stop" arrives, so a closed tab doesn't leave a stale
"typing…" indicator.
```json
// request
{ "typing": true }
```
Response: `204`

### 4.5 Unread counts

**`GET /clients/me/unread-counts`** — poll alongside clients/groups (~10s) to drive the badge
counts in `UserPanel`/`GroupPanel`.
```json
{ "unreadCounts": { "group:g-monkey-business": 2, "private:c-ploy": 1 } }
```
A room only appears in the map once it has at least one unread message. Unread is computed as
messages addressed to the caller (group membership, or private messages where the caller is
sender or recipient) with `timestamp > lastReadAt` for that room, excluding messages the caller
sent themselves — mirrors the mock's `SEND_MESSAGE` reducer condition
(`!message.isSelf && roomId !== activeRoomId`).

**`PUT /rooms/:roomId/read`** — marks the caller's `lastReadAt` for this room as now. Call this at
the same moment the mock zeroes `unreadCounts[roomId]`, i.e. whenever `setActiveRoom` fires.
Response: `204`
Errors: `403 NOT_A_PARTICIPANT`

## 5. Deliberately left out of this spec (don't carry these over from the mock)

- **Preloaded private history for every client at join time** (`generatePrivateHistory`) — real
  clients use `GET /rooms/:roomId/messages` lazily, only for rooms actually opened.
- **Auto-reply bot** (`mock/autoReply.ts`) — a real backend doesn't fabricate replies; nothing
  responds unless another real client (or, later, an AI chatbot — separate feature) sends a
  message.
- **Client ids generated from `Date.now()`** — the backend should generate ids itself (UUID) to
  avoid collisions.

## 6. Known limitation of the REST-only/polling approach

Polling means messages and typing indicators lag by up to one poll interval, and N open tabs /
clients means N× polling load on the backend. That's an acceptable tradeoff to ship a first
backend without a realtime stack. If this becomes a real pain point later (laggy chat, backend load
under more concurrent users), the fix is additive — swap the `after=`/`typing` polling calls for a
WebSocket push without changing any other endpoint or the data model.
