import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { auth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/auth/register", asyncHandler(authController.register));
authRouter.post("/auth/login", asyncHandler(authController.login));
authRouter.delete("/auth/logout", auth, asyncHandler(authController.logout));
