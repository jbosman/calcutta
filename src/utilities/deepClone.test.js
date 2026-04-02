import { expect, test } from 'vitest';
import { deepClone } from '.';

test('Objects to be deep cloned as expected', () => {

  const exampleObj = { a: 5, b: 6, c: { d: 7  } };
  const clone = deepClone(exampleObj);

  expect(Object.is(exampleObj, clone)).toBe(false);
  expect(clone).toEqual(exampleObj);
})