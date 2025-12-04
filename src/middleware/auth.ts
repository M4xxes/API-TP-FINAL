import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    return res.status(500).json({ message: "Server misconfiguration" });
  }

  try {
    const payload = jwt.verify(token, secret) as {
      sub: number;
      email: string;
      role: string;
    };
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};


