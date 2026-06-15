// TODO: update in Task 12 (frontend SDK)
// The old PermittedVencore, PermittedResource, PermittedWriteResource generics
// have been removed from permissions.ts. These type-level tests will be
// rewritten once the frontend SDK namespace types are introduced.

import { describe, it, expectTypeOf } from 'vitest';
import type { StorageNamespace, StorageReadNamespace } from '../permissions';

describe('StorageNamespace', () => {
  it('StorageNamespace extends StorageReadNamespace', () => {
    expectTypeOf<StorageNamespace>().toMatchTypeOf<StorageReadNamespace>();
  });

  it('StorageReadNamespace does not include write methods', () => {
    expectTypeOf<StorageReadNamespace>().not.toMatchTypeOf<StorageNamespace>();
  });
});
