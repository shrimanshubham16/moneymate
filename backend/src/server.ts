import express from "express";
import cors from "cors";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { authRoutes, requireAuth } from "./auth";
import { getMergedFinanceGroupUserIds } from "./mergedFinances";
import { applyConstraintDecay, computeHealthSnapshot, tierFor, totalIncomePerMonth, totalPaymentsMadeThisMonth, unpaidFixedPerMonth, unpaidProratedVariableForRemainingDays, unpaidInvestmentsPerMonth, unpaidCreditCardDues, getCreditCardOverpayments, calculateMonthProgress } from "./logic";
import { markAsPaid, markAsUnpaid, isPaid, getPaymentStatus, getUserPayments, getPaymentsSummary } from "./payments";
import { getUserPreferences, updateUserPreferences } from "./preferences";
// Import PostgreSQL database functions (direct connection)
import * as db from "./pg-db";
import * as store from "./store-supabase";
import { listAlerts, recordOverspend, clearAlerts } from "./alerts";

export const app = express();

// CORS configuration for production
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or allow all in development
    if (NODE_ENV === 'development' || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

authRoutes(app);

const dateQuerySchema = z.object({
  today: z.string().datetime().optional()
});

const incomeSchema = z.object({
  source: z.string(),
  amount: z.number().int().positive(),
  frequency: z.enum(["monthly", "quarterly", "yearly"]),
  start_date: z.string().optional(),
  end_date: z.string().optional()
});

const fixedSchema = z.object({
  name: z.string(),
  amount: z.number().int().positive(),
  frequency: z.enum(["monthly", "quarterly", "yearly"]),
  category: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_sip_flag: z.boolean().optional()
});

const variablePlanSchema = z.object({
  name: z.string(),
  planned: z.number().int().positive(),
  category: z.string(),
  start_date: z.string(),
  end_date: z.string().optional()
});

// v1.2: Updated schema with subcategory and payment mode
const variableActualSchema = z.object({
  amount: z.number().int().positive(),
  incurred_at: z.string(),
  justification: z.string().optional(),
  subcategory: z.string().optional(),
  payment_mode: z.enum(["UPI", "Cash", "ExtraCash", "CreditCard"]),
  credit_card_id: z.string().optional()
}).superRefine((data, ctx) => {
  // Validate that credit_card_id is required when payment_mode is CreditCard
  if (data.payment_mode === "CreditCard" && !data.credit_card_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Credit card ID is required when payment mode is CreditCard",
      path: ["credit_card_id"]
    });
  }
});

const investmentSchema = z.object({
  name: z.string(),
  goal: z.string(),
  monthlyAmount: z.number().int().positive(),
  status: z.enum(["active", "paused"])
});

const futureBombSchema = z.object({
  name: z.string(),
  dueDate: z.string(),
  totalAmount: z.number().int().positive(),
  savedAmount: z.number().int().nonnegative()
});

const inviteSchema = z.object({
  email_or_username: z.string(),
  role: z.enum(["editor", "viewer"]),
  merge_finances: z.boolean().optional()
});

// v1.2: Updated credit card schema with new fields
const creditCardSchema = z.object({
  name: z.string(),
  statementDate: z.string().optional(),
  dueDate: z.string(),
  billAmount: z.number().int().nonnegative().default(0),  // v1.2: Default to 0, can be set later
  paidAmount: z.number().int().nonnegative().optional(),
  currentExpenses: z.number().int().nonnegative().optional(),  // v1.2: New field
  billingDate: z.number().int().min(1).max(31).optional(),  // v1.2: New field (day of month)
  needsBillUpdate: z.boolean().optional()  // v1.2: New field
});

const paymentSchema = z.object({
  amount: z.number().int().positive()
});

