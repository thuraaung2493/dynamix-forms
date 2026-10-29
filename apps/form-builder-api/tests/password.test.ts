import { describe, expect, it } from 'vitest';

import { argonPasswordService, passwordSchema } from '../src/auth/password.js';

describe('password policy and hashing', () => {
  it('requires 12-128 characters, an uppercase letter, and a symbol', () => {
    expect(passwordSchema.safeParse('lowercase-only').success).toBe(false);
    expect(passwordSchema.safeParse('uppercaseonlyA').success).toBe(false);
    expect(passwordSchema.safeParse('valid-passwordA!').success).toBe(true);
    expect(passwordSchema.safeParse(`A!${'x'.repeat(127)}`).success).toBe(false);
  });

  it('hashes and verifies with Argon2id', async () => {
    const hash = await argonPasswordService.hash('valid-passwordA!');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(argonPasswordService.verify(hash, 'valid-passwordA!')).resolves.toBe(true);
    await expect(argonPasswordService.verify(hash, 'wrong-passwordA!')).resolves.toBe(false);
  });
});
