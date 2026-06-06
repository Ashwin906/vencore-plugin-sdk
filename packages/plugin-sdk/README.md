# @vencore/plugin-sdk

The official software development kit for building Vencore plugins.

## Installation

```bash
npm install @vencore/plugin-sdk @vencore/plugin-types
```

## Overview

This SDK provides the necessary utilities, types, and interfaces to seamlessly integrate custom plugins into the Vencore platform. It offers both standard frontend/backend APIs and a React-specific interface for UI development.

## Usage

### Core SDK

For general backend or vanilla JavaScript plugin development:

```typescript
import { createPlugin } from '@vencore/plugin-sdk';

const myPlugin = createPlugin({
  id: 'my-custom-plugin',
  initialize: (context) => {
    // Plugin initialization logic
  }
});
```

### React SDK

For React-based UI integrations:

```typescript
import { usePluginContext } from '@vencore/plugin-sdk/react';

function MyPluginComponent() {
  const context = usePluginContext();
  
  return (
    <div>
      <h1>Plugin Loaded</h1>
    </div>
  );
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