// Detailed health breakdown endpoint
app.get("/health/details", requireAuth, async (req, res) => {
  const parsed = dateQuerySchema.safeParse(req.query);
  const today = parsed.data?.today ? new Date(parsed.data.today) : new Date();
  const userId = (req as any).user.userId;

  // Get user's preferences
  const preferences = await getUserPreferences(userId);
  const monthStartDay = preferences?.monthStartDay || 1;
  const useProrated = preferences?.useProrated ?? false;

  // Get components
  const [totalIncome, paymentsMade, creditCardOverpaymentsAmount, unpaidFixed, unpaidVariable, unpaidInvestments, unpaidCreditCards, health] = await Promise.all([
    totalIncomePerMonth(userId),
    Promise.resolve(totalPaymentsMadeThisMonth(userId, today)), // This is sync
    getCreditCardOverpayments(userId, today),
    unpaidFixedPerMonth(userId, today),
    unpaidProratedVariableForRemainingDays(userId, today, monthStartDay),
    unpaidInvestmentsPerMonth(userId, today),
    unpaidCreditCardDues(userId, today),
    computeHealthSnapshot(today, userId)
  ]);
  const availableFunds = totalIncome - paymentsMade - creditCardOverpaymentsAmount;
  const monthProgress = calculateMonthProgress(today, monthStartDay);

  const formula = useProrated
    ? "Available Funds - (Unpaid Fixed + Unpaid Prorated Variable for Remaining Days + Unpaid Investments + Unpaid Credit Cards)"
    : "Available Funds - (Unpaid Fixed + Planned Variable + Unpaid Investments + Unpaid Credit Cards)";

  const calculation = `${availableFunds} - (${unpaidFixed} + ${unpaidVariable} + ${unpaidInvestments} + ${unpaidCreditCards}) = ${health.remaining}`;

  res.json({
    data: {
      // FIX: Return health object with same structure as dashboard for consistency
      health: {
        remaining: health.remaining,
        category: health.category
      },
      breakdown: {
        totalIncome,
        paymentsMade,
        availableFunds,
        obligations: {
          unpaidFixed,
          unpaidVariable: unpaidVariable,
          unpaidProratedVariable: unpaidVariable, // Keep for backward compatibility
          unpaidInvestments,
          unpaidCreditCards
        },
        totalObligations: unpaidFixed + unpaidVariable + unpaidInvestments + unpaidCreditCards,
        monthProgress,
        monthStartDay,
        useProrated
      },
      formula,
      calculation
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/dashboard", requireAuth, async (req, res) => {
  const parsed = dateQuerySchema.safeParse(req.query);
  const today = parsed.data?.today ? new Date(parsed.data.today) : new Date();
  const userId = (req as any).user.userId;
  
  // FIX: Removed caching to ensure health scores are always fresh and consistent
  // Previous caching caused dashboard and /health/details to show different values
  
  const constraint = await db.getConstraintScore(userId);
  const constraintDecayed = applyConstraintDecay(constraint as any, today);
  await db.updateConstraintScore(userId, constraintDecayed);
  const groupUserIds = await getMergedFinanceGroupUserIds(userId);
  const health = await computeHealthSnapshot(today, userId);
  
  // Get payment status for current month
  const paymentStatus = getPaymentStatus(userId);

  // Fetch all data from Supabase
  const [userIncomes, userFixedExpenses, userVariablePlans, userInvestments, userFutureBombs, allVariableActuals] = await Promise.all([
    db.getIncomesByUserIds(groupUserIds),
    db.getFixedExpensesByUserIds(groupUserIds),
    db.getVariablePlansByUserIds(groupUserIds),
    db.getInvestmentsByUserIds(groupUserIds),
    db.getFutureBombsByUserIds(groupUserIds),
    db.getVariableActualsByUserIds(groupUserIds)
  ]);

  // Attach actuals and actualTotal to each variable plan
  const variablePlansWithActuals = userVariablePlans.map((plan) => {
    const actuals = allVariableActuals.filter((a) => a.planId === plan.id && groupUserIds.includes(a.userId));
    const actualTotal = actuals.reduce((sum, a) => sum + a.amount, 0);
    return { ...plan, actuals, actualTotal };
  });

  const payload = {
    incomes: userIncomes,
    fixedExpenses: userFixedExpenses.map((e) => ({
      ...e,
      is_sip_flag: e.isSip,
      paid: paymentStatus[`fixed_expense:${e.id}`] || false
    })),
    variablePlans: variablePlansWithActuals,
    investments: userInvestments.map((i) => ({
      ...i,
      paid: paymentStatus[`investment:${i.id}`] || false
    })),
    futureBombs: userFutureBombs,
    health,
    constraintScore: constraintDecayed,
    alerts: listAlerts(userId)
  };
  
  // FIX: Caching removed - always return fresh data
  res.json({ data: payload });
});

app.get("/planning/income", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userIncomes = await db.getIncomesByUserId(userId);
  res.json({ data: userIncomes });
});

app.post("/planning/income", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = incomeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await db.addIncome({ userId, name: parsed.data.source, amount: parsed.data.amount, frequency: parsed.data.frequency, category: "employment", startDate: new Date().toISOString() });
  // FIX: Use userId instead of user.id for activity logging
  await db.addActivity({ actorId: userId, entity: "income", action: "added income source", payload: { name: created.name, amount: created.amount, frequency: created.frequency } });
  res.status(201).json({ data: created });
});

app.put("/planning/income/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = incomeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updateData: any = {};
  if (parsed.data.source !== undefined) updateData.name = parsed.data.source;
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
  if (parsed.data.frequency !== undefined) updateData.frequency = parsed.data.frequency;
  updateData.userId = userId; // Needed for fetching updated record
  const updated = await db.updateIncome(req.params.id, updateData);
  if (!updated) return res.status(404).json({ error: { message: "Not found" } });
  res.json({ data: updated });
});

