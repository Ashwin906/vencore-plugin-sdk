import { defineConfig } from 'tsup';

export default defineConfig([
  // ── Library entries: SDK + types ──────────────────────────────────────────
  // Consumed by plugins via `vencore`, `vencore/backend`, `vencore/react`, etc.
  {
    entry: [
      'src/index.ts',
      'src/backend.ts',
      'src/frontend.ts',
      'src/react.ts',
      'src/build.ts',
      'src/bridge.ts',
      'src/types.ts',
    ],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['react', 'react-dom'],
  },
  // ── CLI entry: the `vencore` bin ──────────────────────────────────────────
  // Third-party deps are bundled (noExternal) so the published package needs
  // zero runtime dependencies — plugins that depend on `vencore` stay lean.
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['cjs'],
    platform: 'node',
    dts: false,
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
    noExternal: ['archiver', 'chalk', 'commander'],
  },
]);
