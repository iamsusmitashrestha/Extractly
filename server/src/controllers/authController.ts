import { ValidationError } from "../errrors/AppError";
import {
  loginSchema,
  registerSchema,
} from "../middleware/validationMiddleware";
import { loginUser, registerUser } from "../services/authService";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        return next(new ValidationError("Validation failed", fieldErrors));
      }

      const user = await registerUser(parsed.data);
      return res.status(201).json({
        message: "Registration successful",
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        return next(new ValidationError("Validation failed", fieldErrors));
      }

      const result = await loginUser(parsed.data);

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        accessToken: result.accessToken,
        user: result.user,
        message: "Login successful",
      });
    } catch (err) {
      next(err);
    }
  }

  // async refresh(req: Request, res: Response) {
  //   try {
  //     const refreshToken = req.cookies.refreshToken;
  //     if (!refreshToken) {
  //       return res.status(401).json({ message: "Refresh token required" });
  //     }

  //     const tokens = await refreshToken(refreshToken);

  //     res.cookie("refreshToken", tokens.refreshToken, {
  //       httpOnly: true,
  //       secure: process.env.NODE_ENV === "production",
  //       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  //     });

  //     res.json({
  //       accessToken: tokens.accessToken,
  //       message: "Token refresh successful",
  //     });
  //   } catch (error: any) {
  //     res.status(401).json({ message: error.message });
  //   }
  // }

  async logout(req: Request, res: Response) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ message: "Logout successful" });
  }
}

export const authController = new AuthController();
