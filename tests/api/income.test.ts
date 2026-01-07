/**
 * Income API Tests
 * Tests for CRUD operations on income sources
 */

import {
  apiRequest,
  TestRunner,
  assertExists,
  assertStatusOk,
  assertEqual,
  assertTrue
} from './setup.js';

export async function runIncomeTests(runner: TestRunner): Promise<void> {
  const token = runner.getToken();
  if (!token) {
    console.log('⚠️ Skipping income tests - no auth token');
    return;
  }
  
  let createdIncomeId: string | null = null;
  
  // INC-001: Create income with plaintext
  await runner.run('INC-001', 'Create income with plaintext', async () => {
    const { status, data } = await apiRequest('/planning/income', 'POST', {
      source: 'Test Salary',
      amount: 50000,
      frequency: 'monthly'
    }, token);
    
    assertStatusOk(status, `Create income failed: ${JSON.stringify(data)}`);
    assertExists(data.data, 'No data in response');
    assertExists(data.data.id, 'No id in created income');
    assertEqual(data.data.name, 'Test Salary', 'Name mismatch');
    assertEqual(data.data.amount, 50000, 'Amount mismatch');
    
    createdIncomeId = data.data.id;
  });
  
  // INC-002: Create income with encrypted fields
  await runner.run('INC-002', 'Create income with encrypted fields', async () => {
    const { status, data } = await apiRequest('/planning/income', 'POST', {
      source: 'Encrypted Salary',
      source_enc: 'ZW5jcnlwdGVkX3NvdXJjZQ==', // mock encrypted value
      source_iv: 'aXZfZm9yX3NvdXJjZQ==',
      amount: 75000,
      amount_enc: 'ZW5jcnlwdGVkX2Ftb3VudA==',
      amount_iv: 'aXZfZm9yX2Ftb3VudA==',
      frequency: 'monthly'
    }, token);
    
    assertStatusOk(status, `Create encrypted income failed: ${JSON.stringify(data)}`);
    assertExists(data.data, 'No data in response');
    // Verify encrypted fields are stored
    // Note: Actual verification would check DB directly
  });
  
  // INC-003: Store [encrypted] when no plaintext
  await runner.run('INC-003', 'Store [encrypted] when no plaintext provided', async () => {
    const { status, data } = await apiRequest('/planning/income', 'POST', {
      // No plaintext source - only encrypted
      source_enc: 'ZW5jcnlwdGVkX29ubHk=',
      source_iv: 'aXZfb25seQ==',
      amount_enc: 'YW1vdW50X2VuYw==',
      amount_iv: 'YW1vdW50X2l2',
      frequency: 'monthly'
    }, token);
    
    assertStatusOk(status, `Create encrypted-only income failed: ${JSON.stringify(data)}`);
    assertExists(data.data, 'No data in response');
    // The name field should be '[encrypted]' or similar placeholder
    assertEqual(data.data.name, '[encrypted]', 'Should store placeholder when no plaintext');
  });
  
  // INC-004: Update income
  await runner.run('INC-004', 'Update income', async () => {
    if (!createdIncomeId) {
      throw new Error('No income ID to update');
    }
    
    const { status, data } = await apiRequest(`/planning/income/${createdIncomeId}`, 'PUT', {
      source: 'Updated Salary',
      amount: 60000
    }, token);
    
    assertStatusOk(status, `Update income failed: ${JSON.stringify(data)}`);
    assertEqual(data.data.name, 'Updated Salary', 'Name not updated');
    assertEqual(data.data.amount, 60000, 'Amount not updated');
  });
  
  // INC-005: Delete income
  await runner.run('INC-005', 'Delete income', async () => {
    if (!createdIncomeId) {
      throw new Error('No income ID to delete');
    }
    
    const { status, data } = await apiRequest(`/planning/income/${createdIncomeId}`, 'DELETE', undefined, token);
    
    assertStatusOk(status, `Delete income failed: ${JSON.stringify(data)}`);
    assertTrue(data.data?.deleted === true, 'Delete flag not set');
  });
  
  // INC-006: Return incomes in dashboard
  await runner.run('INC-006', 'Return incomes in dashboard response', async () => {
    const { status, data } = await apiRequest('/dashboard', 'GET', undefined, token);
    
    assertStatusOk(status, `Dashboard failed: ${JSON.stringify(data)}`);
    assertExists(data.data, 'No data in dashboard');
    assertTrue(Array.isArray(data.data.incomes), 'incomes should be an array');
  });
}

