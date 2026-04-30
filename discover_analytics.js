// ============================================================
// LUMINA — DISCOVER GALLERY (Phase 6) + ANALYTICS (Phase 7)
// ============================================================

// ---- DISCOVER VIEW ----
window.Views = window.Views || {};

window.Views.discover = () => `
    <div class="glass-panel" style="max-width:1100px; margin:0 auto; width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
            <div>
                <h2 style="font-size:2rem; font-weight:800; margin:0;">🌐 Discover</h2>
                <p style="color:var(--text-muted); margin-top:0.4rem;">Explore publicly shared notebooks from the Lumina community.</p>
            </div>
            <div style="display:flex; gap:0.75rem; align-items:center;">
                <input type="text" id="discover-search" placeholder="Search notebooks..." class="form-control" style="width:220px;" oninput="window.filterDiscoverResults(this.value)">
                <button class="btn btn-primary" onclick="window.loadDiscoverGallery()"><ion-icon name="refresh-outline"></ion-icon> Refresh</button>
            </div>
        </div>

        <div id="discover-tag-bar" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:2rem;">
            <button class="discover-tag active" onclick="window.filterDiscoverTag('')">All</button>
            <button class="discover-tag" onclick="window.filterDiscoverTag('science')">🔬 Science</button>
            <button class="discover-tag" onclick="window.filterDiscoverTag('history')">📜 History</button>
            <button class="discover-tag" onclick="window.filterDiscoverTag('coding')">💻 Coding</button>
            <button class="discover-tag" onclick="window.filterDiscoverTag('literature')">📖 Literature</button>
            <button class="discover-tag" onclick="window.filterDiscoverTag('math')">📐 Math</button>
            <button class="discover-tag" onclick="window.filterDiscoverTag('philosophy')">🧠 Philosophy</button>
        </div>

        <div id="discover-status" style="text-align:center; color:var(--accent); font-weight:600; padding:1rem; display:none;"></div>

        <div id="discover-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:1.5rem;">
            <div style="grid-column:1/-1; text-align:center; padding:4rem 2rem; color:var(--text-muted);">
                <ion-icon name="globe-outline" style="font-size:3rem; opacity:0.3; display:block; margin-bottom:1rem;"></ion-icon>
                <p>Loading community notebooks...</p>
                <button class="btn btn-secondary" style="margin-top:1rem;" onclick="window.loadDiscoverGallery()">Load Gallery</button>
            </div>
        </div>
    </div>
`;

window._discoverCache = [];
window._discoverTag = '';

window.loadDiscoverGallery = async () => {
    const grid = document.getElementById('discover-grid');
    const status = document.getElementById('discover-status');
    if (!grid) return;

    if (!window.db) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:3rem;">Sign in to access the Discover gallery.</div>';
        return;
    }

    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);"><ion-icon name="hourglass-outline" style="font-size:2rem; color:var(--accent);"></ion-icon><p>Loading community notebooks...</p></div>';

    try {
        const { collection, getDocs, query, where, limit, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const sharesRef = collection(window.db, "shares");
        const q = query(sharesRef, where("role", "==", "viewer"), limit(30));
        const snap = await getDocs(q);

        const shareItems = [];
        for (const docSnap of snap.docs) {
            const share = docSnap.data();
            // Fetch the notebook
            try {
                const nbRef = window.db && (await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")).doc(window.db, `users/${share.ownerId}/notebooks`, share.notebookId);
                const nbSnap = await (await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")).getDoc(nbRef);
                if (nbSnap.exists()) {
                    shareItems.push({ shareId: docSnap.id, ...share, notebook: nbSnap.data() });
                }
            } catch (_) {}
        }

        window._discoverCache = shareItems;
        window._renderDiscoverGrid(shareItems);

    } catch (e) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--error); padding:3rem;">${e.message}</div>`;
    }
};

