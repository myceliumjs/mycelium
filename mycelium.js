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
            // Deep merge options securely to protect default nested toggles if partially overridden by user
            const config = {
                dataUrl: options.dataUrl || 'data.json',
                rootNode: options.rootNode || '',
                title: options.title || '',
                subtitle: options.subtitle || '',
                logoUrl: options.logoUrl || '',
                containerId: options.containerId || 'mycelium',
                layout: Object.assign({
                    radiusDesktop: 375,
                    radiusMobile: 200,
                    smartExpand: true
                }, options.layout || {}),
                zoom: Object.assign({
                    min: 0.15,
                    max: 3,
                    initialDesktop: 0.65,
                    initialMobile: 0.85,
                    smartFit: true
                }, options.zoom || {}),
                theme: options.theme || {}
            };

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

                const baseRadius = isMobile ? config.layout.radiusMobile : config.layout.radiusDesktop;
                
                let radius = baseRadius;
                if (config.layout.smartExpand) {
                    // Smart Radius Expansion: organically scale the radius outwards if there are too many children
                    // to prevent relationship tags from overlapping on the inner ring.
                    // An arc separation of ~135px is required to comfortably fit max-width tags vertically and horizontally.
                    const minRequiredRadius = (135 * children.length) / Math.PI;
                    radius = Math.max(baseRadius, minRequiredRadius);
                }
                
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
                            // Push relationship tags further outward (65% instead of 50%)
                            // because the outer circumference provides vastly more space to prevent overlaps.
                            x: width / 2 + (x - width / 2) * 0.65,
                            y: height / 2 + (y - height / 2) * 0.65,
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

                // Smart auto-fit zooming: transition viewport smoothly to frame dense networks perfectly without user interaction
                if (config.zoom.smartFit) {
                    // Pad the radius calculations since text rectangles stick far out past the pure radial point
                    const paddedRadius = radius + 150; 
                    const maxScale = isMobile ? config.zoom.initialMobile : config.zoom.initialDesktop;
                    // Mathematically guarantee the entire padded diameter fits within the smallest screen axis
                    const fitScale = Math.min(width, height) / (2 * paddedRadius);
                    const finalScale = Math.min(fitScale, maxScale); // Prevent zooming in too close on small node counts

                    svg.transition().duration(750)
                       .call(zoom.transform, d3.zoomIdentity
                           .translate(width / 2 * (1 - finalScale), height / 2 * (1 - finalScale))
                           .scale(finalScale));
                }
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

                // Rects (rendered first but sized after text measurement)
                node.append('rect')
                    .attr('rx', 4);

                // Text with word-wrap for long node names
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em')
                    .each(function (d) {
                        const label = d.label || d.id;
                        const text = d3.select(this);
                        const words = label.split(' ');

                        // Increase max width for relationships so text wraps wider instead of taller,
                        // heavily reducing the chance of vertical overlaps between adjacent tags.
                        const maxWidth = d.isRel ? 110 : 140; // Max width in pixels

                        if (words.length > 1) {
                            text.text(null);
                            let line = [];
                            let tspan = text.append('tspan').attr('x', 0).attr('y', 0);
                            const spans = [tspan];

                            words.forEach(word => {
                                line.push(word);
                                tspan.text(line.join(' '));
                                // If adding the word exceeds pixel width, push to new line
                                if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
                                    line.pop(); // Remove the word that broke the limit
                                    tspan.text(line.join(' ')); // Finalize current line
                                    line = [word]; // Start new line with the word
                                    tspan = text.append('tspan').attr('x', 0).attr('y', 0).text(word);
                                    spans.push(tspan);
                                }
                            });

                            // Center the entire block vertically based on total number of lines
                            const lineHeight = 1.2; // ems
                            const shiftOffset = -(spans.length - 1) * lineHeight / 2;
                            spans.forEach((s, i) => {
                                // Since y=0 anchors all to the same baseline, dy acts as an absolute offset!
                                s.attr('dy', (shiftOffset + (i * lineHeight)) + 'em');
                            });
                        } else {
                            text.text(label);
                        }

                        // Two-pass approach: Measure the rendered text and size the rect around it
                        const bbox = this.getBBox();
                        // Drastically increase padding to guarantee no text kerning/styling escapes the box
                        const paddingX = d.isRel ? 24 : 40;
                        const paddingY = d.isRel ? 14 : 24;

                        const minW = d.isRel ? 50 : 100;
                        const minH = d.isRel ? 20 : 36;

                        const finalW = Math.max(minW, bbox.width + paddingX);
                        const finalH = Math.max(minH, bbox.height + paddingY);

                        // True vertical centering calculation (handles clamping bias)
                        const finalY = bbox.y - (finalH - bbox.height) / 2;

                        // Find the sibling rect inside this node group
                        d3.select(this.previousSibling)
                            .attr('width', finalW)
                            .attr('height', finalH)
                            .attr('x', -finalW / 2)
                            .attr('y', finalY);
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
            // Initialize the base geometric scale BEFORE rendering the hash route
            // so dynamic smart scaling can calculate delta from root correctly.
            const initialScale = isMobile ? config.zoom.initialMobile : config.zoom.initialDesktop;
            svg.call(zoom.transform, d3.zoomIdentity
                .translate(width / 2 * (1 - initialScale), height / 2 * (1 - initialScale))
                .scale(initialScale));

            show(startNode);

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
