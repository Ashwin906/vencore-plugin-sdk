import { describe, it, expectTypeOf } from 'vitest';
import type { PermittedVantage, PermittedResource, PermittedWriteResource, StorageNamespace, StorageReadNamespace } from '../permissions';
import type { PluginPermission } from '@vantage/plugin-types';

describe('PermittedResource', () => {
  it('extracts readable resources from permission list', () => {
    type Perms = readonly ['contacts:read', 'deals:read'];
    type R = PermittedResource<Perms>;
    expectTypeOf<'contacts'>().toMatchTypeOf<R>();
    expectTypeOf<'deals'>().toMatchTypeOf<R>();
  });

  it('does not include resources without :read permission', () => {
    type Perms = readonly ['contacts:read'];
    type R = PermittedResource<Perms>;
    // deals not in R — deals:read not declared
    expectTypeOf<R>().not.toMatchTypeOf<'deals'>();
  });
});

describe('PermittedWriteResource', () => {
  it('extracts writable resources', () => {
    type Perms = readonly ['contacts:write', 'tasks:write'];
    type R = PermittedWriteResource<Perms>;
    expectTypeOf<'contacts'>().toMatchTypeOf<R>();
    expectTypeOf<'tasks'>().toMatchTypeOf<R>();
  });
});

describe('storage gating', () => {
  it('is StorageNamespace (read+write) when storage:write declared', () => {
    type Perms = readonly ['storage:read', 'storage:write'];
    type S = PermittedVantage<Perms>['storage'];
    expectTypeOf<S>().toMatchTypeOf<StorageNamespace>();
  });

  it('is StorageReadNamespace (read-only) when only storage:read declared', () => {
    type Perms = readonly ['storage:read'];
    type S = PermittedVantage<Perms>['storage'];
    expectTypeOf<S>().toMatchTypeOf<StorageReadNamespace>();
    // Cannot be the full StorageNamespace (write ops absent)
    expectTypeOf<S>().not.toMatchTypeOf<StorageNamespace>();
  });

  it('is never when no storage permission', () => {
    type Perms = readonly ['contacts:read'];
    type S = PermittedVantage<Perms>['storage'];
    expectTypeOf<S>().toBeNever();
  });
});
