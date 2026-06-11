import { defineClientBuild } from '@vencore/plugin-sdk/build'

export default defineClientBuild({
  server: 'src/index.ts',
  client: 'src/client/index.tsx',
})
