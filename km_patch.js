
// ==========================================
// KNOWLEDGE MAP — FORCE-DIRECTED SVG RENDERER
// ==========================================

window.renderKnowledgeMap = (container, graph) => {
    const W = container.offsetWidth || 800;
    const H = 500;
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    // Simple force-directed layout: iterative relaxation
    nodes.forEach((n, i) => {
        n.x = W / 2 + (Math.cos(i / nodes.length * Math.PI * 2) * W * 0.35);
        n.y = H / 2 + (Math.sin(i / nodes.length * Math.PI * 2) * H * 0.35);
        n.vx = 0; n.vy = 0;
        n.r = 18 + (n.importance || 3) * 5;
    });

    // Run 80 iterations of force simulation
    for (let iter = 0; iter < 80; iter++) {
        // Repulsion
        nodes.forEach(a => {
            nodes.forEach(b => {
                if (a === b) return;
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = 4000 / (dist * dist);
                a.vx += (dx / dist) * force;
                a.vy += (dy / dist) * force;
            });
        });
        // Attraction along edges
        edges.forEach(e => {
            const a = nodes.find(n => n.id === e.from);
            const b = nodes.find(n => n.id === e.to);
            if (!a || !b) return;
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 150) * 0.03;
            a.vx += (dx / dist) * force;
            a.vy += (dy / dist) * force;
            b.vx -= (dx / dist) * force;
            b.vy -= (dy / dist) * force;
        });
        // Apply velocity with damping and bounds
        nodes.forEach(n => {
            n.x = Math.max(n.r, Math.min(W - n.r, n.x + n.vx * 0.1));
            n.y = Math.max(n.r, Math.min(H - n.r, n.y + n.vy * 0.1));
            n.vx *= 0.8; n.vy *= 0.8;
        });
    }

    const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];

    const svgEdges = edges.map(e => {
        const a = nodes.find(n => n.id === e.from);
        const b = nodes.find(n => n.id === e.to);
        if (!a || !b) return '';
        const edgeColor = e.type === 'conflict' ? '#ef4444' : 'rgba(255,255,255,0.2)';
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2 - 15;
        return `
            <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${edgeColor}" stroke-width="1.5" stroke-dasharray="${e.type === 'conflict' ? '5,3' : 'none'}" opacity="0.6"/>
            <text x="${midX}" y="${midY}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">${e.label || ''}</text>
        `;
    }).join('');

    const svgNodes = nodes.map((n, i) => {
        const color = colors[i % colors.length];
        const escaped = (n.label || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const words = escaped.split(' ');
        const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
        return `
            <g class="km-node" data-idx="${i}" style="cursor:pointer;" onclick="window.kmDrillNode(${i})">
                <circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
                <text x="${n.x}" y="${n.y - (line2 ? 6 : 0)}" text-anchor="middle" fill="white" font-size="${Math.max(9, n.r * 0.55)}" font-weight="600" font-family="Inter,sans-serif">${line1}</text>
                ${line2 ? `<text x="${n.x}" y="${n.y + n.r * 0.55}" text-anchor="middle" fill="white" font-size="${Math.max(8, n.r * 0.5)}" font-family="Inter,sans-serif">${line2}</text>` : ''}
            </g>
        `;
    }).join('');

    container.innerHTML = `
        <div style="position:relative;">
            <svg width="${W}" height="${H}" style="background:rgba(0,0,0,0.2);border-radius:1rem;overflow:visible;">
                <defs>
                    <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                ${svgEdges}
                ${svgNodes}
            </svg>
            <div id="km-drill-panel" style="display:none;margin-top:1.5rem;padding:1.5rem;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:1rem;">
                <h4 id="km-drill-title" style="color:var(--accent);margin-bottom:0.75rem;"></h4>
                <p id="km-drill-desc" style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;"></p>
                <div id="km-drill-content" class="markdown-body" style="font-size:0.9rem;"></div>
            </div>
        </div>
        <p style="text-align:center;color:var(--text-muted);font-size:0.8rem;margin-top:1rem;">Click any node to drill into details</p>
    `;

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
