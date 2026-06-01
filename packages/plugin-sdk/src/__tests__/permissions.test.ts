import { describe, it, expectTypeOf } from 'vitest';
import type { PermittedVantage, PermittedResource } from '../permissions';
import type { PluginPermission } from '@vantage/plugin-types';

describe('PermittedResource', () => {
  it('extracts readable resources from permission list', () => {
    type Perms = readonly ['contacts:read', 'deals:read'];
    type R = PermittedResource<Perms>;
    expectTypeOf<'contacts'>().toMatchTypeOf<R>();
    expectTypeOf<'deals'>().toMatchTypeOf<R>();
  });
});
