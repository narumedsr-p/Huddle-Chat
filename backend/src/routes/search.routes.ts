import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { auth } from "../middleware/auth";

export const searchRouter = Router();

searchRouter.get("/rooms/:roomId/search", auth, asyncHandler(searchController.searchRoom));

