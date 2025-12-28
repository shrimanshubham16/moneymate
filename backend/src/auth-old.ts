import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getStore } from "./store";
import { User } from "./mockData";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type AuthToken = { userId: string };

// In-memory token map for demo purposes only
const tokens = new Map<string, AuthToken>();

export function authRoutes(app: any) {
  app.post("/auth/signup", (req: Request, res: Response) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const store = getStore();
    const exists = store.users.find((u) => u.email === parsed.data.email);
    if (exists) return res.status(409).json({ error: { message: "Email already exists" } });
    const user: User = { id: randomUUID(), email: parsed.data.email, username: parsed.data.username };
    store.users.push(user);
    const token = issueToken(user.id);
    res.json({ access_token: token, user });
  });

  app.post("/auth/login", (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const store = getStore();
    const user = store.users.find((u) => u.email === parsed.data.email);
    if (!user) return res.status(401).json({ error: { message: "Invalid credentials" } });
    // Note: In real app, verify password hash here
    const token = issueToken(user.id);
    res.json({ access_token: token, user });
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
  (req as any).user = user;
  next();
}

function issueToken(userId: string): string {
  const token = randomUUID();
  tokens.set(token, { userId });
  return token;
}

