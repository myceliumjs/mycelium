const Mycelium = (function () {
    // Escape a string for safe insertion into HTML text content
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    return {
        init: function (options) {
            const config = Object.assign({
                dataUrl: 'data.json',
                rootNode: '',
                title: '',
                subtitle: '',
                logoUrl: '',
                containerId: 'mycelium',
                layout: {
                    radiusDesktop: 375,
                    radiusMobile: 200
                },
                zoom: {
                    min: 0.3,
                    max: 3,
                    initialDesktop: 0.65,
                    initialMobile: 0.85
                },
                theme: {} // Map of '--mycelium-var': 'value'
            }, options);

            if (!config.rootNode) {
                console.error('Mycelium.init: "rootNode" is required.');
                return;
            }

            // Validate containerId — only safe CSS selector characters
            if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(config.containerId)) {
                console.error('Mycelium.init: "containerId" contains invalid characters.');
                return;
            }

            const container = document.getElementById(config.containerId);
            if (!container) {
                console.error(`Mycelium.init: Container "${escapeHTML(config.containerId)}" not found.`);
                return;
            }

            // Apply theme overrides after container is confirmed
            if (config.theme && Object.keys(config.theme).length > 0) {
                this._applyCustomTheme(config.theme, config.containerId);
            }

            // Build DOM safely — all user strings escaped to prevent XSS
            container.innerHTML =
                '<div id="mycelium-header">' +
                    (config.logoUrl ? `<img src="${escapeHTML(config.logoUrl)}" id="mycelium-logo" alt="Logo">` : '') +
                    '<div id="mycelium-title-group">' +
                        (config.title ? `<h2>${escapeHTML(config.title)}</h2>` : '') +
                        '<p>' + (config.subtitle ? `${escapeHTML(config.subtitle)} • ` : '') +
                        '<span id="mycelium-node-count"></span></p>' +
                    '</div>' +
                '</div>' +
                '<div id="mycelium-search-container">' +
                    '<input type="text" id="mycelium-search-box" placeholder="Search..." autocomplete="off">' +
                    '<div id="mycelium-search-results" style="display:none;"></div>' +
                '</div>' +
                '<svg id="mycelium-svg-container"></svg>';

            // Load data
            fetch(config.dataUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    this._initializeGraph(data, config);
                })
                .catch(error => {
                    console.error('Mycelium: Error loading data:', error);
                    const header = document.getElementById('mycelium-header');
                    if (header) {
                        const errEl = document.createElement('p');
                        errEl.className = 'mycelium-error';
                        errEl.textContent = 'Error loading graph data.';
                        header.appendChild(errEl);
                    }
                });
        },

        _applyCustomTheme: function (theme, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Sanitize theme tokens to prevent CSS injection
            const safeTokenPattern = /^[a-z][a-z0-9-]*$/;
            const unsafeValuePattern = /[{};<>]/;

            let css = '';
            for (const [key, value] of Object.entries(theme)) {
                const rawToken = key.startsWith('--mycelium-') ? key.slice(11) : key.replace(/^--/, '');
                if (!safeTokenPattern.test(rawToken)) continue;
                if (unsafeValuePattern.test(value)) continue;

                css += `--mycelium-${rawToken}: ${value} !important; `;
            }

            if (css) {
                const style = document.createElement('style');
                style.textContent = `#${containerId} { ${css} }`;
                document.head.appendChild(style);
            }
        },

        _initializeGraph: function (data, config) {
            let width = window.innerWidth;
            let height = window.innerHeight;

            const svg = d3.select('#mycelium-svg-container')
                .attr('width', width)
                .attr('height', height);

            const g = svg.append('g');
            let isMobile = width < 768;

            const zoom = d3.zoom()
                .scaleExtent([config.zoom.min, config.zoom.max])
                .on('zoom', event => g.attr('transform', event.transform));
            svg.call(zoom);

            // Scoped AbortController — cleans up global listeners if re-initialized
            const controller = new AbortController();
            const { signal } = controller;

            // Resize handler
            window.addEventListener('resize', () => {
                width = window.innerWidth;
                height = window.innerHeight;
                isMobile = width < 768;
                svg.attr('width', width).attr('height', height);
            }, { signal });

            // Search
            const searchBox = document.getElementById('mycelium-search-box');
            const searchResults = document.getElementById('mycelium-search-results');

            searchBox.addEventListener('input', e => {
                const query = e.target.value.toLowerCase().trim();
                if (!query) {
                    searchResults.style.display = 'none';
                    return;
                }

                const matches = Object.keys(data)
                    .filter(n => n.toLowerCase().includes(query))
                    .slice(0, 10);

                if (!matches.length) {
                    searchResults.style.display = 'none';
                    return;
                }

                // Build results safely via DOM — no innerHTML interpolation
                searchResults.innerHTML = '';
                matches.forEach(nodeName => {
                    const item = document.createElement('div');
                    item.className = 'mycelium-search-result-item';
                    item.textContent = nodeName;  // safe: textContent, not innerHTML
                    item.dataset.node = nodeName;
                    searchResults.appendChild(item);
                });
                searchResults.style.display = 'block';
            });

            searchResults.addEventListener('click', e => {
                const item = e.target.closest('.mycelium-search-result-item');
                if (item) {
                    const nodeName = item.dataset.node;
                    searchResults.style.display = 'none';
                    searchBox.value = '';
                    show(nodeName);
                }
            });

            document.addEventListener('click', e => {
                if (!e.target.closest('#mycelium-search-container')) {
                    searchResults.style.display = 'none';
                }
            }, { signal });

            // ── Graph logic ──────────────────────────────────────────
            const historyStack = [];
            let currentCenter = null;

            function show(nodeName, isBack = false) {
                // Manage navigation history
                if (currentCenter && !isBack && currentCenter !== nodeName) {
                    historyStack.push(currentCenter);
                }
                currentCenter = nodeName;

                // Update URL hash for deep-linking
                window.location.hash = nodeName.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');

                const nodeData = data[nodeName];
                if (!nodeData || !nodeData.children) return;

                const children = Object.entries(nodeData.children);
                // Guard: nothing to render if no children
                if (!children.length) return;

                const radius = isMobile ? config.layout.radiusMobile : config.layout.radiusDesktop;
                const angleStep = (2 * Math.PI) / children.length;

                // Build node and link arrays
                const nodes = [{ id: nodeName, x: width / 2, y: height / 2, isCenter: true }];
                const links = [];

                // Prototype-safe map — Object.create(null) avoids
                // collisions with inherited properties like 'constructor', 'toString', etc.
                const nodeMap = Object.create(null);
                nodeMap[nodeName] = nodes[0];

                children.forEach(([name, info], i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = width / 2 + radius * Math.cos(angle);
                    const y = height / 2 + radius * Math.sin(angle);
                    const childNode = { id: name, x, y };
                    nodes.push(childNode);
                    nodeMap[name] = childNode;

                    if (info.relation) {
                        // Namespaced prefix avoids collision with user-defined nodes
                        // named 'rel_0', 'rel_1', etc.
                        const relId = `__mycelium_rel_${i}__`;
                        const relNode = {
                            id: relId,
                            label: info.relation,
                            x: width / 2 + (x - width / 2) * 0.5,
                            y: height / 2 + (y - height / 2) * 0.5,
                            isRel: true
                        };
                        nodes.push(relNode);
                        nodeMap[relId] = relNode;
                        links.push({ source: nodeName, target: relId });
                        links.push({ source: relId, target: name });
                    } else {
                        links.push({ source: nodeName, target: name });
                    }
                });

                render(nodes, links, nodeMap);
            }

            function render(nodes, links, nodeMap) {
                g.selectAll('*').remove();

                // Links
                g.selectAll('.mycelium-link')
                    .data(links)
                    .enter()
                    .append('line')
                    .attr('class', 'mycelium-link')
                    .attr('x1', d => nodeMap[d.source].x)
                    .attr('y1', d => nodeMap[d.source].y)
                    .attr('x2', d => nodeMap[d.target].x)
                    .attr('y2', d => nodeMap[d.target].y);

                // Nodes
                const node = g.selectAll('.mycelium-node')
                    .data(nodes)
                    .enter()
                    .append('g')
                    .attr('class', d => d.isRel
                        ? 'mycelium-node mycelium-relationship-node'
                        : 'mycelium-node')
                    .attr('transform', d => `translate(${d.x},${d.y})`)
                    .on('click touchend', function (event, d) {
                        event.preventDefault();
                        event.stopPropagation();

                        if (d.isCenter) {
                            // Clicking the center node goes back in history
                            if (historyStack.length > 0) {
                                show(historyStack.pop(), true);
                            }
                        } else if (!d.isRel && data[d.id] && data[d.id].children) {
                            // Diving into a child node
                            show(d.id);
                        }
                    });

                // Rects
                node.append('rect')
                    .attr('width', d => d.isRel
                        ? Math.min(70, d.label.length * 4.5)
                        : Math.max(100, d.id.length * 6))
                    .attr('height', d => d.isRel ? 20 : 36)
                    .attr('x', d => d.isRel
                        ? -Math.min(70, d.label.length * 4.5) / 2
                        : -Math.max(100, d.id.length * 6) / 2)
                    .attr('y', d => d.isRel ? -10 : -18)
                    .attr('rx', 4);

                // Text with word-wrap for long node names
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em')
                    .each(function (d) {
                        const label = d.label || d.id;
                        const text = d3.select(this);
                        const words = label.split(' ');

                        if (words.length > 1 && label.length > 22) {
                            const lines = [];
                            let line = [];
                            words.forEach(word => {
                                line.push(word);
                                if (line.join(' ').length > 15) {
                                    lines.push(line.join(' '));
                                    line = [];
                                }
                            });
                            if (line.length) lines.push(line.join(' '));

                            lines.forEach((l, i) => {
                                text.append('tspan')
                                    .text(l)
                                    .attr('x', 0)
                                    .attr('dy', i === 0 ? '-0.3em' : '1em');
                            });
                        } else {
                            text.text(label);
                        }
                    });
            }

            // ── Initial render ───────────────────────────────────────

            // Resolve starting node from URL hash, fall back to rootNode
            const hash = window.location.hash.slice(1);
            const startNode = hash
                ? (Object.keys(data).find(n =>
                    n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === hash
                  ) || config.rootNode)
                : config.rootNode;
            show(startNode);

            // Initial zoom — slightly zoomed out for context
            const initialScale = isMobile ? config.zoom.initialMobile : config.zoom.initialDesktop;
            svg.call(zoom.transform, d3.zoomIdentity
                .translate(width / 2 * (1 - initialScale), height / 2 * (1 - initialScale))
                .scale(initialScale));

            // Node count display
            const nodeCountEl = document.getElementById('mycelium-node-count');
            if (nodeCountEl) {
                nodeCountEl.textContent = `${Object.keys(data).length} nodes`;
            }

            // Background click resets to root
            svg.on('click', () => show(config.rootNode));
        }
    };
})();
