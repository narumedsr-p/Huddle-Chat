import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";
import { sessionRepository } from "../repositories/sessionRepository";

export interface AuthedRequest extends Request {
  client: { id: string; name: string };
}

export async function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "Missing or invalid token."));
    return;
  }
  const session = await sessionRepository.findByToken(token);
  if (!session) {
    next(new AppError(401, "UNAUTHORIZED", "Missing or invalid token."));
    return;
  }
  (req as AuthedRequest).client = { id: session.client.id, name: session.client.name };
  next();
}
