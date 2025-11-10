// src/middleware/authMiddleware.ts
import { prisma } from "../config/database";
import { verifyAccessToken } from "../services/jwtService";
import { Request, Response, NextFunction } from "express";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token) as {
      userId?: string;
      tokenVersion?: number;
    };
    const userId = decoded?.userId;
    if (!userId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (decoded.tokenVersion !== (user as any).tokenVersion) {
      res.status(401).json({ error: "Token no longer valid" });
      return;
    }

    // attach to req
    // @ts-ignore
    req.user = { id: user.id, email: user.email, name: user.name };
    return next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}
