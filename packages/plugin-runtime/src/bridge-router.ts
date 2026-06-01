import type { Kysely } from 'kysely';
import type { PluginPermission } from '@vantage/plugin-types';
import type { BridgeCall, BridgeResult } from '@vantage/plugin-sdk';
import { checkPermission } from './permissions';

export interface BridgeContext {
  workspaceId: string;
  pluginSlug: string;
  permissions: readonly PluginPermission[];
  /** Table names as declared in manifest (without prefix). */
  tables: string[];
}

type DB = Kysely<any>;

/**
 * Main bridge dispatcher. Receives a raw bridge call from the API route,
 * validates permissions, and routes to the appropriate DB operation.
 */
export async function dispatchBridgeCall(
  db: DB,
  ctx: BridgeContext,
  call: BridgeCall,
): Promise<BridgeResult> {
  const { method, payload } = call;

  // Permission gate
  const permError = checkPermission(ctx.permissions, method);
  if (permError) return { data: null, error: permError };

  try {
    const p = payload as Record<string, unknown>;
    const dot = method.indexOf('.');
    const namespace = dot >= 0 ? method.slice(0, dot) : method;
    const verb = dot >= 0 ? method.slice(dot + 1) : '';

    switch (namespace) {
      case 'contacts':
        return { data: await dispatchCrud(db, ctx.workspaceId, 'contacts', verb, p), error: null };

      case 'companies':
        return { data: await dispatchCrud(db, ctx.workspaceId, 'companies', verb, p), error: null };

      case 'deals':
        return { data: await dispatchCrud(db, ctx.workspaceId, 'deals', verb, p), error: null };

      case 'tasks':
        return { data: await dispatchCrud(db, ctx.workspaceId, 'tasks', verb, p), error: null };

      case 'activity':
        return { data: await dispatchCrud(db, ctx.workspaceId, 'activity', verb, p), error: null };

      case 'servers': {
        const filter = (p.filter ?? {}) as Record<string, unknown>;
        if (verb === 'list') {
          let q = db.selectFrom('servers').selectAll().where('workspace_id', '=', ctx.workspaceId);
          if (filter.status) q = q.where('status', '=', filter.status as string);
          if (filter.limit) q = q.limit(filter.limit as number);
          return { data: await q.execute(), error: null };
        }
        if (verb === 'get') {
          const row = await db
            .selectFrom('servers')
            .selectAll()
            .where('workspace_id', '=', ctx.workspaceId)
            .where('id', '=', p.id as string)
            .executeTakeFirst();
          if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Server not found' } };
          return { data: row, error: null };
        }
        return { data: null, error: { code: 'UNKNOWN_METHOD', message: `Unknown method: ${method}` } };
      }

      case 'websites': {
        const filter = (p.filter ?? {}) as Record<string, unknown>;
        if (verb === 'list') {
          let q = db.selectFrom('websites').selectAll().where('workspace_id', '=', ctx.workspaceId);
          if (filter.status) q = q.where('status', '=', filter.status as string);
          if (filter.limit) q = q.limit(filter.limit as number);
          return { data: await q.execute(), error: null };
        }
        if (verb === 'get') {
          const row = await db
            .selectFrom('websites')
            .selectAll()
            .where('workspace_id', '=', ctx.workspaceId)
            .where('id', '=', p.id as string)
            .executeTakeFirst();
          if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Website not found' } };
          return { data: row, error: null };
        }
        return { data: null, error: { code: 'UNKNOWN_METHOD', message: `Unknown method: ${method}` } };
      }

      case 'storage': {
        const key = `${ctx.pluginSlug}:${p.key as string}`;
        if (verb === 'get') {
          const row = await db
            .selectFrom('plugin_storage')
            .select('value')
            .where('workspace_id', '=', ctx.workspaceId)
            .where('key', '=', key)
            .executeTakeFirst();
          return { data: row ? row.value : null, error: null };
        }
        if (verb === 'set') {
          await db
            .insertInto('plugin_storage')
            .values({ workspace_id: ctx.workspaceId, key, value: p.value })
            .onConflict((oc) => oc.columns(['workspace_id', 'key']).doUpdateSet({ value: p.value }))
            .execute();
          return { data: null, error: null };
        }
        if (verb === 'delete') {
          await db
            .deleteFrom('plugin_storage')
            .where('workspace_id', '=', ctx.workspaceId)
            .where('key', '=', key)
            .execute();
          return { data: null, error: null };
        }
        return { data: null, error: { code: 'UNKNOWN_METHOD', message: `Unknown method: ${method}` } };
      }

      case 'table': {
        const tableName = p.name as string;
        if (!ctx.tables.includes(tableName)) {
          return {
            data: null,
            error: { code: 'FORBIDDEN', message: `Table '${tableName}' is not declared in the plugin manifest.` },
          };
        }
        // Delegate to table-client (to be implemented in Task 7)
        // For now return a stub error so the router is testable
        return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Table operations require plugin-runtime table-client (Task 7)' } };
      }

      default:
        // Custom action or unrecognised namespace — pass through as NOT_IMPLEMENTED
        return { data: null, error: { code: 'UNKNOWN_METHOD', message: `Unknown bridge method: ${method}` } };
    }
  } catch (e) {
    if (e !== null && typeof e === 'object' && 'code' in e && 'message' in e) {
      return { data: null, error: e as { code: string; message: string } };
    }
    const message = e instanceof Error ? e.message : 'Internal bridge error';
    return { data: null, error: { code: 'INTERNAL', message } };
  }
}

// ── Generic CRUD dispatcher ──────────────────────────────────────────────────

async function dispatchCrud(
  db: DB,
  workspaceId: string,
  table: string,
  verb: string,
  p: Record<string, unknown>,
): Promise<unknown> {
  switch (verb) {
    case 'list': {
      const filter = (p.filter ?? {}) as Record<string, unknown>;
      let q = db.selectFrom(table).selectAll().where('workspace_id', '=', workspaceId);
      if (filter.limit) q = q.limit(filter.limit as number);
      if (filter.offset) q = q.offset(filter.offset as number);
      return q.execute();
    }
    case 'get': {
      const row = await db
        .selectFrom(table)
        .selectAll()
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', p.id as string)
        .executeTakeFirst();
      if (!row) throw { code: 'NOT_FOUND', message: `${table} record not found` };
      return row;
    }
    case 'create': {
      const data = p.data as Record<string, unknown>;
      const [row] = await db
        .insertInto(table)
        .values({ ...data, workspace_id: workspaceId })
        .returningAll()
        .execute();
      return row;
    }
    case 'update': {
      const data = p.data as Record<string, unknown>;
      const [row] = await db
        .updateTable(table)
        .set({ ...data, updated_at: new Date().toISOString() })
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', p.id as string)
        .returningAll()
        .execute();
      if (!row) throw { code: 'NOT_FOUND', message: `${table} record not found` };
      return row;
    }
    case 'delete': {
      await db
        .deleteFrom(table)
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', p.id as string)
        .execute();
      return null;
    }
    default:
      throw { code: 'UNKNOWN_METHOD', message: `Unknown CRUD verb: ${verb} on ${table}` };
  }
}
