import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/database";
import { signAccessToken, createRefreshToken } from "../services/jwtService";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const OAUTH_GOOGLE_REDIRECT_URI = process.env.OAUTH_GOOGLE_REDIRECT_URI!; // e.g., http://localhost:3000/auth/oauth/google/callback
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function getClient() {
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: OAUTH_GOOGLE_REDIRECT_URI,
  });
}

class OAuthController {
  googleStart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = getClient();
      const url = client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["openid", "email", "profile"],
      });
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  };

  googleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const code = req.query.code as string | undefined;
      if (!code) return res.status(400).json({ error: "Missing code" });

      const client = getClient();
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) {
        return res.status(400).json({ error: "Missing id_token from Google" });
      }

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload)
        return res.status(401).json({ error: "Invalid Google token" });

      const provider = "google";
      const providerUserId = payload.sub!;
      const email = payload.email!;
      const name = payload.name || email.split("@")[0];

      let user = null as any;

      // Check if OAuthAccount exists
      const account = await prisma.oAuthAccount.findUnique({
        where: { provider_providerUserId: { provider, providerUserId } },
        include: { user: true },
      });

      if (account) {
        user = account.user;
      } else {
        // Link to existing user by email or create new
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          user = existingUser;
        } else {
          user = await prisma.user.create({
            data: {
              email,
              name,
            },
          });
        }
        await prisma.oAuthAccount.create({
          data: {
            provider,
            providerUserId,
            email,
            name,
            userId: user.id,
          },
        });
      }

      const accessToken = signAccessToken({
        userId: user.id,
        tokenVersion: (user as any).tokenVersion ?? 0,
      });
      const refresh = await createRefreshToken(user.id);

      const secure =
        process.env.COOKIE_SECURE === "true" ||
        process.env.NODE_ENV === "production";
      res.cookie("refreshToken", refresh.token, {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : ("lax" as const),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const redirectUrl = `${FRONTEND_URL}/oauth/callback?accessToken=${encodeURIComponent(
        accessToken
      )}`;
      return res.redirect(redirectUrl);
    } catch (err) {
      return next(err as any);
    }
  };
}

export const oauthController = new OAuthController();
