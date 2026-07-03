import { describe, it, expect } from 'vitest';
import { mergeSelectedText } from '../../src/shared/draft-utils.js';

describe('mergeSelectedText', () => {
  it('returns draft content when selected text is empty', () => {
    expect(mergeSelectedText('existing draft', '')).toBe('existing draft');
  });

  it('returns draft content when selected text is only whitespace', () => {
    expect(mergeSelectedText('existing draft', '   \n\n  ')).toBe('existing draft');
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

  it('does not append when selected text is a substring but not a full paragraph', () => {
    const result = mergeSelectedText('hello world', 'world');
    expect(result).toBe('hello world\n\nworld');
  });

  it('appends multi-paragraph selected text preserving internal newlines', () => {
    const result = mergeSelectedText('existing draft', 'line one\n\nline two');
    expect(result).toBe('existing draft\n\nline one\n\nline two');
  });

  it('does not append multi-paragraph selected text if any paragraph already exists', () => {
    const result = mergeSelectedText('existing draft\n\nline two\n\nline three', 'line one\n\nline two');
    expect(result).toBe('existing draft\n\nline two\n\nline three');
  });

  it('handles draft content with excessive blank lines', () => {
    const result = mergeSelectedText('paragraph one\n\n\n\nparagraph two', 'new paragraph');
    expect(result).toBe('paragraph one\n\n\n\nparagraph two\n\nnew paragraph');
  });

  it('handles single newline within a paragraph as part of the selection', () => {
    const result = mergeSelectedText('existing draft', 'line one\nline two');
    expect(result).toBe('existing draft\n\nline one\nline two');
  });
});
