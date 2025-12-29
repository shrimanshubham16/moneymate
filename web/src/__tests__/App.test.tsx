import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const mockDashboard = {
  data: {
    incomes: [{ id: "inc1", source: "Salary", amount: 100000, frequency: "monthly" }],
    fixedExpenses: [],
    variablePlans: [{ id: "var1", name: "Food", planned: 5000, actualTotal: 2000, actuals: [] }],
    health: { remaining: 90000, category: "good" },
    constraintScore: { score: 30, tier: "green" },
    investments: [],
    futureBombs: [],
    alerts: [],
    creditCards: [],
    loans: [],
    activities: []
  }
};

function mockFetchFactory() {
  let lastPath = "";
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    lastPath = String(input);
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    if (lastPath.endsWith("/auth/signup") || lastPath.endsWith("/auth/login")) {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: "token-1", user: { id: "u1", email: body.email, username: "user" } }), {
          status: 200
        })
      );
    }
    if (lastPath.startsWith("http://localhost:4000/dashboard")) {
      return Promise.resolve(new Response(JSON.stringify(mockDashboard), { status: 200 }));
    }
    if (lastPath.endsWith("/sharing/members")) {
      return Promise.resolve(new Response(JSON.stringify({ data: { members: [], accounts: [] } }), { status: 200 }));
    }
    if (lastPath.endsWith("/sharing/requests")) {
      return Promise.resolve(new Response(JSON.stringify({ data: { incoming: [], outgoing: [] } }), { status: 200 }));
    }
    if (lastPath.endsWith("/sharing/invite")) {
      return Promise.resolve(new Response(JSON.stringify({ data: { ok: true } }), { status: 201 }));
    }
    if (lastPath.endsWith("/debts/credit-cards") && init?.method === "GET") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }
    if (lastPath.includes("/debts/credit-cards/") && init?.method === "POST") {
      return Promise.resolve(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }));
    }
    if (lastPath.endsWith("/debts/loans")) {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }
    if (lastPath.endsWith("/activity")) {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }
    if (lastPath.endsWith("/planning/income") || lastPath.includes("/planning/variable-expenses")) {
      return Promise.resolve(new Response(JSON.stringify({ data: { ok: true } }), { status: 201 }));
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  });
}

describe("FinFlow web mock dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("signs up and shows dashboard health", async () => {
    global.fetch = mockFetchFactory() as any;
    render(<App />);

    await act(async () => {
      const buttons = screen.getAllByText(/Sign Up/i);
      fireEvent.click(buttons[1]); // submit button
    });

    await waitFor(() => expect(screen.getByText(/Financial Health/i)).toBeInTheDocument());
    expect(screen.getByText(/remaining/)).toBeInTheDocument();
    expect(screen.getByText(/Add Income/i)).toBeInTheDocument();
  });
});