app.delete("/planning/income/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const ok = await db.deleteIncome(req.params.id);
  if (!ok) return res.status(404).json({ error: { message: "Not found" } });
  res.status(200).json({ data: { deleted: true } });
});

app.get("/planning/fixed-expenses", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userExpenses = await db.getFixedExpensesByUserId(userId);
  res.json({ data: userExpenses.map((e) => ({ ...e, is_sip_flag: e.isSip })) });
});

app.post("/planning/fixed-expenses", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = fixedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await db.addFixedExpense({
    userId,
    name: parsed.data.name,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    category: parsed.data.category,
    isSip: parsed.data.is_sip_flag
  });
  // FIX: Add activity logging for fixed expense creation
  await db.addActivity({ actorId: userId, entity: "fixed_expense", action: "added fixed expense", payload: { 
    name: created.name, 
    amount: created.amount, 
    frequency: created.frequency, 
    category: created.category 
  } });
  // Return with snake_case field name for API consistency
  res.status(201).json({ data: { ...created, is_sip_flag: created.isSip } });
});

app.put("/planning/fixed-expenses/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = fixedSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updateData: any = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
  if (parsed.data.frequency !== undefined) updateData.frequency = parsed.data.frequency;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.is_sip_flag !== undefined) updateData.isSip = parsed.data.is_sip_flag;
  updateData.userId = userId; // Needed for fetching updated record
  const updated = await store.updateFixedExpense(req.params.id, updateData);
  if (!updated) return res.status(404).json({ error: { message: "Not found" } });
  // Return with snake_case field name for API consistency
  res.json({ data: { ...updated, is_sip_flag: updated.isSip } });
});

app.delete("/planning/fixed-expenses/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const ok = await store.deleteFixedExpense(userId, req.params.id);
  if (!ok) return res.status(404).json({ error: { message: "Not found" } });
  res.status(200).json({ data: { deleted: true } });
});

app.get("/planning/variable-expenses", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userPlans = await db.getVariablePlansByUserId(userId);
  const allActuals = await db.getVariableActualsByUserId(userId);
  const plans = userPlans.map((p) => {
    const actual = allActuals.filter((a) => a.planId === p.id && a.userId === userId);
    const actualTotal = actual.reduce((s, a) => s + a.amount, 0);
    return { ...p, actualTotal, actuals: actual };
  });
  res.json({ data: plans });
});

app.post("/planning/variable-expenses", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = variablePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await store.addVariablePlan(userId, {
    name: parsed.data.name,
    planned: parsed.data.planned,
    category: parsed.data.category,
    startDate: parsed.data.start_date,
    endDate: parsed.data.end_date
  });
  // FIX: Add activity logging for variable expense plan creation
  await store.addActivity(userId, "variable_expense_plan", "added variable expense plan", { 
    name: created.name, 
    planned: created.planned, 
    category: created.category 
  });
  res.status(201).json({ data: created });
});

app.put("/planning/variable-expenses/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = variablePlanSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updateData: any = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.planned !== undefined) updateData.planned = parsed.data.planned;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.start_date !== undefined) updateData.startDate = parsed.data.start_date;
  if (parsed.data.end_date !== undefined) updateData.endDate = parsed.data.end_date;
  updateData.userId = userId; // Needed for fetching updated record
  const updated = await store.updateVariablePlan(req.params.id, updateData);
  if (!updated) return res.status(404).json({ error: { message: "Not found" } });
  res.json({ data: updated });
});

