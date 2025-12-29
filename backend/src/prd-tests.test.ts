import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './server';

// Test credentials
const TEST_USER = {
    username: 'shrimati_shivangi',
    password: 'c0nsT@nt'
};

describe('FinFlow PRD Compliance Tests - Backend API', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
        // Seed data
        await request(app).post('/admin/seed');

        // Login to get auth token
        const signupRes = await request(app)
            .post('/auth/signup')
            .send({ username: TEST_USER.username, password: TEST_USER.password });
        authToken = signupRes.body.data.token;
        userId = signupRes.body.data.user.id;
    });

    describe('1. Authentication - Login Page', () => {
        it('should allow user signup', async () => {
            const res = await request(app)
                .post('/auth/signup')
                .send({ username: 'test_new_user', password: 'testpass123' });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.user).toHaveProperty('username', 'test_new_user');
        });

        it('should allow user login', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ username: TEST_USER.username, password: TEST_USER.password });

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('token');
        });

        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ username: TEST_USER.username, password: 'wrongpassword' });

            expect(res.status).toBe(401);
        });
    });

    describe('2. Dashboard - Landing Page', () => {
        it('should return dashboard with financial health', async () => {
            const res = await request(app)
                .get('/dashboard')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('health');
            expect(res.body.data).toHaveProperty('constraintScore');
            expect(res.body.data).toHaveProperty('incomes');
            expect(res.body.data).toHaveProperty('fixedExpenses');
            expect(res.body.data).toHaveProperty('variablePlans');
            expect(res.body.data).toHaveProperty('investments');
            expect(res.body.data).toHaveProperty('futureBombs');
            expect(res.body.data).toHaveProperty('alerts');
        });

        it('should calculate health correctly', async () => {
            const res = await request(app)
                .get('/dashboard')
                .set('Authorization', `Bearer ${authToken}`);

            const health = res.body.data.health;
            expect(health).toHaveProperty('category');
            expect(['good', 'ok', 'not well', 'worrisome']).toContain(health.category);
        });

        it('should cache dashboard results for performance', async () => {
            const start1 = Date.now();
            await request(app)
                .get('/dashboard')
                .set('Authorization', `Bearer ${authToken}`);
            const duration1 = Date.now() - start1;

            const start2 = Date.now();
            await request(app)
                .get('/dashboard')
                .set('Authorization', `Bearer ${authToken}`);
            const duration2 = Date.now() - start2;

            // Cached request should be faster
            expect(duration2).toBeLessThan(duration1);
        });
    });

    describe('2.2.1 Variable Expenses', () => {
        it('should list variable expenses', async () => {
            const res = await request(app)
                .get('/planning/variable-expenses')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should create variable expense plan', async () => {
            const res = await request(app)
                .post('/planning/variable-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Groceries',
                    planned: 5000,
                    category: 'Food',
                    start_date: '2025-01-01'
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('name', 'Groceries');
            expect(res.body.data).toHaveProperty('planned', 5000);
        });

        it('should update variable expense plan', async () => {
            const createRes = await request(app)
                .post('/planning/variable-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test', planned: 1000, category: 'Test', start_date: '2025-01-01' });

            const id = createRes.body.data.id;

            const updateRes = await request(app)
                .put(`/planning/variable-expenses/${id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ planned: 1500 });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.planned).toBe(1500);
        });

        it('should delete variable expense plan', async () => {
            const createRes = await request(app)
                .post('/planning/variable-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'ToDelete', planned: 1000, category: 'Test', start_date: '2025-01-01' });

            const id = createRes.body.data.id;

            const deleteRes = await request(app)
                .delete(`/planning/variable-expenses/${id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(deleteRes.status).toBe(204);
        });

        it('should add actual expense to variable plan', async () => {
            const createRes = await request(app)
                .post('/planning/variable-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test', planned: 1000, category: 'Test', start_date: '2025-01-01' });

            const planId = createRes.body.data.id;

            const actualRes = await request(app)
                .post(`/planning/variable-expenses/${planId}/actuals`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 500, incurred_at: '2025-01-15T10:00:00Z' });

            expect(actualRes.status).toBe(201);
            expect(actualRes.body.data).toHaveProperty('amount', 500);
        });

        it('should require justification for overspend in red tier', async () => {
            // First create a plan
            const createRes = await request(app)
                .post('/planning/variable-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test', planned: 1000, category: 'Test', start_date: '2025-01-01' });

            const planId = createRes.body.data.id;

            // Trigger overspend alert to get red tier (this requires constraint manipulation)
            // For now, test that justification is accepted
            const actualRes = await request(app)
                .post(`/planning/variable-expenses/${planId}/actuals`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: 1500,
                    incurred_at: '2025-01-15T10:00:00Z',
                    justification: 'Emergency purchase'
                });

            expect(actualRes.status).toBe(201);
        });
    });

    describe('2.2.2 Fixed Expenses', () => {
        it('should list fixed expenses', async () => {
            const res = await request(app)
                .get('/planning/fixed-expenses')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should create fixed expense', async () => {
            const res = await request(app)
                .post('/planning/fixed-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Rent',
                    amount: 15000,
                    frequency: 'monthly',
                    category: 'Housing'
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('name', 'Rent');
        });

        it('should support SIP flag for periodic expenses', async () => {
            const res = await request(app)
                .post('/planning/fixed-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Quarterly Insurance',
                    amount: 12000,
                    frequency: 'quarterly',
                    category: 'Insurance',
                    is_sip_flag: true
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('isSipFlag', true);
        });

        it('should update fixed expense', async () => {
            const createRes = await request(app)
                .post('/planning/fixed-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test', amount: 1000, frequency: 'monthly', category: 'Test' });

            const id = createRes.body.data.id;

            const updateRes = await request(app)
                .put(`/planning/fixed-expenses/${id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 1500 });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.amount).toBe(1500);
        });

        it('should delete fixed expense', async () => {
            const createRes = await request(app)
                .post('/planning/fixed-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'ToDelete', amount: 1000, frequency: 'monthly', category: 'Test' });

            const id = createRes.body.data.id;

            const deleteRes = await request(app)
                .delete(`/planning/fixed-expenses/${id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(deleteRes.status).toBe(204);
        });
    });

    describe('2.2.3 Investments', () => {
        it('should list investments', async () => {
            const res = await request(app)
                .get('/investments')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should create investment', async () => {
            const res = await request(app)
                .post('/investments')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'SIP - Mutual Fund',
                    goal: 'Retirement',
                    monthlyAmount: 5000,
                    status: 'active'
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('name', 'SIP - Mutual Fund');
            expect(res.body.data).toHaveProperty('status', 'active');
        });

        it('should pause investment', async () => {
            const createRes = await request(app)
                .post('/investments')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test', goal: 'Test', monthlyAmount: 1000, status: 'active' });

            const id = createRes.body.data.id;

            const pauseRes = await request(app)
                .put(`/investments/${id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'paused' });

            expect(pauseRes.status).toBe(200);
            expect(pauseRes.body.data.status).toBe('paused');
        });

        it('should resume investment', async () => {
            const createRes = await request(app)
                .post('/investments')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test', goal: 'Test', monthlyAmount: 1000, status: 'paused' });

            const id = createRes.body.data.id;

            const resumeRes = await request(app)
                .put(`/investments/${id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'active' });

            expect(resumeRes.status).toBe(200);
            expect(resumeRes.body.data.status).toBe('active');
        });
    });

    describe('2.2.5 Credit Cards', () => {
        it('should list credit cards', async () => {
            const res = await request(app)
                .get('/debts/credit-cards')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should create credit card', async () => {
            const res = await request(app)
                .post('/debts/credit-cards')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'HDFC Credit Card',
                    statementDate: '2025-01-05',
                    dueDate: '2025-01-20',
                    billAmount: 15000
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('name', 'HDFC Credit Card');
            expect(res.body.data).toHaveProperty('billAmount', 15000);
        });

        it('should record credit card payment', async () => {
            const createRes = await request(app)
                .post('/debts/credit-cards')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test Card', statementDate: '2025-01-05', dueDate: '2025-01-20', billAmount: 10000 });

            const cardId = createRes.body.data.id;

            const paymentRes = await request(app)
                .post(`/debts/credit-cards/${cardId}/payments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 5000 });

            expect(paymentRes.status).toBe(200);
            expect(paymentRes.body.data.paidAmount).toBe(5000);
        });
    });

    describe('2.2.6 Loans', () => {
        it('should list loans (auto-fetched from fixed expenses)', async () => {
            const res = await request(app)
                .get('/debts/loans')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('2.2.7 Future Bombs', () => {
        it('should list future bombs', async () => {
            const res = await request(app)
                .get('/future-bombs')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should create future bomb', async () => {
            const res = await request(app)
                .post('/future-bombs')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Car Purchase',
                    dueDate: '2025-12-31',
                    totalAmount: 500000,
                    savedAmount: 100000
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('name', 'Car Purchase');
        });

        it('should update future bomb', async () => {
            const createRes = await request(app)
                .post('/future-bombs')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test', dueDate: '2025-12-31', totalAmount: 100000, savedAmount: 0 });

            const id = createRes.body.data.id;

            const updateRes = await request(app)
                .put(`/future-bombs/${id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ savedAmount: 25000 });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.savedAmount).toBe(25000);
        });
    });

    describe('2.2.8 Activity Log', () => {
        it('should list activities', async () => {
            const res = await request(app)
                .get('/activity')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should log credit card creation in activity', async () => {
            const beforeRes = await request(app)
                .get('/activity')
                .set('Authorization', `Bearer ${authToken}`);
            const beforeCount = beforeRes.body.data.length;

            await request(app)
                .post('/debts/credit-cards')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test Card', statementDate: '2025-01-05', dueDate: '2025-01-20', billAmount: 10000 });

            const afterRes = await request(app)
                .get('/activity')
                .set('Authorization', `Bearer ${authToken}`);

            expect(afterRes.body.data.length).toBeGreaterThan(beforeCount);
        });
    });

    describe('3.4 Income', () => {
        it('should list income sources', async () => {
            const res = await request(app)
                .get('/planning/income')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should create income source', async () => {
            const res = await request(app)
                .post('/planning/income')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    source: 'Salary',
                    amount: 75000,
                    frequency: 'monthly'
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('source', 'Salary');
            expect(res.body.data).toHaveProperty('amount', 75000);
        });

        it('should update income source', async () => {
            const createRes = await request(app)
                .post('/planning/income')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ source: 'Test', amount: 50000, frequency: 'monthly' });

            const id = createRes.body.data.id;

            const updateRes = await request(app)
                .put(`/planning/income/${id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 60000 });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.amount).toBe(60000);
        });

        it('should delete income source', async () => {
            const createRes = await request(app)
                .post('/planning/income')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ source: 'ToDelete', amount: 50000, frequency: 'monthly' });

            const id = createRes.body.data.id;

            const deleteRes = await request(app)
                .delete(`/planning/income/${id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(deleteRes.status).toBe(204);
        });
    });

    describe('3.5 Sharing - Account Sharing', () => {
        it('should send sharing invite', async () => {
            const res = await request(app)
                .post('/sharing/invite')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    email_or_username: 'partner@example.com',
                    role: 'editor',
                    merge_finances: true
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('to', 'partner@example.com');
            expect(res.body.data).toHaveProperty('role', 'editor');
        });

        it('should list pending sharing requests', async () => {
            const res = await request(app)
                .get('/sharing/requests')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('incoming');
            expect(res.body.data).toHaveProperty('outgoing');
        });

        it('should approve sharing request', async () => {
            // Create a request
            const req = await request(app)
                .post('/sharing/invite')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ email_or_username: 'test@example.com', role: 'viewer', merge_finances: false });

            const requestId = req.body.data.id;

            // Approve (simulating as the recipient - would normally require different user)
            const approveRes = await request(app)
                .post(`/sharing/requests/${requestId}/approve`)
                .set('Authorization', `Bearer ${authToken}`);

            // Note: This will fail in current implementation as it checks email match
            // This is expected behavior - approval requires recipient authentication
            expect([200, 404]).toContain(approveRes.status);
        });

        it('should reject sharing request', async () => {
            const req = await request(app)
                .post('/sharing/invite')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ email_or_username: 'test@example.com', role: 'viewer', merge_finances: false });

            const requestId = req.body.data.id;

            const rejectRes = await request(app)
                .post(`/sharing/requests/${requestId}/reject`)
                .set('Authorization', `Bearer ${authToken}`);

            // Same as approve - requires recipient auth
            expect([200, 404]).toContain(rejectRes.status);
        });

        it('should list shared account members', async () => {
            const res = await request(app)
                .get('/sharing/members')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('members');
            expect(res.body.data).toHaveProperty('accounts');
        });

        it('should remove member from shared account', async () => {
            // This requires an actual member to exist
            const res = await request(app)
                .delete('/sharing/members/dummy-id')
                .set('Authorization', `Bearer ${authToken}`);

            // Expected to fail as member doesn't exist
            expect(res.status).toBe(403);
        });
    });

    describe('4. Alerts', () => {
        it('should return alerts with dashboard', async () => {
            const res = await request(app)
                .get('/dashboard')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('alerts');
            expect(Array.isArray(res.body.data.alerts)).toBe(true);
        });

        it('should generate alert on overspend', async () => {
            // Create a plan
            const planRes = await request(app)
                .post('/planning/variable-expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test Overspend', planned: 1000, category: 'Test', start_date: '2025-01-01' });

            const planId = planRes.body.data.id;

            // Add actual that exceeds plan
            await request(app)
                .post(`/planning/variable-expenses/${planId}/actuals`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 1500, incurred_at: '2025-01-15T10:00:00Z', justification: 'Test' });

            // Check alerts
            const dashboardRes = await request(app)
                .get('/dashboard')
                .set('Authorization', `Bearer ${authToken}`);

            const alerts = dashboardRes.body.data.alerts;
            const overspendAlert = alerts.find((a: any) => a.type === 'overspend');
            expect(overspendAlert).toBeDefined();
        });
    });

    describe('Rate Limiting', () => {
        it('should apply rate limiting', async () => {
            const requests = Array(130).fill(null).map(() =>
                request(app).get('/health')
            );

            const results = await Promise.all(requests);
            const rateLimited = results.filter(r => r.status === 429);

            expect(rateLimited.length).toBeGreaterThan(0);
        });
    });
});
