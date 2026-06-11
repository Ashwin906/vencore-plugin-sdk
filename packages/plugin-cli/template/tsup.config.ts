import { defineClientBuild } from '@vencore/plugin-sdk/build'
import { defineConfig } from 'tsup'

export default [
  defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs'],
    platform: 'node',
    clean: true,
    outDir: 'dist',
  }),
  defineClientBuild({ entry: 'src/client/index.tsx' }),
]
