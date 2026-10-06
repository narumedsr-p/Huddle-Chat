import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", apiRouter);
  app.use(errorHandler);
  return app;
}
