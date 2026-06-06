# Plugin React Component ESM Resolution Design

## Overview
The Vencore web dashboard currently fails to load plugin client bundles because native browser ESM evaluation (`eval('import(...)')`) does not support bare module specifiers like `react` or `@vencore/plugin-sdk/react`.

This design outlines the approach to resolve this using a native browser `<script type="importmap">`.

## Architecture
We will use **Approach A: Import Maps**. This is the native, standards-compliant way to resolve bare specifiers in the browser, keeping our `esbuild` configuration standard while allowing plugins to cleanly share the `react` dependency.

### 1. Next.js App: Adding the Import Map
We will add an `<script type="importmap">` to the `<head>` of the Vencore web dashboard (e.g., `apps/web/app/layout.tsx`).

This import map instructs the browser to resolve the bare specifiers:
```html
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom": "https://esm.sh/react-dom@19",
      "@vencore/plugin-sdk/react": "/api/plugins/sdk/react" 
    }
  }
</script>
```

### 2. Backend API: Serving the SDK
Since the import map points `@vencore/plugin-sdk/react` to our API, we need a new route in the backend (e.g., `apps/api/src/routes/plugins.ts`).

This endpoint will:
1. Locate the compiled ESM build of the SDK's React module (`node_modules/@vencore/plugin-sdk/dist/react.mjs`).
2. Serve the file contents to the client with the `Content-Type: application/javascript` header.

## Benefits
- Native standard approach.
- Zero complex esbuild plugins or global namespace polluting (`window.React`).
- Browser efficiently caches React from the CDN.
