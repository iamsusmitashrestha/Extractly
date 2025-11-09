import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { addDays } from "../utils/date";
import { prisma } from "../config/database";

const ACCESS_TOKEN_EXPIRY_MINUTES: number = process.env
  .ACCESS_TOKEN_EXPIRY_MINUTES
  ? parseInt(process.env.ACCESS_TOKEN_EXPIRY_MINUTES, 10)
  : 15; // Default to 15 minutes if not set
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_EXPIRY_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7
);

// create access token (JWT)
export interface AccessTokenPayload {
  userId: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET must be defined");
  }

  const options: SignOptions = {
    expiresIn: `${ACCESS_TOKEN_EXPIRY_MINUTES}m`,
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, options);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

// Create an opaque refresh token (random) and store hashed version in DB
export async function createRefreshToken(userId: string) {
  // random token returned to client
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = addDays(new Date(), REFRESH_TOKEN_EXPIRY_DAYS);

  const refresh = await prisma.refreshToken.create({
    data: {
      tokenHash,
      expiresAt,
      userId,
      revoked: false,
    },
  });

  return {
    token,
    expiresAt,
    id: refresh.id,
  };
}

export function sha256(val: string) {
  return crypto.createHash("sha256").update(val).digest("hex");
}
