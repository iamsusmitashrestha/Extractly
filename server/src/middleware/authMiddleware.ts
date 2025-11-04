// src/middleware/authMiddleware.ts
import { prisma } from "@/config/database";
import { verifyAccessToken } from "@/services/jwtService";
import { Request, Response, NextFunction } from "express";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token) as any;
    const userId = decoded?.userId;
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    // attach to req
    // @ts-ignore
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
