import { Router } from "express";
import { authRouter } from "./auth.routes";
import { clientsRouter } from "./clients.routes";
import { groupsRouter } from "./groups.routes";
import { roomsRouter } from "./rooms.routes";
import { chatbotRouter } from "./chatbot.routes";
import { searchRouter } from "./search.routes";

export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(clientsRouter);
apiRouter.use(groupsRouter);
apiRouter.use(roomsRouter);
apiRouter.use(chatbotRouter);
apiRouter.use(searchRouter);
