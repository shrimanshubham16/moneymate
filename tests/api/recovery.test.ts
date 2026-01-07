import { apiRequest, TestRunner, assertStatus, assertStatusOk, assertExists } from './setup.js';

export async function runRecoveryTests(runner: TestRunner): Promise<void> {
  const username = `recover_${Date.now()}`;
  const recoveryHash = 'dGVzdGhhc2g='; // dummy base64
  const salt = 'dGVzdHNhbHQ=';

  await runner.run('REC-001', 'Recover endpoint rejects missing payload', async () => {
    const { status } = await apiRequest('/auth/recover-with-key', 'POST', {});
    assertStatus(status, 400, 'Expected 400 for missing fields');
  });

  await runner.run('REC-002', 'Recover endpoint 404 for unknown user', async () => {
    const { status } = await apiRequest('/auth/recover-with-key', 'POST', {
      username: 'does_not_exist',
      recoveryKey: 'word '.repeat(24).trim(),
      newPassword: 'NewPassword123!'
    });
    assertStatus(status, 404, 'Expected 404 for unknown user');
  });

  await runner.run('REC-003', 'Recover endpoint available', async () => {
    // Create user first
    const signupRes = await apiRequest('/auth/signup', 'POST', {
      username,
      password: 'Password123!',
      encryptionSalt: salt,
      recoveryKeyHash: recoveryHash
    });
    assertStatusOk(signupRes.status, 'Signup should succeed');

    const { status, data } = await apiRequest('/auth/recover-with-key', 'POST', {
      username,
      recoveryKey: 'word '.repeat(24).trim(),
      newPassword: 'NewPassword123!'
    });
    // Recovery will fail hash mismatch but endpoint should return 400/401 not 500
    assertStatus(status, 400, 'Expected 400 for invalid recovery key');
    assertExists(data, 'Response body missing');
  });
}

