import { describe, it, expect } from 'vitest';
import { reactWindowPlugin, defineClientBuild } from '../build';

type MockLoadResult = { contents: string; loader: string };
type MockResolveResult = { path: string; namespace: string };

function createMockBuild() {
  const resolveHandlers: Array<{
    filter: RegExp;
    handler: (args: { path: string }) => MockResolveResult;
  }> = [];
  const loadHandlers: Array<{
    filter: RegExp;
    namespace: string;
    handler: (args: { path: string }) => MockLoadResult;
  }> = [];

  return {
    build: {
      onResolve(
        opts: { filter: RegExp },
        handler: (args: { path: string }) => MockResolveResult,
      ) {
        resolveHandlers.push({ filter: opts.filter, handler });
      },
      onLoad(
        opts: { filter: RegExp; namespace: string },
        handler: (args: { path: string }) => MockLoadResult,
      ) {
        loadHandlers.push({ filter: opts.filter, namespace: opts.namespace, handler });
      },
    },
    resolveHandlers,
    loadHandlers,
  };
}

describe('reactWindowPlugin — name', () => {
  it('has correct plugin name', () => {
    expect(reactWindowPlugin().name).toBe('vencore-react-window');
  });
});

describe('reactWindowPlugin — react resolve', () => {
  it('resolves "react" to vencore-react-window namespace', () => {
    const { build, resolveHandlers } = createMockBuild();
    reactWindowPlugin().setup(build as any);

    const handler = resolveHandlers.find(h => h.filter.test('react'));
    expect(handler).toBeDefined();
    const result = handler!.handler({ path: 'react' });
    expect(result.namespace).toBe('vencore-react-window');
  });

  it('resolves "react-dom" to vencore-react-window namespace', () => {
    const { build, resolveHandlers } = createMockBuild();
    reactWindowPlugin().setup(build as any);

    const handler = resolveHandlers.find(h => h.filter.test('react-dom'));
    expect(handler).toBeDefined();
    const result = handler!.handler({ path: 'react-dom' });
    expect(result.namespace).toBe('vencore-react-window');
  });
});

describe('reactWindowPlugin — react load shim', () => {
  it('returns globalThis.React shim for react module', () => {
    const { build, loadHandlers } = createMockBuild();
    reactWindowPlugin().setup(build as any);

    const handler = loadHandlers.find(h => h.namespace === 'vencore-react-window');
    expect(handler).toBeDefined();
    const result = handler!.handler({ path: 'react' });
    expect(result.contents).toContain('globalThis.React');
    expect(result.contents).toContain('export default');
    expect(result.contents).toContain('useState');
    expect(result.contents).toContain('useEffect');
    expect(result.loader).toBe('js');
  });

  it('returns globalThis.ReactDOM shim for react-dom module', () => {
    const { build, loadHandlers } = createMockBuild();
    reactWindowPlugin().setup(build as any);

    const handler = loadHandlers.find(h => h.namespace === 'vencore-react-window');
    expect(handler).toBeDefined();
    const result = handler!.handler({ path: 'react-dom' });
    expect(result.contents).toContain('globalThis.ReactDOM');
    expect(result.contents).toContain('createRoot');
    expect(result.loader).toBe('js');
  });
});

describe('defineClientBuild', () => {
  it('returns ESM format', () => {
    const config = defineClientBuild() as any;
    expect(config.format).toEqual(['esm']);
  });

  it('defaults entry to src/client.tsx', () => {
    const config = defineClientBuild() as any;
    expect(config.entry).toEqual({ client: 'src/client.tsx' });
  });

  it('accepts custom entry', () => {
    const config = defineClientBuild({ entry: 'src/panel.tsx' }) as any;
    expect(config.entry).toEqual({ client: 'src/panel.tsx' });
  });

  it('defaults outDir to dist', () => {
    const config = defineClientBuild() as any;
    expect(config.outDir).toBe('dist');
  });

  it('accepts custom outDir', () => {
    const config = defineClientBuild({ outDir: 'build' }) as any;
    expect(config.outDir).toBe('build');
  });

  it('esbuildOptions sets classic JSX transform', () => {
    const config = defineClientBuild() as any;
    const opts: any = { plugins: [] };
    config.esbuildOptions(opts);
    expect(opts.jsx).toBe('transform');
    expect(opts.jsxFactory).toBe('React.createElement');
    expect(opts.jsxFragment).toBe('React.Fragment');
  });

  it('esbuildOptions injects vencore-react-window plugin', () => {
    const config = defineClientBuild() as any;
    const opts: any = { plugins: [] };
    config.esbuildOptions(opts);
    const names = (opts.plugins as any[]).map(p => p.name);
    expect(names).toContain('vencore-react-window');
  });

  it('esbuildOptions preserves existing esbuild plugins', () => {
    const config = defineClientBuild() as any;
    const existingPlugin = { name: 'my-plugin', setup: () => {} };
    const opts: any = { plugins: [existingPlugin] };
    config.esbuildOptions(opts);
    const names = (opts.plugins as any[]).map(p => p.name);
    expect(names).toContain('my-plugin');
    expect(names).toContain('vencore-react-window');
  });
});
