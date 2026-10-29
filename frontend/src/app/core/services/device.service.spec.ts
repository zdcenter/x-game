import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceService } from './device.service';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect device categories based on screen dimensions and touch', () => {
    const type = service.deviceType();
    expect(['mobile', 'tablet', 'desktop']).toContain(type);
    expect(typeof service.isMobile()).toBe('boolean');
    expect(typeof service.isTablet()).toBe('boolean');
    expect(typeof service.isDesktop()).toBe('boolean');
    expect(service.isHandheld()).toBe(service.isMobile() || service.isTablet());
  });
});
