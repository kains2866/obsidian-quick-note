import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/constants.js';

describe('DEFAULT_SETTINGS', () => {
  it('has captureVideoProgress enabled by default', () => {
    expect(DEFAULT_SETTINGS.captureVideoProgress).toBe(true);
  });
});
