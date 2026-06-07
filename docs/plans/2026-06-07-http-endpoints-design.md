# Custom HTTP Endpoints for Plugins

## Goal
Allow plugins in `@vencore/plugin-sdk` to expose custom HTTP endpoints. This enables plugins to:
1. Receive webhooks from third-party services (e.g., Stripe, GitHub).
2. Serve custom REST APIs for their frontend surfaces.
3. Handle dynamic paths and parameters.

## Design

### 1. Manifest Additions (Declarative Routes)
Plugins will declare their custom endpoints in `plugin.json` (the manifest). This provides a security boundary and allows the host application to know all routes upon installation for discoverability and routing.

```typescript
export interface PluginEndpointDef {
  path: string;       // e.g., "/webhooks/:provider" or "/api/custom/*"
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'ALL';
  auth?: boolean;     // defaults to true (requires user session), set false for public webhooks
}

export interface PluginManifest {
  // ... existing fields
  endpoints?: PluginEndpointDef[];
}
```

### 2. Backend SDK Interface (`vencore.http.onEndpoint`)
The plugin SDK will expose `vencore.http.onEndpoint` to let the plugin attach handler logic to the declared routes.

```typescript
export interface PluginHttpRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null; 
  params: Record<string, string>; // Extracted from dynamic paths like /webhooks/:provider
}

export interface PluginHttpResponse {
  status?: number; 
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
}

export interface VencoreBackendAPI {
  // ...
  http: {
    fetch(url: string, options?: HttpFetchOptions): Promise<HttpResponse>;
    onEndpoint(
      path: string, 
      handler: (req: PluginHttpRequest) => Promise<PluginHttpResponse> | PluginHttpResponse
    ): void;
  };
}
```

### 3. Internal Implementation (Bridge)
1.  **SDK Side:** `VencoreBackendImpl` will store endpoint handlers in an internal map, similar to how it stores event hooks via `_hookHandlers`.
2.  **Dispatch:** We will add a new internal method (e.g., `_dispatchHttpEndpoint`) that the host application will call when an HTTP request matching the plugin's namespace comes in.
3.  **Path Matching:** We can use a lightweight path matching library (like `path-to-regexp` if it's not already a dependency, or a simple regex-based implementation) inside the host or SDK to extract the `params` from dynamic routes.

## Trade-offs
-   **Pros:** Security and API discoverability (manifest). High flexibility with dynamic path variables for plugin authors.
-   **Cons:** Requires the developer to keep `plugin.json` paths and `onEndpoint()` paths in sync.
