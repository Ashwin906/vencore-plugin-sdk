/**
 * Module-level singleton — set by frontend createPlugin(), read by React hooks.
 * One VantageFrontendImpl per iframe (one plugin per iframe).
 */
import type { VantageFrontendImpl } from './frontend';

let _instance: VantageFrontendImpl | null = null;

export function setVantageInstance(v: VantageFrontendImpl): void {
  _instance = v;
}

export function getVantageInstance(): VantageFrontendImpl {
  if (!_instance) {
    throw new Error(
      '[plugin-sdk] SDK not initialized. ' +
      'Import createPlugin from @vantage/plugin-sdk/frontend and call it before using hooks.',
    );
  }
  return _instance;
}
