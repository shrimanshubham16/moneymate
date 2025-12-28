/**
 * MoneyMate Test Fixtures
 * Provides reusable test data and helper functions
 */

export const API_BASE = process.env.API_URL || 'http://localhost:3000';

// Test Accounts
export const TEST_ACCOUNTS = {
    individual1: {
        username: 'qa_individual_1',
        password: 'Test@123456',
        profile: 'High income, good health'
    },
    individual2: {
        username: 'qa_individual_2',
        password: 'Test@123456',
        profile: 'Tight budget, worrisome health'
    },
    familyOwner: {
        username: 'qa_family_owner',
        password: 'Test@123456',
        role: 'owner'
    },
    familySpouse: {
        username: 'qa_family_spouse',
        password: 'Test@123456',
        role: 'viewer'
    },
    familyParent: {
        username: 'qa_family_parent',
        password: 'Test@123456',
        role: 'viewer'
    }
};

// Test Data Templates
export const TEST_DATA = {
    income: {
        salary: { source: 'Salary', amount: 100000, frequency: 'monthly' },
        bonus: { source: 'Bonus', amount: 50000, frequency: 'monthly' }
    },
    fixedExpense: {
        rent: { name: 'Rent', amount: 25000, frequency: 'monthly', category: 'Housing', is_sip_flag: false },
        utilities: { name: 'Utilities', amount: 5000, frequency: 'monthly', category: 'Housing', is_sip_flag: false }
    },
    variableExpense: {
        groceries: { name: 'Groceries', planned: 8000, category: 'Food' },
        transport: { name: 'Transport', planned: 5000, category: 'Transport' }
    },
    investment: {
        ppf: { name: 'PPF', monthlyAmount: 10000 },
        stocks: { name: 'Stocks', monthlyAmount: 15000 }
    },
    creditCard: {
        hdfc: { name: 'HDFC Regalia', limit: 200000, billAmount: 45000, dueDate: 5, paidAmount: 0 }
    },
    loan: {
        car: { name: 'Car Loan', principal: 500000, emi: 12000, tenure: 60 }
    }
};

// API Helper Functions
export class APIHelper {
    static async signup(username: string, password: string) {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) throw new Error(`Signup failed: ${await response.text()}`);
        return response.json();
    }

    static async login(username: string, password: string) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) throw new Error(`Login failed: ${await response.text()}`);
        return response.json();
    }

    static async addIncome(token: string, data: any) {
        const response = await fetch(`${API_BASE}/incomes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Add income failed: ${await response.text()}`);
        return response.json();
    }

    static async addFixedExpense(token: string, data: any) {
        const response = await fetch(`${API_BASE}/fixed-expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Add fixed expense failed: ${await response.text()}`);
        return response.json();
    }

    static async getDashboard(token: string, date: string = new Date().toISOString()) {
        const response = await fetch(`${API_BASE}/dashboard?date=${date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Get dashboard failed: ${await response.text()}`);
        return response.json();
    }
}

// UI Helper Functions
export class UIHelper {
    static async loginUI(page: any, username: string, password: string) {
        await page.goto('/');
        await page.getByRole('tab', { name: 'Login' }).click();
        await page.getByPlaceholder('your_unique_username').fill(username);
        await page.getByPlaceholder('••••••••').fill(password);
        await page.getByRole('button', { name: 'Login' }).click();
        await page.waitForURL('/dashboard');
    }

    static async logoutUI(page: any) {
        await page.click('[data-testid="settings-menu"]');
        await page.getByRole('button', { name: 'Logout' }).click();
    }
}

// Data Cleanup Functions
export class CleanupHelper {
    static async deleteAllUserData(token: string) {
        // Implementation would call backend cleanup endpoints
        // For now, we rely on test account isolation
    }
}