window._renderDiscoverGrid = (items) => {
    const grid = document.getElementById('discover-grid');
    if (!grid) return;
    if (items.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:4rem;">No public notebooks found yet. Be the first to share yours!</div>';
        return;
    }
    grid.innerHTML = items.map(item => {
        const nb = item.notebook;
        const sourceCount = (nb.sources || []).length;
        const noteCount = (nb.notes || []).length;
        const gradient = `linear-gradient(135deg, hsl(${Math.abs(nb.id?.charCodeAt(0) || 200) % 360}, 60%, 30%), hsl(${(Math.abs(nb.id?.charCodeAt(0) || 200) + 120) % 360}, 50%, 20%))`;
        return `
        <div class="glass-panel discover-card" style="padding:0; border-radius:1.5rem; overflow:hidden; cursor:pointer; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);" onmouseenter="this.style.transform='translateY(-8px) scale(1.02)'; this.style.borderColor='rgba(59,130,246,0.3)'; this.style.boxShadow='0 20px 40px rgba(0,0,0,0.4)'" onmouseleave="this.style.transform=''; this.style.borderColor='rgba(255,255,255,0.05)'; this.style.boxShadow=''">
            <div style="height:110px; background:${gradient}; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;">
                <div style="font-size:2.8rem; filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));">📓</div>
                <div style="position:absolute; bottom:0.5rem; right:0.75rem; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); padding:0.2rem 0.5rem; border-radius:0.5rem; font-size:0.65rem; color:white; font-weight:700;">PUBLIC</div>
            </div>
            <div style="padding:1.5rem;">
                <h3 style="font-size:1.1rem; font-weight:800; margin:0 0 0.5rem; color:var(--text-main); line-height:1.3;">${nb.title || 'Untitled Notebook'}</h3>
                <div style="display:flex; gap:0.75rem; margin-bottom:1.25rem;">
                    <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:0.25rem;"><ion-icon name="document-outline"></ion-icon> ${sourceCount}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:0.25rem;"><ion-icon name="create-outline"></ion-icon> ${noteCount}</div>
                </div>
                <div style="display:flex; gap:0.6rem; align-items:center;">
                    <button class="btn btn-primary btn-sm" style="flex:1.2; font-size:0.75rem; border-radius:0.75rem;" onclick="window._openSharedNb('${item.shareId}')">View</button>
                    <button class="btn btn-secondary btn-sm" style="flex:1; font-size:0.75rem; border-radius:0.75rem; background:rgba(255,255,255,0.05);" onclick="window._cloneSharedNb('${item.shareId}')">Clone</button>
                    <button class="panel-icon-btn" onclick="event.stopPropagation(); window._upvoteSharedNb('${item.shareId}')" style="background:transparent; border:none; display:flex; align-items:center; gap:0.3rem; color:var(--text-muted); font-size:0.8rem;">
                        <ion-icon name="heart-outline"></ion-icon> ${item.upvotes || 0}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
};

window.filterDiscoverResults = (query) => {
    const filtered = window._discoverCache.filter(item =>
        (item.notebook?.title || '').toLowerCase().includes(query.toLowerCase())
    );
    window._renderDiscoverGrid(filtered);
};

window.filterDiscoverTag = (tag) => {
    window._discoverTag = tag;
    document.querySelectorAll('.discover-tag').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    if (!tag) {
        window._renderDiscoverGrid(window._discoverCache);
        return;
    }
    const filtered = window._discoverCache.filter(item =>
        (item.notebook?.title || '').toLowerCase().includes(tag.toLowerCase()) ||
        (item.notebook?.sources || []).some(s => (s.title || '').toLowerCase().includes(tag))
    );
    window._renderDiscoverGrid(filtered);
};

window._openSharedNb = (shareId) => {
    const url = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    window.open(url, '_blank');
};

window._cloneSharedNb = async (shareId) => {
    if (!window.auth?.currentUser) return window.showToast("Sign in to clone notebooks.", "error");
    try {
        const { doc, getDoc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const shareSnap = await getDoc(doc(window.db, "shares", shareId));
        if (!shareSnap.exists()) return window.showToast("Share not found.", "error");
        const { notebookId, ownerId } = shareSnap.data();
        const nbSnap = await getDoc(doc(window.db, `users/${ownerId}/notebooks`, notebookId));
        if (!nbSnap.exists()) return window.showToast("Notebook not found.", "error");

        const clone = { ...nbSnap.data() };
        const generateId = () => Math.random().toString(36).substr(2,9) + Date.now().toString(36);
        clone.id = generateId();
        clone.title = (clone.title || 'Notebook') + ' (Clone)';
        clone.createdAt = new Date().toISOString();
        clone.updatedAt = new Date().toISOString();
        clone.isShared = false;
        clone.isSharedReadonly = false;

        window.AppState.notebooks.push(clone);
        window.saveState('notebooks', window.AppState.notebooks);
        
        // Phase 15: Track Clones
        updateDoc(doc(window.db, "shares", shareId), { clones: increment(1) }).catch(e => console.warn(e));

        window.showToast("Notebook cloned to your library!", "success");
        window.navigate('notebooks');
    } catch (e) {
        window.showToast("Clone failed: " + e.message, "error");
    }
};

window._upvoteSharedNb = async (shareId) => {
    if (!window.auth?.currentUser) return window.showToast("Sign in to upvote.", "error");
    try {
        const { doc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        await updateDoc(doc(window.db, "shares", shareId), { upvotes: increment(1) });
        window.showToast("Upvoted!", "success");
        window.loadDiscoverGallery();
    } catch (e) {
        window.showToast("Upvote failed", "error");
    }
};

// ---- ANALYTICS VIEW (Phase 7) ----
window.Views.analytics = () => {
    const nbs = window.AppState.notebooks || [];
    const totalSources = nbs.reduce((s, n) => s + (n.sources || []).length, 0);
    const totalFlashcards = nbs.reduce((s, n) => s + (n.flashcards || []).reduce((a, d) => a + (d.cards || []).length, 0), 0);
    const totalQuizzes = nbs.reduce((s, n) => s + (n.quizzes || []).length, 0);
    const totalNotes = nbs.reduce((s, n) => s + (n.notes || []).length, 0);

    // Quiz scores for chart
    const allScores = nbs.flatMap(n => (n.quizzes || []).map(q => ({ title: q.title?.substring(0, 20) || 'Quiz', score: q.score || 0 })));
    const avgScore = allScores.length ? Math.round(allScores.reduce((s, q) => s + q.score, 0) / allScores.length) : 0;

    // Build SVG bar chart for quiz scores
    const chartWidth = 500;
    const chartHeight = 120;
    const barW = allScores.length > 0 ? Math.min(40, (chartWidth - 20) / allScores.length) : 40;
    const bars = allScores.slice(-12).map((q, i) => {
        const h = Math.max(4, (q.score / 100) * chartHeight);
        const x = i * (barW + 6) + 10;
        const y = chartHeight - h;
        const color = q.score >= 80 ? '#10b981' : q.score >= 50 ? '#f59e0b' : '#ef4444';
        return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${color}" opacity="0.85"/>
                <text x="${x + barW/2}" y="${chartHeight + 16}" text-anchor="middle" font-size="9" fill="#94a3b8">${q.score}%</text>`;
    }).join('');

    return `
    <div style="max-width:1000px; margin:0 auto; width:100%;">
        <h2 style="font-size:2rem; font-weight:800; margin-bottom:0.5rem;">📊 Mastery Analytics</h2>
        <p style="color:var(--text-muted); margin-bottom:2rem;">Your learning progress at a glance.</p>

        <!-- Stat Cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:2.5rem;">
            ${[
                { icon: '📓', label: 'Notebooks', value: nbs.length, color: '#3b82f6' },
                { icon: '📄', label: 'Total Sources', value: totalSources, color: '#8b5cf6' },
                { icon: '🃏', label: 'Flashcards Made', value: totalFlashcards, color: '#10b981' },
                { icon: '🎯', label: 'Quizzes Taken', value: totalQuizzes, color: '#f59e0b' },
                { icon: '📝', label: 'Saved Notes', value: totalNotes, color: '#06b6d4' },
                { icon: '⭐', label: 'Avg Quiz Score', value: avgScore + '%', color: avgScore >= 70 ? '#10b981' : '#ef4444' },
            ].map(s => `
                <div class="glass-panel" style="padding:1.5rem; text-align:center; background:rgba(255,255,255,0.03);">
                    <div style="font-size:2rem; margin-bottom:0.5rem;">${s.icon}</div>
                    <div style="font-size:2rem; font-weight:800; color:${s.color};">${s.value}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">${s.label}</div>
                </div>
            `).join('')}
        </div>

        <!-- Quiz Score Chart -->
        ${allScores.length > 0 ? `
        <div class="glass-panel" style="padding:1.5rem; margin-bottom:2rem;">
            <h3 style="margin-bottom:1.5rem; font-size:1rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Quiz Score History</h3>
            <svg width="100%" viewBox="0 0 ${chartWidth} ${chartHeight + 24}" style="overflow:visible;">
                <!-- Grid lines -->
                ${[0,25,50,75,100].map(v => {
                    const y = chartHeight - (v/100)*chartHeight;
                    return `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
                             <text x="0" y="${y - 3}" font-size="9" fill="rgba(255,255,255,0.2)">${v}%</text>`;
                }).join('')}
                ${bars}
            </svg>
            <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted); text-align:right;">Average: <strong style="color:${avgScore >= 70 ? '#10b981' : '#f59e0b'};">${avgScore}%</strong></div>
        </div>
        ` : '<div class="glass-panel" style="padding:2rem; text-align:center; color:var(--text-muted);">Take some quizzes to see your score history here.</div>'}

        <!-- Per-Notebook Breakdown -->
        <div class="glass-panel" style="padding:1.5rem;">
            <h3 style="margin-bottom:1.25rem; font-size:1rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Notebook Breakdown</h3>
            ${nbs.length === 0 ? '<p style="color:var(--text-muted); text-align:center; padding:2rem;">No notebooks yet.</p>' :
            `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                <thead>
                    <tr style="color:var(--text-muted); border-bottom:1px solid var(--border-color);">
                        <th style="text-align:left; padding:0.6rem 0.75rem; font-weight:600;">Notebook</th>
                        <th style="text-align:center; padding:0.6rem 0.75rem; font-weight:600;">Sources</th>
                        <th style="text-align:center; padding:0.6rem 0.75rem; font-weight:600;">Flashcards</th>
                        <th style="text-align:center; padding:0.6rem 0.75rem; font-weight:600;">Quizzes</th>
                        <th style="text-align:center; padding:0.6rem 0.75rem; font-weight:600;">Avg Score</th>
                        <th style="text-align:center; padding:0.6rem 0.75rem; font-weight:600;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${nbs.map(nb => {
                        const quizzes = nb.quizzes || [];
                        const avg = quizzes.length ? Math.round(quizzes.reduce((s,q) => s+(q.score||0),0)/quizzes.length) : '-';
                        const cards = (nb.flashcards || []).reduce((s,d) => s+(d.cards||[]).length, 0);
                        const scoreColor = avg === '-' ? 'var(--text-muted)' : avg >= 70 ? '#10b981' : '#ef4444';
                        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                            <td style="padding:0.75rem; font-weight:600;">${nb.title || 'Untitled'}</td>
                            <td style="text-align:center; padding:0.75rem; color:var(--text-muted);">${(nb.sources||[]).length}</td>
                            <td style="text-align:center; padding:0.75rem; color:var(--text-muted);">${cards}</td>
                            <td style="text-align:center; padding:0.75rem; color:var(--text-muted);">${quizzes.length}</td>
                            <td style="text-align:center; padding:0.75rem; color:${scoreColor}; font-weight:700;">${avg}${avg !== '-' ? '%' : ''}</td>
                            <td style="text-align:center; padding:0.75rem;">
                                <button class="btn btn-secondary btn-sm" onclick="window.setActiveNotebook('${nb.id}')">Open</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`}
        </div>
    </div>`;
};

// Inject discover tag CSS
(function() {
    if (document.getElementById('discover-style')) return;
    const s = document.createElement('style');
    s.id = 'discover-style';
    s.textContent = `
        .discover-tag {
            padding: 0.4rem 1rem;
            border-radius: 2rem;
            border: 1px solid var(--border-color);
            background: rgba(255,255,255,0.04);
            color: var(--text-muted);
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .discover-tag.active,
        .discover-tag:hover {
            background: rgba(59,130,246,0.15);
            border-color: rgba(59,130,246,0.5);
            color: #3b82f6;
        }
    `;
    document.head.appendChild(s);
})();
