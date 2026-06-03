export { createPlugin, createVantageBackend, VantageBackendImpl } from './backend';
export { createPostMessageBridge } from './bridge';
export type { BridgeFn, BridgeCall, BridgeResult } from './bridge';
export type { StorageNamespace, StorageReadNamespace, HttpNamespace, ModalNamespace } from './permissions';
export type * from '@vantage/plugin-types';
