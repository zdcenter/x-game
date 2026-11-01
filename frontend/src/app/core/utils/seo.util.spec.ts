import { describe, it, expect } from 'vitest';
import { optimizeMetaDescription, optimizeMetaTitle, getHtmlEntityLength } from './seo.util';

describe('seo.util', () => {
  it('should optimize short Chinese description to 130-160 characters', () => {
    const shortDesc = '经典 1010 方块消除游戏核心策略与玩法技巧。掌握空间预留、多行连击消除与无尽生存高分技巧。';
    const optimized = optimizeMetaDescription(shortDesc, 'zh');
    expect(optimized.length).toBeGreaterThanOrEqual(130);
    expect(optimized.length).toBeLessThanOrEqual(160);
    expect(optimized.startsWith(shortDesc)).toBe(true);
  });

  it('should optimize short English description to 130-160 characters', () => {
    const shortDesc = 'Guess the secret non-repeating digit code. Play solo or race against friends.';
    const optimized = optimizeMetaDescription(shortDesc, 'en');
    expect(optimized.length).toBeGreaterThanOrEqual(130);
    expect(optimized.length).toBeLessThanOrEqual(160);
  });

  it('should optimize short Japanese description to 130-160 characters', () => {
    const shortDesc = 'アリーナに参加してスコアを保存するには、Puzzle PKアカウントにサインインしてください。';
    const optimized = optimizeMetaDescription(shortDesc, 'ja');
    expect(optimized.length).toBeGreaterThanOrEqual(130);
    expect(optimized.length).toBeLessThanOrEqual(160);
  });

  it('should optimize short Korean description to 130-160 characters', () => {
    const shortDesc = '퍼즐 PK 계정에 로그인하여 아레나에 참여하고 점수를 저장하세요.';
    const optimized = optimizeMetaDescription(shortDesc, 'ko');
    expect(optimized.length).toBeGreaterThanOrEqual(130);
    expect(optimized.length).toBeLessThanOrEqual(160);
  });

  it('should not modify description that is already 130-160 characters', () => {
    const perfectDesc = 'Puzzle PK is an online gaming platform featuring Minesweeper, Sudoku, 2048, and Sokoban. Enjoy solo practice or challenge friends in real-time online battles!';
    expect(perfectDesc.length).toBeGreaterThanOrEqual(130);
    expect(perfectDesc.length).toBeLessThanOrEqual(160);
    const optimized = optimizeMetaDescription(perfectDesc, 'en');
    expect(optimized).toBe(perfectDesc);
  });

  it('should truncate overly long description under 160 characters cleanly', () => {
    const longDesc = 'This is a very long description that goes on and on and contains a lot of unnecessary text that will surely exceed the maximum character limit recommended by search engines like Google and Bing for meta descriptions in search results pages.';
    const optimized = optimizeMetaDescription(longDesc, 'en');
    expect(optimized.length).toBeLessThanOrEqual(160);
    expect(optimized.endsWith('...')).toBe(true);
  });

  it('should keep title <= 68 HTML characters', () => {
    const longTitle = 'Mastering 1A2B (Bulls and Cows): Strategy, Algorithms, and the Science of Deduction';
    const optimized = optimizeMetaTitle(longTitle, 'Puzzle PK');
    expect(getHtmlEntityLength(optimized)).toBeLessThanOrEqual(68);
  });
});
