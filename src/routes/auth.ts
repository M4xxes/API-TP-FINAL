import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { AuthRequest, authMiddleware } from "../middleware/auth";

export const router = Router();

const ACCESS_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes
const REFRESH_TOKEN_TTL_DAYS = 7;

function generateAccessToken(user: { id: number; email: string; role: string }) {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET not configured");
  }
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    secret,
    {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    }
  );
}

function generateRefreshToken() {
  // Simple random string; could be crypto.randomBytes in a real app
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
}

router.post("/login", async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: rawRefreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return res.json({
    accessToken,
    refreshToken: rawRefreshToken,
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return res.json(user);
});

router.post("/refresh", async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  const existing = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!existing || existing.revoked || existing.expiresAt < new Date()) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  // Token rotation: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revoked: true },
  });

  const newRaw = generateRefreshToken();
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: newRaw,
      userId: existing.userId,
      expiresAt: newExpiresAt,
    },
  });

  const accessToken = generateAccessToken(existing.user);

  return res.json({
    accessToken,
    refreshToken: newRaw,
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
});

router.post("/logout", async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revoked: true },
  });

  return res.status(204).send();
});


