import bcrypt from "bcrypt";
import { prisma } from "../config/database";

import { signAccessToken, createRefreshToken, sha256 } from "./jwtService";
const SALT_ROUNDS = 10;

export async function registerUser(
  email: string,
  password: string,
  name?: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already in use");
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("Incorrect password");

  const accessToken = signAccessToken({ userId: user.id });
  const refresh = await createRefreshToken(user.id);

  return {
    user: { id: user.id, email: user.email },
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

  if (!tokenRecord || tokenRecord.revoked) {
    throw new Error("Invalid refresh token");
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
  const accessToken = signAccessToken({ userId: tokenRecord.userId });

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
