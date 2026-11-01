import { Router } from "express";
import { roomsController } from "../controllers/rooms.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { auth } from "../middleware/auth";

export const roomsRouter = Router();

roomsRouter.get("/rooms/:roomId/messages", auth, asyncHandler(roomsController.listMessages));
roomsRouter.post("/rooms/:roomId/messages", auth, asyncHandler(roomsController.sendMessage));
roomsRouter.post("/rooms/:roomId/summary", auth, asyncHandler(roomsController.summarize));
roomsRouter.put("/rooms/:roomId/read", auth, asyncHandler(roomsController.markRead));
