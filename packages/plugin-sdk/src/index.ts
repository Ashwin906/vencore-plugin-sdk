export { createPlugin, createVantageBackend, VantageBackendImpl } from './backend';
export { createPostMessageBridge } from './bridge';
export type { BridgeFn, BridgeCall, BridgeResult } from './bridge';
export type { StorageNamespace, StorageReadNamespace, HttpNamespace, ModalNamespace } from './permissions';
export { createFrontendPlugin } from './react';
export type { VantageFrontendAPI, FrontendPluginDefinition, FrontendSurfaceRegistry, AnyComponent } from './react';
export { VantageFrontendImpl } from './frontend';
export type * from '@vantage/plugin-types';
