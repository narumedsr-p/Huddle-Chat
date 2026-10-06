import express from "express";
import { mountDocs } from "./docs";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export async function createApp() {
  const app = express();
  app.use(express.json());
  await mountDocs(app);
  app.use("/api/v1", apiRouter);
  app.use(errorHandler);
  return app;
}
