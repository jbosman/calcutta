import { expect, test } from 'vitest'
import { getGameKey } from './index';

test('Computes expected game key', () => {
  expect(getGameKey(1, 2)).toBe('1-2');
  expect(getGameKey(2, 1)).toBe('1-2');
})