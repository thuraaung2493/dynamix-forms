import argon2 from 'argon2';
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(12, 'Password must contain at least 12 characters.')
  .max(128, 'Password cannot contain more than 128 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[\p{P}\p{S}]/u, 'Password must contain at least one symbol.');

export interface PasswordService {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export const argonPasswordService: PasswordService = {
  async hash(password) {
    return argon2.hash(password, {
      hashLength: 32,
      memoryCost: 19_456,
      parallelism: 1,
      timeCost: 3,
      type: argon2.argon2id,
    });
  },
  async verify(hash, password) {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  },
};
