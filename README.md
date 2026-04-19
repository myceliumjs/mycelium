# Mycelium.js

A lightweight JavaScript framework for building interactive ontological network graphs.

Built on D3.js. Drop in a `data.json` and get a fully functional, navigable, zoomable, searchable graph. Designed for visualizing corporate structures, organizational relationships, and entity networks.

## Usage

1. Include the library:
```html
<link rel="stylesheet" href="mycelium.css">
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="mycelium.js"></script>
```

2. Add a container:
```html
<div id="mycelium"></div>
```

3. Initialize:
```javascript
Mycelium.init({
  dataUrl: 'data.json',
  rootNode: 'Root Node Name',
  subtitle: 'Click any node to explore'
});
```

## Data Format

```json
{
  "Root Node": {
    "children": {
      "Child Node": { "relation": "relationship label" },
      "Another Node": { "relation": "another label" }
    }
  },
  "Child Node": {
    "children": {
      "Grandchild": { "relation": "belongs to" }
    }
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| dataUrl | string | required | Path to data.json |
| rootNode | string | required | Name of the root node |
| title | string | '' | Graph title displayed in header |
| subtitle | string | '' | Subtitle displayed under title |
| containerId | string | 'mycelium' | ID of the container element |

## License
MIT — © MyceliumJS
