
// ==========================================
// KNOWLEDGE MAP — FORCE-DIRECTED SVG RENDERER
// ==========================================

window.renderKnowledgeMap = (container, graph) => {
    container.innerHTML = `
        <div id="km-viz-container" style="position:relative; width:100%; height:450px; background:rgba(0,0,0,0.3); border-radius:1rem; border:1px solid var(--border-color); overflow:hidden;"></div>
        <div id="km-drill-panel" style="display:none;margin-top:1.5rem;padding:1.5rem;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:1rem;">
            <h4 id="km-drill-title" style="color:var(--accent);margin-bottom:0.75rem;"></h4>
            <p id="km-drill-desc" style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;"></p>
            <div id="km-drill-content" class="markdown-body" style="font-size:0.9rem;"></div>
        </div>
        <p style="text-align:center;color:var(--text-muted);font-size:0.8rem;margin-top:1rem;">Scroll to zoom, drag to pan, click nodes for deep dive</p>
    `;

    const vizBox = document.getElementById('km-viz-container');
    const width = vizBox.offsetWidth || 500;
    const height = 450;

    const svg = d3.select("#km-viz-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => g.attr("transform", event.transform)));

    const nodes = graph.nodes.map(d => ({ ...d }));
    const links = graph.edges.map(d => ({ source: d.from, target: d.to, label: d.label }));

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
        .attr("stroke", "rgba(255,255,255,0.15)")
        .attr("stroke-width", 1.5)
        .selectAll("line")
        .data(links)
        .join("line");

    const node = g.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", (event, d) => {
            const idx = graph.nodes.findIndex(n => n.id === d.id);
            window.kmDrillNode(idx);
        });

    node.append("circle")
        .attr("r", d => 15 + (d.importance || 3) * 4)
        .attr("fill", "rgba(59, 130, 246, 0.15)")
        .attr("stroke", "var(--accent)")
        .attr("stroke-width", 2);

    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", 0)
        .attr("y", d => (15 + (d.importance || 3) * 4) + 14)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .style("pointer-events", "none")
        .text(d => d.label);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    window._kmGraph = graph;
};

window.kmDrillNode = async (idx) => {
    const graph = window._kmGraph;
    if (!graph) return;
    const node = graph.nodes[idx];
    if (!node) return;
    const panel = document.getElementById('km-drill-panel');
    const title = document.getElementById('km-drill-title');
    const desc = document.getElementById('km-drill-desc');
    const content = document.getElementById('km-drill-content');
    if (!panel) return;
    panel.style.display = 'block';
    title.textContent = `Deep Dive: ${node.label}`;
    desc.textContent = node.description || '';
    content.innerHTML = '<p style="color:var(--text-muted)">Loading AI analysis...</p>';
    try {
        const res = await callGemini([{ text: `Concept: "${node.label}"\nContext: ${node.description || 'Key concept from study material'}\n\nProvide a concise expert-level deep-dive explanation with sub-components, real-world examples, and why this concept matters. Format in clear Markdown.` }], 'Expert knowledge analyst.');
        content.innerHTML = marked.parse(res);
    } catch (e) {
        content.innerHTML = `<p style="color:var(--error)">${e.message}</p>`;
    }
    panel.scrollIntoView({ behavior: 'smooth' });
};

// ==========================================
// REDACTION GAME — AI VALIDATION UPGRADE
// ==========================================

window.validateRedaction = async () => {
    const textPanel = document.getElementById('blur-text-panel');
    const statusEl = document.getElementById('blur-status');
    if (!textPanel) return;

    const words = textPanel.querySelectorAll('.fluff-word');
    const kept = [], deleted = [];
    words.forEach(w => {
        if (w.classList.contains('deleted')) deleted.push(w.textContent);
        else kept.push(w.textContent);
    });

    if (kept.length === 0) return showToast('Nothing left! Keep some words.', 'error');
    const keptText = kept.join(' ');
    const total = words.length;
    const delCount = deleted.length;
    const reductionPct = Math.round((delCount / total) * 100);

    statusEl.textContent = 'Gemini is scoring your redaction...';

    try {
        const fullText = Array.from(words).map(w => w.textContent).join(' ');
        const res = await callGemini([{ text: `ORIGINAL TEXT:\n${fullText}\n\nUSER KEPT:\n${keptText}\n\nUSER DELETED: ${deleted.join(', ')}\n\nEvaluate the user's redaction. Did they keep the core meaning? Did they accidentally delete critical keywords?\n\nReturn ONLY raw JSON: {"score":0-100,"corePreserved":true,"criticalDeleted":["word1","word2"],"feedback":"brief feedback","goldStar":false}` }], 'You are a semantic compression evaluator. A gold star means the user preserved full meaning in 30% fewer words.', null, 'application/json');
        const data = parseJsonSafe(res);

        // Highlight critical deleted words in red
        words.forEach(w => {
            if (w.classList.contains('deleted') && data.criticalDeleted && data.criticalDeleted.some(c => c.toLowerCase() === w.textContent.toLowerCase())) {
                w.style.background = 'rgba(239,68,68,0.3)';
                w.style.color = '#ef4444';
                w.style.textDecoration = 'line-through';
            }
        });

        const scoreColor = data.score >= 80 ? 'var(--success)' : data.score >= 50 ? '#f59e0b' : '#ef4444';
        const scoreEl = document.getElementById('redaction-score');
        if (scoreEl) {
            scoreEl.innerHTML = `
                <div style="font-size:1.5rem;font-weight:800;color:${scoreColor}">
                    ${data.goldStar ? '⭐ GOLD STAR! ' : ''}Reduction: ${reductionPct}% | Score: ${data.score}/100
                </div>
                <div style="font-size:0.9rem;color:var(--text-muted);margin-top:0.5rem;">${data.feedback}</div>
                ${data.criticalDeleted && data.criticalDeleted.length ? `<div style="font-size:0.8rem;color:#ef4444;margin-top:0.5rem;">⚠️ Critical words deleted: ${data.criticalDeleted.join(', ')}</div>` : '<div style="font-size:0.8rem;color:var(--success);margin-top:0.5rem;">✅ No critical concepts lost!</div>'}
            `;
            if (data.goldStar) scoreEl.style.color = 'gold';
        }
        statusEl.textContent = '';
    } catch (e) {
        statusEl.textContent = e.message;
    }
};
