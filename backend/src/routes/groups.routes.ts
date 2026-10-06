import { Router } from "express";
import { groupsController } from "../controllers/groups.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { auth } from "../middleware/auth";

export const groupsRouter = Router();

groupsRouter.get("/groups", auth, asyncHandler(groupsController.list));
groupsRouter.post("/groups", auth, asyncHandler(groupsController.create));
groupsRouter.post("/groups/:groupId/members", auth, asyncHandler(groupsController.join));
groupsRouter.delete("/groups/:groupId/members/me", auth, asyncHandler(groupsController.leave));
