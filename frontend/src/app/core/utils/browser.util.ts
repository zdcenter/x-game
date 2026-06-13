// src/app/core/utils/browser.util.ts

/**
 * Utility helpers to safely access browser globals when the code runs under
 * Server‑Side Rendering (SSR) / Static Site Generation (SSG).
 * All helpers return sensible defaults on the server side and avoid RuntimeError.
 */

export const isBrowser = (): boolean => typeof window !== 'undefined';

export const getOrigin = (): string => (isBrowser() ? window.location.origin : '');

export const getHref = (): string => (isBrowser() ? window.location.href : '');

/**
 * Safely create a WebSocket if we are in the browser and the wsUrl is configured.
 * Returns `null` on the server side – callers should handle the null case.
 */
export const createWebSocket = (url: string): WebSocket | null => {
  if (!isBrowser()) {
    console.warn('WebSocket creation skipped in SSR (no window)');
    return null;
  }
  try {
    return new WebSocket(url);
  } catch (e) {
    console.error('Failed to create WebSocket:', e);
    return null;
  }
};

export const getPathname = (): string => (isBrowser() ? window.location.pathname : '');

export const getSearch = (): string => (isBrowser() ? window.location.search : '');

export const pushState = (url: string) => {
  if (isBrowser()) window.history.pushState(null, '', url);
};

export const replaceState = (url: string) => {
  if (isBrowser()) window.history.replaceState(null, '', url);
};

export const storageGet = (key: string): string | null =>
  isBrowser() ? localStorage.getItem(key) : null;

export const storageSet = (key: string, value: string): void => {
  if (isBrowser()) localStorage.setItem(key, value);
};

export const getNavigatorLanguage = (): string | null =>
  isBrowser() ? navigator.language : null;

export const createAudioContext = (): AudioContext | null => {
  if (!isBrowser()) return null;
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
};

export const safeCreateElement = (tag: string, attrs: Record<string, any> = {}): HTMLElement | null => {
  if (!isBrowser()) return null;
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => (el as any)[k] = v);
  return el;
};

export const querySelector = (parent: Document | HTMLElement, selector: string): HTMLElement | null => {
  return isBrowser() ? parent.querySelector(selector) : null;
};

export const buildUrl = (base: string, params: Record<string, string>): string => {
  if (!isBrowser()) return base;
  const u = new URL(base, getOrigin() || undefined);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
};
