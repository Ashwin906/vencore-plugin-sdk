/**
 * Module-level singleton — set by frontend createPlugin(), read by React hooks.
 * One VencoreFrontendImpl per iframe (one plugin per iframe).
 */
import type { VencoreFrontendImpl } from './frontend';

let _instance: VencoreFrontendImpl | null = null;

export function setVencoreInstance(v: VencoreFrontendImpl): void {
  _instance = v;
}

export function getVencoreInstance(): VencoreFrontendImpl {
  if (!_instance) {
    throw new Error(
      '[plugin-sdk] SDK not initialized. ' +
      'Import createFrontendPlugin from @vencore/plugin-sdk/react and call it before using hooks.',
    );
  }
  return _instance;
}
