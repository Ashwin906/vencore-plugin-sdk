# Plugin React Component ESM Resolution Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fix the plugin client bundle loading failure by injecting an import map into the web dashboard and serving the SDK React package from the backend API.

**Architecture:** We will add a `<script type="importmap">` to Next.js `layout.tsx` to map `react`, `react-dom`, and `@vencore/plugin-sdk/react`. We will add a route to the backend API `v1/plugins.ts` to serve the `@vencore/plugin-sdk/react` distribution file.

**Tech Stack:** Next.js, Express, React, ESM.

---

### Task 1: Add Import Map to Next.js Root Layout

**Files:**
- Modify: `d:/Projects/VencoreRepos/vencore-platform/apps/web/app/layout.tsx`

**Step 1: Add the import map script**

Modify `layout.tsx` to include the `<script type="importmap">` before any children render inside the `<body>` (or `<head>` if we add a `<head>` tag). 

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const importMap = {
    imports: {
      "react": "https://esm.sh/react@19",
      "react-dom": "https://esm.sh/react-dom@19",
      "@vencore/plugin-sdk/react": process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/v1/plugins/sdk/react` 
        : "http://localhost:4001/v1/plugins/sdk/react"
    }
  };

  const importMapScript = (
    <script
      type="importmap"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(importMap) }}
    />
  );

  if (hasClerk) {
    return (
      <ClerkProvider>
        <html lang="en">
          <head>{importMapScript}</head>
          <body>{children}</body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en">
      <head>{importMapScript}</head>
      <body>{children}</body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "fix(web): add import map for native ESM plugin evaluation"
```

### Task 2: Install SDK to Backend API

**Files:**
- Modify: `d:/Projects/VencoreRepos/vencore-platform/apps/api/package.json`

**Step 1: Add SDK dependency**

Run:
```bash
pnpm add @vencore/plugin-sdk@latest --filter @vencore-platform/api
```

**Step 2: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add @vencore/plugin-sdk for serving client bundles"
```

### Task 3: Serve SDK from Backend API

**Files:**
- Modify: `d:/Projects/VencoreRepos/vencore-platform/apps/api/src/routes/v1/plugins.ts`

**Step 1: Add the route to serve the React module**

In `plugins.ts`, add the route to serve the ESM bundle for `@vencore/plugin-sdk/react`:

```typescript
import path from 'path';

// ... existing code ...

// Serve the @vencore/plugin-sdk/react ESM build to the browser
pluginsRouter.get('/sdk/react', (_req, res) => {
  try {
    // Resolve the path to the installed plugin-sdk react distribution
    const sdkPath = require.resolve('@vencore/plugin-sdk/react');
    // require.resolve might point to the CJS or main index, so we explicitly resolve the dist/react.mjs file
    const reactMjsPath = path.join(path.dirname(require.resolve('@vencore/plugin-sdk/package.json')), 'dist', 'react.mjs');
    
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(reactMjsPath);
  } catch (err) {
    res.status(500).json({ error: 'Could not resolve SDK distribution' });
  }
});
```

**Step 2: Commit**

```bash
git add apps/api/src/routes/v1/plugins.ts
git commit -m "feat(api): serve @vencore/plugin-sdk/react esm bundle"
```
