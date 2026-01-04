import { prisma } from "../config/database";
import { verifyAccessToken } from "../services/jwtService";
import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../errrors/AppError";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing authorization header");
  }

  const token = authHeader.split(" ")[1];
  let decoded: { userId?: string; tokenVersion?: number };

  try {
    decoded = verifyAccessToken(token) as any;
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const userId = decoded?.userId;
  if (!userId) {
    throw new UnauthorizedError("Invalid token payload");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  if (decoded.tokenVersion !== (user as any).tokenVersion) {
    throw new UnauthorizedError("Token no longer valid");
  }

  // attach to req
  // @ts-ignore
  req.user = { id: user.id, email: user.email, name: user.name };
  next();
}
