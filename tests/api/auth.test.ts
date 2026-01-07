/**
 * Authentication API Tests
 * Tests for signup, login, and encryption salt handling
 */

import {
  TEST_CONFIG,
  apiRequest,
  TestRunner,
  assertEqual,
  assertTrue,
  assertExists,
  assertStatusOk,
  assertStatus
} from './setup.js';

export async function runAuthTests(runner: TestRunner): Promise<void> {
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'TestPassword123!',
    email: `test_${Date.now()}@example.com`
  };
  
  let authToken: string | null = null;
  let encryptionSalt: string | null = null;
  
  // AUTH-001: Create new user with valid data
  await runner.run('AUTH-001', 'Create new user with valid data', async () => {
    const { status, data } = await apiRequest('/auth/signup', 'POST', {
      username: testUser.username,
      password: testUser.password,
      email: testUser.email,
      encryptionSalt: 'dGVzdHNhbHQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW4=', // base64 test salt
      recoveryKeyHash: 'dGVzdHJlY292ZXJ5aGFzaA==' // base64 test hash
    });
    
    assertStatusOk(status, `Signup failed with status ${status}: ${JSON.stringify(data)}`);
    assertExists(data.access_token, 'No access_token in response');
    assertExists(data.user, 'No user in response');
    assertEqual(data.user.username, testUser.username, 'Username mismatch');
    
    authToken = data.access_token;
    encryptionSalt = data.encryption_salt;
    runner.setToken(authToken);
  });
  
  // AUTH-005: Return encryption_salt on signup
  await runner.run('AUTH-005', 'Return encryption_salt on signup', async () => {
    assertExists(encryptionSalt, 'No encryption_salt returned on signup');
    assertTrue(encryptionSalt.length > 10, 'encryption_salt too short');
  });
  
  // AUTH-002: Reject invalid username (<3 chars)
  await runner.run('AUTH-002', 'Reject invalid username (<3 chars)', async () => {
    const { status } = await apiRequest('/auth/signup', 'POST', {
      username: 'ab',
      password: 'ValidPassword123!',
      encryptionSalt: 'dGVzdHNhbHQ=',
      recoveryKeyHash: 'dGVzdGhhc2g='
    });
    
    assertEqual(status, 400, 'Should reject short username');
  });
  
  // AUTH-003: Reject invalid password (<8 chars)
  await runner.run('AUTH-003', 'Reject invalid password (<8 chars)', async () => {
    const { status } = await apiRequest('/auth/signup', 'POST', {
      username: 'validuser123',
      password: 'short',
      encryptionSalt: 'dGVzdHNhbHQ=',
      recoveryKeyHash: 'dGVzdGhhc2g='
    });
    
    assertEqual(status, 400, 'Should reject short password');
  });
  
  // AUTH-004: Reject duplicate username
  await runner.run('AUTH-004', 'Reject duplicate username', async () => {
    const { status } = await apiRequest('/auth/signup', 'POST', {
      username: testUser.username, // Same as before
      password: 'AnotherPassword123!',
      encryptionSalt: 'dGVzdHNhbHQ=',
      recoveryKeyHash: 'dGVzdGhhc2g='
    });
    
    assertTrue(status >= 400, 'Should reject duplicate username');
  });
  
  // AUTH-006: Login with valid credentials
  await runner.run('AUTH-006', 'Login with valid credentials', async () => {
    const { status, data } = await apiRequest('/auth/login', 'POST', {
      username: testUser.username,
      password: testUser.password
    });
    
    assertStatusOk(status, `Login failed: ${JSON.stringify(data)}`);
    assertExists(data.access_token, 'No access_token on login');
    assertExists(data.user, 'No user on login');
    
    authToken = data.access_token;
    runner.setToken(authToken);
  });
  
  // AUTH-008: Return encryption_salt on login
  await runner.run('AUTH-008', 'Return encryption_salt on login', async () => {
    const { status, data } = await apiRequest('/auth/login', 'POST', {
      username: testUser.username,
      password: testUser.password
    });
    
    assertStatusOk(status);
    assertExists(data.encryption_salt, 'No encryption_salt on login');
    assertTrue(data.encryption_salt.length > 10, 'encryption_salt too short');
  });
  
  // AUTH-007: Reject invalid credentials
  await runner.run('AUTH-007', 'Reject invalid credentials', async () => {
    const { status } = await apiRequest('/auth/login', 'POST', {
      username: testUser.username,
      password: 'WrongPassword123!'
    });
    
    assertEqual(status, 401, 'Should reject wrong password');
  });
  
  // AUTH-010: Return salt for existing user
  await runner.run('AUTH-010', 'Return salt for existing user', async () => {
    const { status, data } = await apiRequest(`/auth/salt/${testUser.username}`, 'GET');
    
    assertStatusOk(status);
    assertExists(data.encryption_salt, 'No encryption_salt from salt endpoint');
  });
  
  // AUTH-011: Return user profile with token
  await runner.run('AUTH-011', 'Return user profile with token', async () => {
    const { status, data } = await apiRequest('/auth/me', 'GET', undefined, authToken!);
    
    assertStatusOk(status, `Failed to get user: ${JSON.stringify(data)}`);
    assertExists(data.data, 'No data in response');
    assertExists(data.data.username, 'No username in profile');
  });
}

