import type { Request, Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { searchService } from "../services/searchService";

function decodeRoomId(req: Request) {
  return decodeURIComponent(req.params.roomId);
}

export const searchController = {
  async searchRoom(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const roomId = decodeRoomId(req);
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const result = await searchService.searchRoom(roomId, authed.client.id, query);
    res.json(result);
  },
};

