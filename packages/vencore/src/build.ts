interface EsbuildPlugin {
  name: string;
  setup(build: any): void;
}

export interface ClientBuildOptions {
  entry?: string;
  outDir?: string;
}

export function reactWindowPlugin(): EsbuildPlugin {
  return {
    name: 'vencore-react-window',
    setup(build) {
      build.onResolve({ filter: /^react$/ }, (args: { path: string }) => ({
        path: args.path,
        namespace: 'vencore-react-window',
      }));

      build.onResolve({ filter: /^react-dom$/ }, (args: { path: string }) => ({
        path: args.path,
        namespace: 'vencore-react-window',
      }));

      build.onLoad(
        { filter: /.*/, namespace: 'vencore-react-window' },
        (args: { path: string }) => {
          if (args.path === 'react') {
            return {
              contents: `
const R = globalThis.React;
export default R;
export const {
  useState, useEffect, useRef, useCallback, useMemo, useContext,
  createContext, Children, Fragment, createElement, forwardRef, memo,
  lazy, Suspense, useReducer, useLayoutEffect, useImperativeHandle,
  useDebugValue, useId, useDeferredValue, useTransition, startTransition,
  cloneElement, isValidElement, createRef, PureComponent, Component,
  StrictMode, version,
} = R;
`,
              loader: 'js' as const,
            };
          }

          if (args.path === 'react-dom') {
            return {
              contents: `
const RD = globalThis.ReactDOM;
export default RD;
export const createPortal = RD?.createPortal;
export const flushSync = RD?.flushSync;
export const createRoot = RD?.createRoot;
export const hydrateRoot = RD?.hydrateRoot;
export const render = RD?.render;
export const unmountComponentAtNode = RD?.unmountComponentAtNode;
`,
              loader: 'js' as const,
            };
          }

          return { contents: '', loader: 'js' as const };
        },
      );
    },
  };
}

export function defineClientBuild(options?: ClientBuildOptions): object {
  return {
    entry: { client: options?.entry ?? 'src/client.tsx' },
    format: ['esm'],
    platform: 'browser',
    bundle: true,
    noExternal: [/(.*)/],
    outDir: options?.outDir ?? 'dist',
    esbuildPlugins: [reactWindowPlugin()],
    esbuildOptions(opts: any) {
      opts.jsx = 'transform';
      opts.jsxFactory = 'React.createElement';
      opts.jsxFragment = 'React.Fragment';
    },
  };
}
