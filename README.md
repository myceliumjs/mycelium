# Mycelium.js 🍄

**Mycelium.js** is a lightweight, production-ready JavaScript framework for building interactive ontological network graphs. 

Built on **D3.js**, it allows you to drop in a hierarchical `data.json` and instantly get a fully functional, navigable, and searchable graph. It is specifically designed for visualizing complex organizational structures, entity networks, and knowledge graphs.

---

## ✨ Features

*   **Radial Navigation Engine**: Intuitive exploration of hierarchical data with automatic centering.
*   **Navigation History**: Robust state tracking allows "Back" navigation by clicking the center node.
*   **Secure by Design**: Built-in XSS mitigation and CSS injection protection for safe rendering of user-provided data.
*   **Fully Customizable**: Comprehensive theme support via CSS Variables and a dynamic JavaScript API.
*   **Searchable**: Integrated search engine for quickly finding specific nodes in large networks.
*   **Responsive**: Adaptive layout engine for optimal performance on Desktop and Mobile.

---

## 🚀 Getting Started

### 📦 NPM (Recommended)
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

### 🌐 CDN / Manual
Include the library and its D3.js dependency directly in your HTML:
```html
<!-- Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@myceliumjs/mycelium/mycelium.css">

<!-- Dependencies -->
<script src="https://d3js.org/d3.v7.min.js"></script>

<!-- Framework -->
<script src="https://cdn.jsdelivr.net/npm/@myceliumjs/mycelium/mycelium.js"></script>
```

---

## 🛠️ API Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataUrl` | string | **required** | Path to the hierarchical JSON data file. |
| `rootNode` | string | **required** | The name of the node that will be centered on load. |
| `title` | string | `''` | Main title displayed in the header. |
| `subtitle` | string | `''` | Subtitle displayed in the header. |
| `logoUrl` | string | `''` | URL for the optional header icon/logo. |
| `containerId` | string | `'mycelium'` | ID of the target DOM element. |
| `theme` | object | `{}` | Key-value pairs for CSS variable overrides. |
| `layout` | object | `{radiusDesktop: 375, radiusMobile: 200}` | Controls the radial spread. |
| `zoom` | object | `{min: 0.3, max: 3}` | Controls viewport constraints. |

### Theme Customization
You can customize the look using the `theme` object:
```javascript
theme: {
  accent: '#10b981',       // Main actionable color
  'node-bg': '#1f2937',    // Node background
  'bg-dark': '#030712'     // App background
}
```

---

## 🧩 Ecosystem

*   **[Mycelium Demo / Starter Kit](https://github.com/myceliumjs/mycelium-demo)**: A standalone boilerplate to get you up and running in seconds.
*   **[Live Demo](https://mycelium-example.pages.dev)**: See Mycelium.js in action on Cloudflare.

---

## ⚖️ License
MIT — © 2026 [MyceliumJS](https://github.com/myceliumjs)
