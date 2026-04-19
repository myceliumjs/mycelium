# Mycelium.js

A lightweight JavaScript framework for building interactive ontological network graphs.

Built on D3.js. Drop in a `data.json` and get a fully functional, navigable, zoomable, searchable graph. Designed for visualizing corporate structures, organizational relationships, and entity networks.

## Installation

### 1. NPM (Recommended)
```bash
npm install @myceliumjs/mycelium
```
```javascript
import '@myceliumjs/mycelium/mycelium.css';
import Mycelium from '@myceliumjs/mycelium';
```

### 2. CDN / Manual
Include the library and its D3.js dependency:
```html
<link rel="stylesheet" href="mycelium.css">
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="mycelium.js"></script>
```

## Quick Start
1. Add a container: `<div id="mycelium"></div>`
2. Initialize:
```javascript
Mycelium.init({
  dataUrl: 'data.json',
  rootNode: 'Acme Corp',
  title: 'My Graph'
});
```

## API Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataUrl` | string | required | Path to the hierarchical JSON data |
| `rootNode` | string | required | The starting node name |
| `title` | string | `''` | Title displayed in the header |
| `subtitle` | string | `''` | Subtitle displayed in the header |
| `logoUrl` | string | `''` | URL for the header icon/logo |
| `containerId` | string | `'mycelium'` | ID of the target DOM element |
| `theme` | object | `{}` | Key-value pairs of CSS variable overrides (e.g., `accent: '#ff0000'`) |
| `layout` | object | `{radiusDesktop: 375, radiusMobile: 200}` | Controls the radial spread |
| `zoom` | object | `{min: 0.3, max: 3}` | Controls viewport constraints |

## License
MIT — © MyceliumJS
