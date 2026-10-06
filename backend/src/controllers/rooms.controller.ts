import type { Request, Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { messageService } from "../services/messageService";
import { readStateService } from "../services/readStateService";
import { typingService } from "../services/typingService";

function decodeRoomId(req: Request) {
  return decodeURIComponent(req.params.roomId);
}

export const roomsController = {
  async listMessages(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const roomId = decodeRoomId(req);
    const before = req.query.before ? Number(req.query.before) : undefined;
    const after = req.query.after ? Number(req.query.after) : undefined;
    const result = await messageService.list(roomId, authed.client.id, { before, after });
    res.json(result);
  },

  async sendMessage(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const roomId = decodeRoomId(req);
    const { text } = (req.body ?? {}) as { text?: unknown };
    const message = await messageService.send(
      roomId,
      authed.client.id,
      typeof text === "string" ? text : "",
    );
    res.status(201).json(message);
  },

  async getTyping(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const roomId = decodeRoomId(req);
    const typing = await typingService.listTypers(roomId, authed.client.id);
    res.json({ typing });
  },

  async setTyping(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const roomId = decodeRoomId(req);
    const { typing } = (req.body ?? {}) as { typing?: unknown };
    await typingService.setTyping(roomId, authed.client.id, Boolean(typing));
    res.status(204).end();
  },

  async markRead(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const roomId = decodeRoomId(req);
    await readStateService.markRead(roomId, authed.client.id);
    res.status(204).end();
  },
};
