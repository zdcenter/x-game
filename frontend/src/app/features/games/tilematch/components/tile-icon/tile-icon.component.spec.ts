import { describe, it, expect } from 'vitest';
import { TileIconComponent } from './tile-icon.component';
import { TILE_TYPES } from '../../store/tilematch-engine';

describe('TileIconComponent (羊了个羊卡牌温润矢量图标)', () => {
  it('should instantiate successfully with default fallback emoji', () => {
    const component = new TileIconComponent();
    expect(component).toBeTruthy();
    expect(component.fallbackEmoji).toBe('❓');
  });

  it('should accept valid tile types including bell, carrot, glove and grass', () => {
    const component = new TileIconComponent();
    component.type = 'bell';
    expect(component.type).toBe('bell');

    TILE_TYPES.forEach(t => {
      component.type = t;
      expect(component.type).toBe(t);
    });
  });

  it('should support custom fallback emoji', () => {
    const component = new TileIconComponent();
    component.fallbackEmoji = '⭐';
    expect(component.fallbackEmoji).toBe('⭐');
  });
});
