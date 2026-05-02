# Mycelium.js 🍄

**Mycelium.js** is a lightweight, production-ready JavaScript component for building interactive ontological network graphs. 

Built on **D3.js**, it allows you to drop in a hierarchical `data.json` and instantly get a fully functional, navigable, and searchable graph. It is specifically designed for visualizing complex organizational structures, entity networks, and knowledge graphs.

---

## Features

*   **Radial Navigation Engine**: Intuitive exploration of hierarchical data with automatic centering.
*   **Navigation History**: Robust state tracking allows "Back" navigation by clicking the center node.
*   **Secure by Design**: Built-in XSS mitigation and CSS injection protection for safe rendering of user-provided data.
*   **Fully Customizable**: Comprehensive theme support via CSS Variables and a dynamic JavaScript API.
*   **Searchable**: Integrated search engine for quickly finding specific nodes in large networks.
*   **Responsive**: Adaptive layout engine for optimal performance on Desktop and Mobile.
*   **Smart Layout**: Automatic radius expansion and smart auto-fit camera centering.

---

## Getting Started

### NPM (Recommended)
```bash
npm install @myceliumjs/mycelium
```
```javascript
import '@myceliumjs/mycelium/mycelium.css';
import Mycelium from '@myceliumjs/mycelium';

Mycelium.init({
  dataUrl: 'data.json',
  rootNode: 'Acme Corp'
});
```

### CDN / Manual
Include the component and its D3.js dependency directly in your HTML:
```html
<!-- Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@myceliumjs/mycelium/mycelium.css">

<!-- Dependencies -->
<script src="https://d3js.org/d3.v7.min.js"></script>

<!-- Component -->
<script src="https://cdn.jsdelivr.net/npm/@myceliumjs/mycelium/mycelium.js"></script>
```

---

## API Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataUrl` | string | **required** | Path to the hierarchical JSON data file. |
| `rootNode` | string | **required** | The name of the node that will be centered on load. |
| `title` | string | `''` | Main title displayed in the header. |
| `subtitle` | string | `''` | Subtitle displayed in the header. |
| `logoUrl` | string | `''` | URL for the optional header icon/logo. |
| `containerId` | string | `'mycelium'` | ID of the target DOM element. |
| `theme` | object | `{}` | Key-value pairs for CSS variable overrides. |
| `layout` | object | `{radiusDesktop: 375, radiusMobile: 200, smartExpand: true}` | Controls the radial spread, features dynamic scaling for high-density nodes. |
| `zoom` | object | `{min: 0.15, max: 3, smartFit: true}` | Controls viewport constraints, features auto-fit framing. |

### Theme Customization
You can customize the look using the `theme` object:
```javascript
theme: {
  accent: '#A98EF5',       // Orbital Purple accent
  'node-bg': '#1f2937',    // Node background
  'bg-dark': '#030712'     // App background
}
```

---

## Ecosystem

*   **[Official Website & Documentation](https://myceliumjs.org)**: The official Mycelium.js project homepage.
*   **[Mycelium Demo / Starter Kit](https://github.com/yerettexyz/mycelium-demo)**: A standalone boilerplate to get you up and running in seconds.
*   **[Live Demo](https://demo.myceliumjs.org)**: See Mycelium.js in action on the web.

---

## License
MIT
