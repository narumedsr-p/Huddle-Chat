import type { Request, Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { sessionService } from "../services/sessionService";

export const sessionsController = {
  async join(req: Request, res: Response) {
    const { name } = (req.body ?? {}) as { name?: unknown };
    const result = await sessionService.join(typeof name === "string" ? name : "");
    res.status(201).json(result);
  },

  async logout(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const token = (req.header("authorization") ?? "").slice(7);
    await sessionService.logout(authed.client.id, token);
    res.status(204).end();
  },

  async heartbeat(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    await sessionService.heartbeat(authed.client.id);
    res.status(204).end();
  },
};