app.delete("/planning/variable-expenses/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const ok = await store.deleteVariablePlan(userId, req.params.id);
  if (!ok) return res.status(404).json({ error: { message: "Not found" } });
  res.status(200).json({ data: { deleted: true } });
});

app.post("/planning/variable-expenses/:id/actuals", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = variableActualSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const plan = await db.getVariablePlansByUserId(userId).then(plans => plans.find(p => p.id === req.params.id));
  if (!plan) return res.status(404).json({ error: { message: "Plan not found" } });
  // Overspend check: if constraint is red and over plan, justification required
  const allActuals = await db.getVariableActualsByPlanId(plan.id);
  const actualTotal = allActuals.filter((a: any) => a.userId === userId).reduce((s: number, a: any) => s + a.amount, 0);
  const projected = actualTotal + parsed.data.amount;
  const constraint = await store.getConstraint(userId);
  if (constraint.tier === "red" && projected > plan.planned && !parsed.data.justification) {
    return res.status(400).json({ error: { message: "Justification required for overspend in red tier" } });
  }
  // v1.2: Include new fields (subcategory, paymentMode, creditCardId)
  const created = await store.addVariableActual(userId, {
    planId: plan.id,
    amount: parsed.data.amount,
    incurredAt: parsed.data.incurred_at,
    justification: parsed.data.justification,
    subcategory: parsed.data.subcategory,
    paymentMode: parsed.data.payment_mode,
    creditCardId: parsed.data.credit_card_id
  });
  // Log activity
  const user = (req as any).user;
  await store.addActivity(user.userId, "variable_expense", "added actual expense", {
    plan: plan.name,
    amount: parsed.data.amount,
    category: plan.category,
    justification: parsed.data.justification
  });
  // Update constraint score if overspend
  if (projected > plan.planned) {
    recordOverspend(userId, plan.name, projected, plan.planned, "2025-01");
  }
  res.status(201).json({ data: created });
});

app.get("/investments", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userInvestments = await db.getInvestmentsByUserId(userId);
  res.json({ data: userInvestments });
});

app.post("/investments", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = investmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await store.addInvestment(userId, parsed.data);
  // FIX: Add activity logging for investment creation with correct amount field
  await store.addActivity(userId, "investment", "added investment", { 
    name: created.name, 
    amount: created.monthlyAmount,  // FIX: Use monthlyAmount not amount
    goal: created.goal,
    status: created.status
  });
  res.status(201).json({ data: created });
});

app.put("/investments/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = investmentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updateData: any = { ...parsed.data, userId }; // Needed for fetching updated record
  const updated = await store.updateInvestment(req.params.id, updateData);
  if (!updated) return res.status(404).json({ error: { message: "Not found" } });
  res.json({ data: updated });
});

// ADD: Investment DELETE endpoint
app.delete("/investments/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  try {
    await db.deleteInvestment(req.params.id);
    res.json({ data: { deleted: true } });
  } catch {
    return res.status(404).json({ error: { message: "Not found" } });
  }
});

app.get("/future-bombs", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userFutureBombs = await db.getFutureBombsByUserId(userId);
  res.json({ data: userFutureBombs });
});

app.post("/future-bombs", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = futureBombSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await store.addFutureBomb(userId, parsed.data);
  res.status(201).json({ data: created });
});

app.put("/future-bombs/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = futureBombSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updateData: any = { ...parsed.data, userId }; // Needed for fetching updated record
  const updated = await store.updateFutureBomb(req.params.id, updateData);
  if (!updated) return res.status(404).json({ error: { message: "Not found" } });
  res.json({ data: updated });
});

app.get("/sharing/requests", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { incoming, outgoing } = await store.listRequestsForUser(user.id, user.username);
  res.json({ data: { incoming, outgoing } });
});

app.post("/sharing/invite", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // Look up by username (email removed from system)
  const invitee = await db.getUserByUsername(parsed.data.email_or_username);
  if (!invitee) return res.status(404).json({ error: { message: "User not found" } });
  // Use username instead of email for sharing
  const reqCreated = await store.createSharingRequest(user.id, invitee.username, parsed.data.role, !!parsed.data.merge_finances);
  res.status(201).json({ data: reqCreated });
});

app.post("/sharing/requests/:id/approve", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const result = await store.approveRequest(req.params.id, user.username);
  if (!result) return res.status(404).json({ error: { message: "Not found or not authorized" } });
  res.json({ data: result });
});

