import { Router } from "express";
import { clientsRouter } from "./clients.routes";
import { groupsRouter } from "./groups.routes";
import { roomsRouter } from "./rooms.routes";
import { sessionsRouter } from "./sessions.routes";

export const apiRouter = Router();

apiRouter.use(sessionsRouter);
apiRouter.use(clientsRouter);
apiRouter.use(groupsRouter);
apiRouter.use(roomsRouter);
