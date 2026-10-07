import type { Request, Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { authService } from "../services/authService";

function credentials(req: Request): { name: string; password: string } {
  const { name, password } = (req.body ?? {}) as { name?: unknown; password?: unknown };
  return {
    name: typeof name === "string" ? name : "",
    password: typeof password === "string" ? password : "",
  };
}

export const authController = {
  async register(req: Request, res: Response) {
    const { name, password } = credentials(req);
    const result = await authService.register(name, password);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const { name, password } = credentials(req);
    const result = await authService.login(name, password);
    res.status(200).json(result);
  },

  async logout(req: Request, res: Response) {
    const authed = req as AuthedRequest;
    const token = (req.header("authorization") ?? "").slice(7);
    await authService.logout(authed.client.id, token);
    res.status(204).end();
  },
};
