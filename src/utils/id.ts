/**
 * Wraps `crypto.randomUUID()` to allow easy mocking in tests.
 *
 * Usage:
 *   import { generateId } from '@/utils/id';
 *   const id = generateId();
 */
export function generateId(): string {
  return crypto.randomUUID();
}
