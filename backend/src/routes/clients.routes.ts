import { Router } from "express";
import { clientsController } from "../controllers/clients.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { auth } from "../middleware/auth";

export const clientsRouter = Router();

clientsRouter.get("/clients", auth, asyncHandler(clientsController.list));
clientsRouter.get("/clients/me/unread-counts", auth, asyncHandler(clientsController.unreadCounts));
clientsRouter.get("/clients/me", auth, asyncHandler(clientsController.me));
