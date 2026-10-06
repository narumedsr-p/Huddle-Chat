/** DTO shapes returned by the backend — see backend/API.md. `isSelf` on the
 * frontend's `Message` type is derived client-side, not part of the wire shape. */

export interface ApiClient {
  id: string;
  name: string;
  online: boolean;
}

export interface ApiGroup {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
}

export interface ApiMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ApiTyper {
  clientId: string;
  name: string;
}
