import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { asyncHandler } from "../lib/asyncHandler";
import { audioUpload } from "../middleware/audioUpload";
import { auth } from "../middleware/auth";

export const aiRouter = Router();

aiRouter.post("/ai/speech-to-text", auth, audioUpload, asyncHandler(aiController.speechToText));
