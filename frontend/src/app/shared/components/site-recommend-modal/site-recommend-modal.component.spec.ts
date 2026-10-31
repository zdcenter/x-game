import { describe, it, expect, beforeEach } from 'vitest';
import { SiteRecommendService } from '../../../core/services/site-recommend.service';

describe('SiteRecommendService & Recommend Feature', () => {
  let service: SiteRecommendService;

  beforeEach(() => {
    service = new SiteRecommendService();
  });

  it('should be created with initial closed state and casual script active', () => {
    expect(service).toBeTruthy();
    expect(service.isOpen()).toBe(false);
    expect(service.activeScriptId()).toBe('casual');
  });

  it('should open and close the recommend modal cleanly', () => {
    service.open();
    expect(service.isOpen()).toBe(true);

    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('should switch between ready-to-use pitch scripts (casual, pk, family, minimal)', () => {
    service.activeScriptId.set('pk');
    expect(service.activeScriptId()).toBe('pk');

    service.activeScriptId.set('family');
    expect(service.activeScriptId()).toBe('family');

    service.activeScriptId.set('minimal');
    expect(service.activeScriptId()).toBe('minimal');

    service.activeScriptId.set('casual');
    expect(service.activeScriptId()).toBe('casual');
  });

  it('should produce a non-empty inviteUrl and referralCode fallback', () => {
    const url = service.inviteUrl();
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(5);

    const ref = service.referralCode();
    expect(ref).toBeTruthy();
    expect(typeof ref).toBe('string');
  });
});
