import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "./routes.js";

export async function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  await registerRoutes(app);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
}