app.post("/sharing/requests/:id/reject", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const ok = await store.rejectRequest(req.params.id);
  if (!ok) return res.status(404).json({ error: { message: "Request not found" } });
  res.json({ data: { rejected: true } });
});

app.get("/sharing/members", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const members = await store.listMembers(user.id);
  const accounts = await store.listSharedAccountsFor(user.id);
  res.json({ data: { members, accounts } });
});

app.delete("/sharing/members/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const ok = await store.removeMember(req.params.id, user.id);
  if (!ok) return res.status(403).json({ error: { message: "Not authorized or not found" } });
  res.status(204).end();
});

// v1.2: Get billing alerts (must come before /:id routes)
app.get("/debts/credit-cards/billing-alerts", requireAuth, async (req, res) => {
  const today = new Date();
  const alerts = await store.checkAndAlertBillingDates(today);
  res.json({ data: alerts });
});

app.get("/debts/credit-cards", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userCards = await db.getCreditCardsByUserId(userId);
  res.json({ data: userCards });
});

app.post("/debts/credit-cards", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = creditCardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { paidAmount, ...cardData } = parsed.data;
  const created = await store.addCreditCard(userId, {
    ...cardData,
    statementDate: cardData.statementDate || new Date().toISOString().split('T')[0],
    billAmount: cardData.billAmount ?? 0  // v1.2: Default to 0 if not provided
  });
  // v1.2: If paidAmount provided, update it
  if (paidAmount !== undefined && paidAmount > 0) {
    await store.payCreditCard(created.id, paidAmount);
  }
  await store.addActivity((req as any).user.id, "credit_card", "created", { id: created.id });
  res.status(201).json({ data: created });
});

// v1.2: Get credit card usage (must come before /:id routes to avoid route conflicts)
app.get("/debts/credit-cards/:id/usage", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const cardId = req.params.id;
    const cards = await db.getCreditCardsByUserId(userId);
    const card = cards.find(c => c.id === cardId);
    if (!card) {
      return res.status(404).json({ error: { message: "Credit card not found" } });
    }
    
    // Get all variable expense actuals for this credit card
    const allActuals = await db.getVariableActualsByUserId(userId);
    const usage = allActuals.filter(
      a => a.paymentMode === "CreditCard" && a.creditCardId === card.id
    );
    
    res.json({ data: usage });
  } catch (error: any) {
    console.error("Error fetching credit card usage:", error);
    res.status(500).json({ error: { message: error.message || "Internal server error" } });
  }
});

app.post("/debts/credit-cards/:id/payments", requireAuth, async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await store.payCreditCard(req.params.id, parsed.data.amount);
  if (!updated) return res.status(404).json({ error: { message: "Not found" } });
  await store.addActivity((req as any).user.id, "credit_card", "payment", { id: updated.id, amount: parsed.data.amount });
  res.json({ data: updated });
});

// v1.2: Reset credit card current expenses (prepare for billing)
app.post("/debts/credit-cards/:id/reset-billing", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const updated = await store.resetCreditCardCurrentExpenses(req.params.id, userId);
  if (!updated) return res.status(404).json({ error: { message: "Not found" } });
  await store.addActivity((req as any).user.id, "credit_card", "reset_billing", { id: updated.id });
  res.json({ data: updated });
});

app.delete("/debts/credit-cards/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const deleted = await store.deleteCreditCard(userId, req.params.id);
  if (!deleted) return res.status(404).json({ error: { message: "Not found" } });
  await store.addActivity((req as any).user.id, "credit_card", "deleted", { id: req.params.id });
  res.json({ data: { deleted: true } });
});

// v1.2: Update credit card bill amount
app.patch("/debts/credit-cards/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const cardId = req.params.id;
    
    // Accept any nonnegative number (int or float)
    const parsed = z.object({ billAmount: z.number().nonnegative() }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    const cards = await db.getCreditCardsByUserId(userId);
    const card = cards.find(c => c.id === cardId);
    if (!card) {
      return res.status(404).json({ error: { message: "Credit card not found" } });
    }
    
    const billAmount = Math.round(parsed.data.billAmount * 100) / 100; // Round to 2 decimal places
    await db.updateCreditCard(cardId, { billAmount, needsBillUpdate: false });
    
    await store.addActivity((req as any).user.id, "credit_card", "updated_bill", { id: card.id, billAmount });
    const updatedCards = await db.getCreditCardsByUserId(userId);
    const updatedCard = updatedCards.find(c => c.id === cardId);
    res.json({ data: updatedCard });
  } catch (error: any) {
    console.error("Error updating credit card bill:", error);
    res.status(500).json({ error: { message: error.message || "Internal server error" } });
  }
});

