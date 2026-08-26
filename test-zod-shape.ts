import { z } from 'zod';

// Test 1: Using object with explicit shape
const s1 = z.object({
  id: z.string().uuid(),
});
console.log('Test 1:', s1.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' }));

// Test 2: Using strictObject
const s2 = z.strictObject({
  id: z.string().uuid(),
});
console.log('Test 2:', s2.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' }));
