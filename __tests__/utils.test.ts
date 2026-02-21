import { describe, it, expect } from 'vitest';
import {
  formatCount, slugify, transliterateTurkish, calculateReadingTime,
  generateExcerpt, normalizeUsername, formatTagName,
} from '@/lib/utils';

describe('formatCount', () => {
  it('returns plain numbers for < 1000', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with B (Bin) suffix', () => {
    expect(formatCount(1000)).toBe('1B');
    expect(formatCount(1500)).toBe('1.5B');
    expect(formatCount(10000)).toBe('10B');
    expect(formatCount(999500)).toBe('999.5B');
  });

  it('formats millions with Mn suffix', () => {
    expect(formatCount(1000000)).toBe('1Mn');
    expect(formatCount(1500000)).toBe('1.5Mn');
  });
});

describe('slugify', () => {
  it('converts text to URL-safe slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Test 123')).toBe('test-123');
  });

  it('handles Turkish characters', () => {
    const result = slugify('Turkce Icerik Ornegi');
    expect(result).not.toContain(' ');
    expect(result.length).toBeGreaterThan(0);
  });

  it('removes special characters', () => {
    const result = slugify('Hello! @World# $%^&*');
    expect(result).not.toMatch(/[!@#$%^&*]/);
  });
});

describe('transliterateTurkish', () => {
  it('converts Turkish chars to ASCII lowercase', () => {
    expect(transliterateTurkish('çğıöşü')).toBe('cgiosu');
    // Note: transliterateTurkish lowercases everything
    expect(transliterateTurkish('ÇĞİÖŞÜ')).toBe('cgiosu');
  });

  it('preserves non-Turkish chars (lowercased)', () => {
    expect(transliterateTurkish('hello')).toBe('hello');
    expect(transliterateTurkish('HELLO')).toBe('hello');
  });
});

describe('calculateReadingTime', () => {
  it('returns object with wordCount and readingTime', () => {
    const result = calculateReadingTime('Short text');
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('readingTime');
  });

  it('returns readingTime >= 1 for short content', () => {
    const result = calculateReadingTime('Short text');
    expect(result.readingTime).toBe(1);
  });

  it('calculates based on word count (~200 WPM)', () => {
    const words = Array(600).fill('word').join(' ');
    const result = calculateReadingTime(words);
    expect(result.readingTime).toBe(3); // 600/200 = 3 minutes
    expect(result.wordCount).toBe(600);
  });
});

describe('generateExcerpt', () => {
  it('extracts text from HTML', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const excerpt = generateExcerpt(html, 50);
    expect(excerpt).toContain('Hello');
    expect(excerpt).toContain('World');
    expect(excerpt).not.toContain('<p>');
    expect(excerpt).not.toContain('<strong>');
  });

  it('truncates long content', () => {
    const longText = '<p>' + 'word '.repeat(100) + '</p>';
    const excerpt = generateExcerpt(longText, 50);
    expect(excerpt.length).toBeLessThanOrEqual(55);
  });
});

describe('normalizeUsername', () => {
  it('lowercases and removes invalid chars', () => {
    expect(normalizeUsername('Hello World')).toBe('helloworld');
    expect(normalizeUsername('User@Name!')).toBe('username');
  });

  it('preserves dots and underscores', () => {
    expect(normalizeUsername('user.name')).toBe('user.name');
    expect(normalizeUsername('user_name')).toBe('user_name');
  });
});

describe('formatTagName', () => {
  it('converts Turkish chars and removes non-alphanumeric', () => {
    expect(formatTagName('teknoloji')).toBe('teknoloji');
    expect(formatTagName('Türkçe Şölen!')).toBe('turkcesolen');
    expect(formatTagName('İstanbul/Ankara')).toBe('istanbulankara');
    expect(formatTagName('rock&roll-2024')).toBe('rockroll2024');
    expect(formatTagName('çğüşiö')).toBe('cgusio');
    expect(formatTagName('SPOR')).toBe('spor');
    expect(formatTagName('makine öğrenmesi')).toBe('makineögrenmesi'.replace(/ö/g, 'o'));
  });
});
