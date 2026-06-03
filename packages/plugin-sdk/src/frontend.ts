// TODO: update in Task 12 (frontend SDK) — PermittedVantageFrontend and
// FrontendPluginDefinition will be reintroduced as part of the frontend rewrite.
import type {
  PluginContext,
} from '@vantage/plugin-types';
import { VantageBackendImpl } from './backend';
import { createPostMessageBridge } from './bridge';
import { setVantageInstance } from './_store';
import type { ModalNamespace } from './permissions';

export class VantageFrontendImpl extends VantageBackendImpl {
  private _context: PluginContext | null = null;
  private _contextResolvers: Array<(ctx: PluginContext) => void> = [];
  private _contextRejectors: Array<(err: Error) => void> = [];
  private _contextTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly _modal!: ModalNamespace;

  constructor() {
    super(createPostMessageBridge());

    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'sdk:init' && event.data?.payload?.context) {
          const ctx = event.data.payload.context as PluginContext;
          this._context = ctx;
          if (this._contextTimer !== null) {
            clearTimeout(this._contextTimer);
            this._contextTimer = null;
          }
          for (const resolve of this._contextResolvers) resolve(ctx);
          this._contextResolvers = [];
          this._contextRejectors = [];
        }
      }, { once: true });
    }

    this._modal = {
      open: (opts: { title: string; content?: string }) =>
        this._call<void>('modal.open', opts),
      close: () =>
        this._call<void>('modal.close', {}),
    };
  }

  /**
   * Resolves when the host sends sdk:init with a PluginContext.
   * Rejects after 3 seconds with a clear error message.
   */
  getContext(): Promise<PluginContext> {
    if (this._context) return Promise.resolve(this._context);

    return new Promise<PluginContext>((resolve, reject) => {
      this._contextResolvers.push(resolve);
      this._contextRejectors.push(reject);

      if (this._contextTimer === null) {
        this._contextTimer = setTimeout(() => {
          const err = new Error(
            '[plugin-sdk] sdk:init timeout — PluginContext not received within 3000ms. ' +
            'Check that the host sent { type: "sdk:init", payload: { context } } after iframe load.',
          );
          for (const reject of this._contextRejectors) reject(err);
          this._contextResolvers = [];
          this._contextRejectors = [];
        }, 3000);
      }
    });
  }

  navigate(path: string): void {
    if (typeof window !== 'undefined') {
      if (window.parent === window) {
        console.warn('[plugin-sdk] navigate() called outside of an iframe — no-op.');
        return;
      }
      window.parent.postMessage({ type: 'sdk:navigate', payload: { path } }, '*');
    }
  }

  get modal(): ModalNamespace {
    return this._modal;
  }

  /**
   * Frontend on() listens for host-dispatched events via postMessage.
   * Handlers are synchronous (host fires and forgets).
   * Returns a cleanup function to remove the listener.
   */
  on(event: string, handler: (payload: unknown) => void): () => void {
    const wrapper = (e: MessageEvent) => {
      if (e.data?.type === 'sdk:event' && e.data?.event === event) {
        handler(e.data.payload);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('message', wrapper);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', wrapper);
      }
    };
  }
}

/**
 * createPlugin (frontend) — runs in the plugin iframe on load.
 * Creates the vantage instance, registers it as the singleton for hooks,
 * then calls setup(). Side-effectful by design.
 * TODO: update in Task 12 (frontend SDK) — restore typed setup signature.
 */
export function createPlugin(config: {
  setup(vantage: VantageFrontendImpl): void | Promise<void>;
}): void {
  const vantage = new VantageFrontendImpl();
  setVantageInstance(vantage);
  Promise.resolve(config.setup(vantage)).catch((err: unknown) => {
    console.error('[plugin-sdk] setup() error:', err);
  });
}
