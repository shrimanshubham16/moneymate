import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getStore } from "./store";
import { createUser, getUserByUsername } from "./store";
import crypto from "crypto";

export type AuthToken = { userId: string; username: string };

// In-memory token map for demo purposes only
const tokens = new Map<string, AuthToken>();

// Failed login tracking: username -> { attempts: number, lockedUntil: Date | null }
const failedLogins = new Map<string, { attempts: number; lockedUntil: Date | null }>();

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export function clearTokens() {
  tokens.clear();
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)");
  }

  return { valid: errors.length === 0, errors };
}

export function isAccountLocked(username: string): { locked: boolean; remainingTime?: number } {
  const record = failedLogins.get(username);
  if (!record || !record.lockedUntil) {
    return { locked: false };
  }

  const now = new Date();
  if (now < record.lockedUntil) {
    const remainingMs = record.lockedUntil.getTime() - now.getTime();
    return { locked: true, remainingTime: Math.ceil(remainingMs / 1000) };
  }

  // Lock expired, reset attempts
  failedLogins.delete(username);
  return { locked: false };
}

export function recordFailedLogin(username: string): { locked: boolean; remainingAttempts?: number; lockoutTime?: number } {
  const record = failedLogins.get(username) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    failedLogins.set(username, record);
    return { locked: true, lockoutTime: LOCKOUT_DURATION_MS / 1000 };
  }

  failedLogins.set(username, record);
  return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - record.attempts };
}

export function recordSuccessfulLogin(username: string): void {
  failedLogins.delete(username);
}

const signupSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8)
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

export function authRoutes(app: any) {
  app.post("/auth/signup", (req: Request, res: Response) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { username, password } = parsed.data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: { message: "Weak password", details: passwordValidation.errors } });
    }

    try {
      const passwordHash = hashPassword(password);
      const user = createUser(username, passwordHash);
      const token = issueToken(user.id, user.username);
      res.status(201).json({ access_token: token, user: { id: user.id, username: user.username } });
    } catch (e: any) {
      res.status(409).json({ error: { message: e.message } });
    }
  });

  app.post("/auth/login", (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { username, password } = parsed.data;

    // Check if account is locked
    const lockStatus = isAccountLocked(username);
    if (lockStatus.locked) {
      return res.status(423).json({
        error: {
          message: "Account temporarily locked due to too many failed login attempts",
          remainingTime: lockStatus.remainingTime
        }
      });
    }

    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      const failureResult = recordFailedLogin(username);
      if (failureResult.locked) {
        return res.status(423).json({
          error: {
            message: "Account locked due to too many failed login attempts. Please try again in 10 minutes.",
            lockoutTime: failureResult.lockoutTime
          }
        });
      }
      return res.status(401).json({
        error: {
          message: "Invalid credentials",
          remainingAttempts: failureResult.remainingAttempts
        }
      });
    }

    recordSuccessfulLogin(username);
    const token = issueToken(user.id, user.username);
    res.json({ access_token: token, user: { id: user.id, username: user.username } });
  });

  app.get("/auth/me", requireAuth, (req: Request, res: Response) => {
    res.json({ user: (req as any).user });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: { message: "Unauthorized" } });
  const token = header.slice("Bearer ".length);
  const record = tokens.get(token);
  if (!record) return res.status(401).json({ error: { message: "Unauthorized" } });
  const store = getStore();
  const user = store.users.find((u) => u.id === record.userId);
  if (!user) return res.status(401).json({ error: { message: "Unauthorized" } });
  // CRITICAL: Set both id and userId for compatibility
  (req as any).user = { id: user.id, userId: user.id, username: user.username };
  next();
}

function issueToken(userId: string, username: string): string {
  const token = randomUUID();
  tokens.set(token, { userId, username });
  return token;
}

