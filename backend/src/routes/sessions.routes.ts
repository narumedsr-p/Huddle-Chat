import { Router } from "express";
import { sessionsController } from "../controllers/sessions.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { auth } from "../middleware/auth";

export const sessionsRouter = Router();

sessionsRouter.post("/sessions", asyncHandler(sessionsController.join));
sessionsRouter.delete("/sessions/me", auth, asyncHandler(sessionsController.logout));
sessionsRouter.post("/sessions/me/heartbeat", auth, asyncHandler(sessionsController.heartbeat));
