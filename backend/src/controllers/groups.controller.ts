import type { Request, Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { groupService } from "../services/groupService";

export const groupsController = {
  async list(_req: Request, res: Response) {
    const groups = await groupService.list();
    res.json({ groups });
  },

  async create(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const { name } = (req.body ?? {}) as { name?: unknown };
    const group = await groupService.create(typeof name === "string" ? name : "", authed.client.id);
    res.status(201).json(group);
  },

  async join(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const group = await groupService.join(req.params.groupId, authed.client.id);
    res.json(group);
  },

  async leave(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    await groupService.leave(req.params.groupId, authed.client.id);
    res.status(204).end();
  },
};
