import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Express, Request, RequestHandler } from "express";
import { storage } from "./storage.js";

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  app.use(
    clerkMiddleware({
      publishableKey:
        process.env.CLERK_PUBLISHABLE_KEY ??
        process.env.VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    }),
  );
}

export function getUserId(req: Request): string | null {
  return getAuth(req).userId;
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

// Check if user is admin
export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const dbUser = await storage.getUser(userId);
  if (!dbUser || dbUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
};

// Check if user can create and organize tournaments
export const isOrganizer: RequestHandler = async (req, res, next) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const dbUser = await storage.getUser(userId);
  if (!dbUser || !["organizer", "admin"].includes(dbUser.role)) {
    return res.status(403).json({ message: "Organizer access required" });
  }

  return next();
};

// Check if user owns resource or is admin
export const isOwnerOrAdmin = (
  getResourceOwnerId: (req: any) => Promise<string | null>,
): RequestHandler => {
  return async (req, res, next) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const dbUser = await storage.getUser(userId);

    // Admin can access everything
    if (dbUser?.role === "admin") {
      return next();
    }

    // Check if user owns the resource
    const resourceOwnerId = await getResourceOwnerId(req);
    if (resourceOwnerId === userId) {
      return next();
    }

    return res.status(403).json({ message: "Access denied" });
  };
};
