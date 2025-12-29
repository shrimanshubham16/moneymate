import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "./server";
import { resetStore, getStore, loadFixtureStore } from "./store";

describe("FinFlow backend APIs (M1)", () => {
  const today = "2025-01-15T00:00:00.000Z";
  let token: string;

  beforeEach(async () => {
    resetStore();
    const signup = await request(app).post("/auth/signup").send({ email: "user@example.com", password: "password", username: "user" });
    token = signup.body.access_token;
  });

  it("returns health status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("serves dashboard data with deterministic health", async () => {
    const res = await request(app).get("/dashboard").query({ today }).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.health.category).toBe("good");
    expect(typeof res.body.data.health.remaining).toBe("number");
    expect(res.body.data.constraintScore).toBeTruthy();
  });

  it("seeds fixtures via admin endpoint and reflects in dashboard", async () => {
    const seedRes = await request(app).post("/admin/seed");
    expect(seedRes.status).toBe(200);
    expect(seedRes.body.data.fixedExpenses).toBeGreaterThan(5);
    const res = await request(app).get("/dashboard").query({ today }).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.fixedExpenses.length).toBeGreaterThan(5);
  });

  it("creates and lists income", async () => {
    const create = await request(app)
      .post("/planning/income")
      .set("Authorization", `Bearer ${token}`)
      .send({ source: "Bonus", amount: 10000, frequency: "monthly" });
    expect(create.status).toBe(201);
    const list = await request(app).get("/planning/income").set("Authorization", `Bearer ${token}`);
    expect(list.body.data.some((i: any) => i.source === "Bonus")).toBe(true);
  });

  it("creates variable plan and actual; enforces justification on red tier overspend", async () => {
    const planRes = await request(app)
      .post("/planning/variable-expenses")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dining", planned: 2000, category: "Food", start_date: "2025-01-01" });
    expect(planRes.status).toBe(201);
    const planId = planRes.body.data.id;

    // push constraint to red
    const constraint = getStore().constraint;
    constraint.score = 75;
    constraint.tier = "red";

    const noJustification = await request(app)
      .post(`/planning/variable-expenses/${planId}/actuals`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 2500, incurred_at: "2025-01-20T00:00:00Z" });
    expect(noJustification.status).toBe(400);

    const withJustification = await request(app)
      .post(`/planning/variable-expenses/${planId}/actuals`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 2500, incurred_at: "2025-01-20T00:00:00Z", justification: "Anniversary dinner" });
    expect(withJustification.status).toBe(201);
  });

  it("handles investments CRUD", async () => {
    const create = await request(app)
      .post("/investments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New SIP", goal: "Wealth", monthlyAmount: 3000, status: "active" });
    expect(create.status).toBe(201);
    const list = await request(app).get("/investments").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((i: any) => i.name === "New SIP")).toBe(true);
  });

  it("computes future bomb preparedness and monthly equivalent", async () => {
    const create = await request(app)
      .post("/future-bombs")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Trip", dueDate: "2025-06-01", totalAmount: 60000, savedAmount: 12000 });
    expect(create.status).toBe(201);
    const list = await request(app).get("/future-bombs").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    const trip = list.body.data.find((f: any) => f.name === "Trip");
    expect(trip.preparednessRatio).toBeCloseTo(0.2, 1);
    expect(trip.monthlyEquivalent).toBeGreaterThan(0);
  });

  it("supports sharing invites and approvals", async () => {
    // create inviter
    const inviter = await request(app).post("/auth/signup").send({ email: "owner@example.com", password: "password", username: "owner" });
    const inviterToken = inviter.body.access_token;
    // invitee signup
    const invitee = await request(app).post("/auth/signup").send({ email: "viewer@example.com", password: "password", username: "viewer" });
    const inviteeToken = invitee.body.access_token;

    const inviteRes = await request(app)
      .post("/sharing/invite")
      .set("Authorization", `Bearer ${inviterToken}`)
      .send({ email_or_username: "viewer@example.com", role: "viewer", merge_finances: true });
    expect(inviteRes.status).toBe(201);
    const reqId = inviteRes.body.data.id;

    const incoming = await request(app).get("/sharing/requests").set("Authorization", `Bearer ${inviteeToken}`);
    expect(incoming.body.data.incoming.length).toBe(1);

    const approve = await request(app).post(`/sharing/requests/${reqId}/approve`).set("Authorization", `Bearer ${inviteeToken}`);
    expect(approve.status).toBe(200);

    const membersInvitee = await request(app).get("/sharing/members").set("Authorization", `Bearer ${inviteeToken}`);
    expect(membersInvitee.body.data.members.length).toBe(1);

    const membersInviter = await request(app).get("/sharing/members").set("Authorization", `Bearer ${inviterToken}`);
    expect(membersInviter.body.data.members.length).toBeGreaterThan(0);
  });

  it("supports credit card creation and payment with activity log", async () => {
    const create = await request(app)
      .post("/debts/credit-cards")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Card", statementDate: "2025-01-10", dueDate: "2025-01-25", billAmount: 10000 });
    expect(create.status).toBe(201);
    const payment = await request(app)
      .post(`/debts/credit-cards/${create.body.data.id}/payments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 3000 });
    expect(payment.status).toBe(200);
    const activity = await request(app).get("/activity").set("Authorization", `Bearer ${token}`);
    expect(activity.body.data.some((a: any) => a.entity === "credit_card" && a.action === "payment")).toBe(true);
  });
});

