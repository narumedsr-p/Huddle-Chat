import {Router} from "express"
import {auth} from "../middleware/auth"
import { asyncHandler } from "../lib/asyncHandler";
import { chatbotController } from "../controllers/chatbot.controller";

export const chatbotRouter = Router();

chatbotRouter.post("/chatbot",auth,asyncHandler(chatbotController.writeToChatbot));