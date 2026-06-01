// Backend SDK entry point
export { createPlugin, createVantageBackend, VantageBackendImpl } from './backend';
export { createPostMessageBridge } from './bridge';
export type { BridgeFn, BridgeCall, BridgeResult } from './bridge';
export type {
  PermittedVantage,
  PermittedVantageFrontend,
  PermittedResource,
  PermittedWriteResource,
  SafePermittedVantage,
  StorageNamespace,
  StorageReadNamespace,
  HttpNamespace,
  ModalNamespace,
  HasPerm,
  PluginDefinition,
  FrontendPluginDefinition,
} from './permissions';
export type * from '@vantage/plugin-types';