// v1.2: Get user subcategories
app.get("/user/subcategories", requireAuth, (req, res) => {
  const userId = (req as any).user.userId;
  res.json({ data: store.getUserSubcategories(userId) });
});

// v1.2: Add new subcategory
app.post("/user/subcategories", requireAuth, (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = z.object({ subcategory: z.string().min(1).max(50) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  store.addUserSubcategory(userId, parsed.data.subcategory);
  res.json({ data: { subcategory: parsed.data.subcategory, subcategories: store.getUserSubcategories(userId) } });
});

app.get("/debts/loans", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const loans = await store.listLoans(user.userId);
  res.json({ data: loans });
});

app.get("/activity", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const all = await store.listActivities(userId);

  // Get usernames for activities
  const userActivities = await Promise.all(all.map(async (activity) => {
    const actor = await db.getUserById(activity.actorId);
    return {
      ...activity,
      username: actor?.username || 'Unknown User'
    };
  }));

  res.json({ data: userActivities });
});

app.get("/alerts", requireAuth, (req, res) => {
  const userId = (req as any).user.userId;
  res.json({ data: listAlerts(userId) });
});

// Export finances as JSON
app.get("/export/finances", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const parsed = dateQuerySchema.safeParse(req.query);
  const today = parsed.data?.today ? new Date(parsed.data.today) : new Date();

  const userId = (req as any).user?.userId;
  const [constraint, health, userIncomes, userFixedExpenses, userVariablePlans, userVariableActuals, userInvestments, userFutureBombs, userCreditCards, userLoans, userActivities] = await Promise.all([
    store.getConstraint(userId),
    computeHealthSnapshot(today, userId),
    db.getIncomesByUserId(userId),
    db.getFixedExpensesByUserId(userId),
    db.getVariablePlansByUserId(userId),
    db.getVariableActualsByUserId(userId),
    db.getInvestmentsByUserId(userId),
    db.getFutureBombsByUserId(userId),
    db.getCreditCardsByUserId(userId),
    db.getLoansByUserId(userId),
    db.getActivitiesByUserId(userId, 50) // Last 50 activities
  ]);
  const constraintDecayed = applyConstraintDecay(constraint as any, today);

  const exportData = {
    exportDate: new Date().toISOString(),
    user: { id: user.userId, username: user.username },
    health,
    constraintScore: constraintDecayed,
    incomes: userIncomes,
    fixedExpenses: userFixedExpenses.map(e => ({
      ...e,
      monthlyEquivalent: e.frequency === "monthly" ? e.amount :
        e.frequency === "quarterly" ? e.amount / 3 :
          e.amount / 12
    })),
    variableExpenses: userVariablePlans.map(plan => ({
      ...plan,
      actuals: userVariableActuals.filter(a => a.planId === plan.id),
      actualTotal: userVariableActuals.filter(a => a.planId === plan.id).reduce((sum, a) => sum + a.amount, 0)
    })),
    investments: userInvestments,
    futureBombs: userFutureBombs,
    creditCards: userCreditCards,
    loans: userLoans,
    activities: userActivities,
    alerts: listAlerts(userId),
    summary: {
      totalIncome: userIncomes.reduce((sum, i) => sum + ((i.amount ?? 0) / (i.frequency === "monthly" ? 1 : i.frequency === "quarterly" ? 3 : 12)), 0),
      totalFixedExpenses: userFixedExpenses.reduce((sum, e) => {
        const monthly = e.frequency === "monthly" ? e.amount : e.frequency === "quarterly" ? e.amount / 3 : e.amount / 12;
        return sum + monthly;
      }, 0),
      totalVariableActual: userVariablePlans.reduce((sum, plan) => {
        const actuals = userVariableActuals.filter(a => a.planId === plan.id);
        return sum + actuals.reduce((s, a) => s + a.amount, 0);
      }, 0),
      totalInvestments: userInvestments.reduce((sum, i) => sum + i.monthlyAmount, 0),
      healthCategory: health.category,
      remainingBalance: health.remaining
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename = "finflow-export-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(exportData);
});

const themeStateSchema = z.object({
  mode: z.enum(["health_auto", "manual"]).optional(),
  selected_theme: z.enum(["thunderstorms", "reddish_dark_knight", "green_zone"]).optional(),
  constraint_tier_effect: z.boolean().optional()
});

app.get("/themes/state", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [theme, constraint, health] = await Promise.all([
    store.getThemeState(user.id),
    store.getConstraint(user.id),
    computeHealthSnapshot(new Date(), user.userId)
  ]);
  res.json({
    data: {
      mode: theme.mode,
      selected_theme: theme.selectedTheme,
      constraint_tier_effect: theme.constraintTierEffect,
      current_health_category: health.category,
      current_constraint_tier: constraint.tier
    }
  });
});

