export interface Client {
  id: string;
  name: string;
  isSelf?: boolean;
  online: boolean;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
}

export type RoomKind = "private" | "group";

export interface Room {
  id: string;
  kind: RoomKind;
  /** For private rooms: the other client's id. For group rooms: the group id. */
  refId: string;
  name: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}
