import { readFileSync } from "fs";
import path from "path";
import type { Express } from "express";
import yaml from "js-yaml";

export async function mountDocs(app: Express) {
  const specPath = path.join(__dirname, "..", "openapi.yaml");
  const spec = yaml.load(readFileSync(specPath, "utf8")) as Record<string, unknown>;

  app.get("/openapi.json", (_req, res) => res.json(spec));

  // @scalar/express-api-reference ships ESM-only — load it via dynamic import
  // so it works from this CommonJS backend without forcing an ESM migration.
  const { apiReference } = await import("@scalar/express-api-reference");
  app.use("/openapi", apiReference({ url: "/openapi.json" }));
}