app.patch("/themes/state", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const parsed = themeStateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [updated, constraint, health] = await Promise.all([
    store.updateThemeState(user.id, {
      mode: parsed.data.mode,
      selectedTheme: parsed.data.selected_theme,
      constraintTierEffect: parsed.data.constraint_tier_effect
    }),
    store.getConstraint(user.userId),
    computeHealthSnapshot(new Date(), user.userId)
  ]);
  res.json({
    data: {
      mode: updated.mode,
      selected_theme: updated.selectedTheme,
      constraint_tier_effect: updated.constraintTierEffect,
      current_health_category: health.category,
      current_constraint_tier: constraint.tier
    }
  });
});

// Payment tracking endpoints
app.post("/payments/mark-paid", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const schema = z.object({
    itemId: z.string(),
    itemType: z.enum(['fixed_expense', 'investment', 'loan']),
    amount: z.number().int().positive()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const payment = markAsPaid(user.userId, parsed.data.itemId, parsed.data.itemType, parsed.data.amount);
  await store.addActivity(user.userId, parsed.data.itemType, "paid", { id: parsed.data.itemId, amount: parsed.data.amount });
  res.json({ data: payment });
});

app.post("/payments/mark-unpaid", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const schema = z.object({
    itemId: z.string(),
    itemType: z.enum(['fixed_expense', 'investment', 'loan'])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const success = markAsUnpaid(user.userId, parsed.data.itemId, parsed.data.itemType);
  if (success) {
    await store.addActivity(user.userId, parsed.data.itemType, "unpaid", { id: parsed.data.itemId });
  }
  res.json({ data: { success } });
});

app.get("/payments/status", requireAuth, (req, res) => {
  const user = (req as any).user;
  const month = req.query.month as string | undefined;
  const status = getPaymentStatus(user.userId, month);
  res.json({ data: status });
});

app.get("/payments/summary", requireAuth, (req, res) => {
  const user = (req as any).user;
  const month = req.query.month as string | undefined;
  const summary = getPaymentsSummary(user.userId, month);
  res.json({ data: summary });
});

// User preferences endpoints
app.get("/preferences", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const prefs = await getUserPreferences(user.userId);
  res.json({ data: prefs });
});

app.patch("/preferences", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const schema = z.object({
    monthStartDay: z.number().int().min(1).max(28).optional(),
    currency: z.string().optional(),
    timezone: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await updateUserPreferences(user.userId, parsed.data);
  res.json({ data: updated });
});

// Dev-only seed endpoint (disabled for Supabase)
app.post("/admin/seed", (req, res) => {
  res.status(501).json({ error: { message: "Seed endpoint disabled - data is now in Supabase" } });
});

// TEMPORARY: Admin endpoint to export full store data for migration
// TODO: Remove this after migration to Supabase is complete
app.get("/admin/export-full-store", requireAuth, async (req, res) => {
  // For migration: Allow any authenticated user to export
  // This is temporary and will be removed after migration
  // Note: This endpoint is deprecated - data is now in Supabase
  res.status(501).json({ error: { message: "Export endpoint disabled - data is now in Supabase. Use Supabase dashboard to export data." } });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Dashboard cache removed - Supabase handles caching

if (require.main === module) {
  const PORT = process.env.PORT || 12022;
  const server = app.listen(PORT, () => {
    console.log(`🚀 FinFlow backend listening on port ${PORT} `);
    console.log(`📊 Environment: ${NODE_ENV} `);
    console.log(`🔒 CORS origins: ${ALLOWED_ORIGINS.join(', ')} `);
  });

  // Graceful shutdown (no need to save - Supabase handles persistence)
  const handleShutdown = () => {
    console.log('🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

