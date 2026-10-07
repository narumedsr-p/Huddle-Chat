import type { Request, Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { clientService } from "../services/clientService";
import { readStateService } from "../services/readStateService";

export const clientsController = {
  async list(_req: Request, res: Response) {
    const clients = await clientService.list();
    res.json({ clients });
  },

  async me(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const client = await clientService.getById(authed.client.id);
    res.json({ client });
  },

  async unreadCounts(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const unreadCounts = await readStateService.unreadCounts(authed.client.id);
    res.json({ unreadCounts });
  },
};
