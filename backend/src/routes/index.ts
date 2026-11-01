import { Router } from "express";
import { aiRouter } from "./ai.routes";
import { authRouter } from "./auth.routes";
import { clientsRouter } from "./clients.routes";
import { groupsRouter } from "./groups.routes";
import { roomsRouter } from "./rooms.routes";

export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(clientsRouter);
apiRouter.use(groupsRouter);
apiRouter.use(roomsRouter);
apiRouter.use(aiRouter);
