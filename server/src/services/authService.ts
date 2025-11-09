import bcrypt from "bcrypt";
import { prisma } from "../config/database";

import { signAccessToken, createRefreshToken, sha256 } from "./jwtService";
import { LoginInput, RegisterInput } from "../middleware/validationMiddleware";
import { ConflictError, NotFoundError } from "../errrors/AppError";

const SALT_ROUNDS = 10;

export async function registerUser(user: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (existing) {
    throw new ConflictError("Email already in use");
  }

  const hashed = await bcrypt.hash(user.password, SALT_ROUNDS);
  const newUser = await prisma.user.create({
    data: {
      email: user.email,
      password: hashed,
      name: user.name,
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return newUser;
}

export async function loginUser(user: LoginInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (!existingUser) throw new NotFoundError("User not found");

  const ok = await bcrypt.compare(user.password, existingUser.password);
  if (!ok) throw new Error("Incorrect password");

  const accessToken = signAccessToken({
    userId: existingUser.id,
    tokenVersion: (existingUser as any).tokenVersion ?? 0,
  });
  const refresh = await createRefreshToken(existingUser.id);

  return {
    user: { id: existingUser.id, email: existingUser.email },
    accessToken,
    refreshToken: refresh.token, // raw token to return to client
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

/**
 * Exchange refresh token for new access token (rotation: revoke previous token)
 * - token is raw string provided by client
 */
export async function rotateRefreshToken(rawToken: string) {
  const hash = sha256(rawToken);

  // Find corresponding DB entry
  const tokenRecord = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new Error("Invalid refresh token");
  }
  // Reuse detection: token was already revoked -> likely theft
  if (tokenRecord.revoked) {
    // Revoke all active refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId, revoked: false },
      data: { revoked: true },
    });
    // Bump tokenVersion to invalidate existing access tokens immediately
    // @ts-ignore - tokenVersion exists in DB; Prisma client types may be stale
    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { tokenVersion: { increment: 1 } },
    });
    throw new Error("Refresh token reuse detected");
  }
  if (tokenRecord.expiresAt < new Date()) {
    throw new Error("Refresh token expired");
  }

  // Revoke current token
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true, lastUsedAt: new Date() },
  });
  // Issue new refresh token (rotation)
  const newRefresh = await createRefreshToken(tokenRecord.userId);
  const accessToken = signAccessToken({
    userId: tokenRecord.userId,
    // @ts-ignore - tokenVersion exists in DB; Prisma client types may be stale
    tokenVersion: (tokenRecord.user as any).tokenVersion ?? 0,
  });

  return {
    accessToken,
    refreshToken: newRefresh.token,
    refreshTokenExpiresAt: newRefresh.expiresAt,
    user: { id: tokenRecord.user.id, email: tokenRecord.user.email },
  };
}

export async function revokeRefreshToken(rawToken: string) {
  const hash = sha256(rawToken);
  const tokenRecord = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash },
  });
  if (!tokenRecord) return false;
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true },
  });
  return true;
}
