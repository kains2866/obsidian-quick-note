import { describe, it, expect } from 'vitest';
import { mergeSelectedText } from '../../src/shared/draft-utils.js';

describe('mergeSelectedText', () => {
  it('returns draft content when selected text is empty', () => {
    expect(mergeSelectedText('existing draft', '')).toBe('existing draft');
  });

  it('returns selected text when draft is empty', () => {
    expect(mergeSelectedText('', 'selected text')).toBe('selected text');
  });

  it('appends selected text with a blank line when draft exists', () => {
    expect(mergeSelectedText('existing draft', 'selected text')).toBe(
      'existing draft\n\nselected text',
    );
  });

  it('trims whitespace from selected text', () => {
    expect(mergeSelectedText('draft', '  selected text  ')).toBe('draft\n\nselected text');
  });

  it('does not append duplicate selected text', () => {
    const result = mergeSelectedText('existing draft\n\nselected text', 'selected text');
    expect(result).toBe('existing draft\n\nselected text');
  });

  it('does not append if selected text matches a trimmed paragraph', () => {
    const result = mergeSelectedText('paragraph one\n\n  paragraph two  ', 'paragraph two');
    expect(result).toBe('paragraph one\n\n  paragraph two  ');
  });

  it('appends different selected text', () => {
    const result = mergeSelectedText('existing draft', 'different text');
    expect(result).toBe('existing draft\n\ndifferent text');
  });
});
