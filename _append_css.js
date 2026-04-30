const fs = require('fs');
const css = `
/* =====================================================
   LUMINA 3-PANEL NOTEBOOKLM LAYOUT
   ===================================================== */
.lumina-app { display:flex; height:100vh; width:100vw; overflow:hidden; backdrop-filter:blur(20px); }
.icon-nav { width:var(--icon-nav-width); background:rgba(8,15,32,0.95); border-right:1px solid var(--border-color); display:flex; flex-direction:column; align-items:center; padding:0.75rem 0; gap:0.25rem; flex-shrink:0; z-index:100; overflow-y:auto; scrollbar-width:none; }
.icon-nav::-webkit-scrollbar { display:none; }
.icon-nav-logo { width:40px;height:40px; border-radius:0.75rem; background:linear-gradient(135deg,var(--accent),#8b5cf6); display:flex;align-items:center;justify-content:center; font-size:1.25rem;color:white;cursor:pointer; margin-bottom:0.5rem;flex-shrink:0; transition:transform 0.2s; }
.icon-nav-logo:hover { transform:scale(1.1); }
.icon-nav-section { display:flex;flex-direction:column;align-items:center;gap:0.25rem;flex:1;width:100%; }
.icon-nav-bottom { display:flex;flex-direction:column;align-items:center;gap:0.5rem;padding-bottom:0.5rem;width:100%; }
.icon-nav-btn { width:48px;height:48px; border-radius:0.75rem; border:none;background:transparent; color:var(--text-muted); display:flex;flex-direction:column;align-items:center;justify-content:center; gap:0.15rem;cursor:pointer; transition:all 0.15s; font-size:1.25rem; }
.icon-nav-btn span { font-size:0.55rem;font-weight:600;line-height:1;opacity:0.7; }
.icon-nav-btn:hover { background:rgba(255,255,255,0.07);color:var(--text-main); }
.icon-nav-btn.active { background:var(--accent);color:white;box-shadow:0 0 15px rgba(59,130,246,0.4); }
.icon-nav-user { width:36px;height:36px;border-radius:50%; border:2px solid var(--border-color); display:flex;align-items:center;justify-content:center; cursor:pointer;font-size:1.35rem;color:var(--text-muted); transition:all 0.2s; }
.icon-nav-user:hover { border-color:var(--accent);color:var(--accent); }
.workspace { flex:1;display:flex;overflow:hidden;min-width:0; }
.sources-panel { width:var(--panel-width-sources);background:rgba(12,20,40,0.7);border-right:1px solid var(--border-color);display:flex;flex-direction:column;flex-shrink:0;transition:width 0.25s ease,opacity 0.25s;overflow:hidden;backdrop-filter:blur(20px); }
.sources-panel.collapsed { width:0;opacity:0;pointer-events:none; }
.studio-panel { width:var(--panel-width-studio);background:rgba(12,20,40,0.7);border-left:1px solid var(--border-color);display:flex;flex-direction:column;flex-shrink:0;transition:width 0.25s ease,opacity 0.25s;overflow:hidden;backdrop-filter:blur(20px); }
.studio-panel.collapsed { width:0;opacity:0;pointer-events:none; }
.center-panel { flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden; }
.panel-header { display:flex;align-items:center;justify-content:space-between; padding:0.875rem 1rem; border-bottom:1px solid var(--border-color); flex-shrink:0; background:rgba(0,0,0,0.1); }
.panel-header-left { display:flex;align-items:center;gap:0.5rem; }
.panel-header-title { font-size:0.875rem;font-weight:700;color:var(--text-main); }
.panel-header-actions { display:flex;gap:0.25rem; }
.panel-icon-btn { width:30px;height:30px; border-radius:0.5rem;border:none; background:transparent;color:var(--text-muted); display:flex;align-items:center;justify-content:center; cursor:pointer;font-size:1rem;transition:all 0.15s; }
.panel-icon-btn:hover { background:rgba(255,255,255,0.08);color:var(--text-main); }
.panel-body { flex:1;overflow-y:auto;padding:0.75rem;display:flex;flex-direction:column;gap:0.5rem; }
.source-count-badge { background:var(--accent);color:white; font-size:0.65rem;font-weight:700; padding:0.1rem 0.45rem;border-radius:2rem; min-width:18px;text-align:center; }
.notebook-context-bar { display:flex;align-items:center;gap:0.5rem; padding:0.5rem 0.75rem; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.25); border-radius:0.75rem; font-size:0.78rem;font-weight:600;color:var(--accent); margin-bottom:0.25rem; }
.sources-list-v2 { display:flex;flex-direction:column;gap:0.375rem;flex:1; }
.sources-empty-state { text-align:center;padding:2.5rem 1rem; color:var(--text-muted); display:flex;flex-direction:column;align-items:center;gap:0.75rem; }
.sources-empty-state ion-icon { font-size:2.5rem;opacity:0.4; }
.sources-empty-state p { font-size:0.8rem; }
.source-card-v2 { display:flex;align-items:center;gap:0.625rem; padding:0.625rem 0.75rem; border-radius:0.75rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.02); cursor:pointer;transition:all 0.15s; position:relative; }
.source-card-v2:hover { background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.15); }
.source-card-v2.active { background:rgba(59,130,246,0.12);border-color:var(--accent); }
.source-card-v2.disabled { opacity:0.4; }
.source-card-icon { width:30px;height:30px;border-radius:0.5rem; display:flex;align-items:center;justify-content:center; font-size:0.9rem;flex-shrink:0; }
.source-card-info { flex:1;min-width:0; }
.source-card-name { font-size:0.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.source-card-meta { font-size:0.65rem;color:var(--text-muted);margin-top:0.1rem; }
.source-card-actions { display:flex;gap:0.2rem;opacity:0;transition:opacity 0.15s; }
.source-card-v2:hover .source-card-actions { opacity:1; }
.source-status-badge { font-size:0.6rem;font-weight:700;padding:0.1rem 0.4rem; border-radius:2rem;text-transform:uppercase;flex-shrink:0; }
.source-status-badge.ready { background:rgba(16,185,129,0.15);color:var(--success); }
.source-status-badge.processing { background:rgba(245,158,11,0.15);color:var(--warning); }
.source-status-badge.failed { background:rgba(239,68,68,0.15);color:var(--error); }
.source-discovery-panel { border:1px solid rgba(245,158,11,0.25);border-radius:0.75rem;padding:0.75rem;background:rgba(245,158,11,0.05);margin-top:0.5rem; }
.source-discovery-header { display:flex;align-items:center;gap:0.4rem;font-size:0.75rem;font-weight:700;margin-bottom:0.5rem;color:var(--warning); }
.source-viewer-inline { border-top:1px solid var(--border-color);display:flex;flex-direction:column;max-height:50%;flex-shrink:0; }
.source-viewer-inline-header { display:flex;justify-content:space-between;align-items:center; padding:0.625rem 0.75rem; font-size:0.78rem;font-weight:700; background:rgba(0,0,0,0.15); border-bottom:1px solid var(--border-color); }
.source-viewer-inline-body { flex:1;overflow-y:auto;padding:0.75rem;font-size:0.8rem;line-height:1.6;color:var(--text-main); }
.center-topbar { display:flex;align-items:center;gap:0.75rem; padding:0 1.25rem; height:56px; border-bottom:1px solid var(--border-color); background:rgba(8,15,32,0.5); flex-shrink:0; backdrop-filter:blur(10px); }
.center-topbar-breadcrumb { flex:1; font-size:0.95rem;font-weight:700;color:var(--text-main); white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.center-topbar-actions { display:flex;align-items:center;gap:0.5rem; }
.content-area { flex:1;overflow-y:auto;overflow-x:hidden; padding:1.5rem 2rem 3rem; min-height:0; }
.studio-tiles { display:flex;flex-direction:column;gap:0.5rem; }
.studio-tile { border:1px solid var(--border-color);border-radius:1rem;overflow:hidden;background:rgba(255,255,255,0.02);transition:border-color 0.15s; }
.studio-tile:hover { border-color:rgba(255,255,255,0.15); }
.studio-tile-header { display:flex;align-items:center;gap:0.75rem; padding:0.875rem; cursor:pointer;transition:background 0.15s; }
.studio-tile-header:hover { background:rgba(255,255,255,0.04); }
.studio-tile-icon { width:36px;height:36px;border-radius:0.75rem; display:flex;align-items:center;justify-content:center; font-size:1rem;color:white;flex-shrink:0; }
.studio-tile-title { font-size:0.85rem;font-weight:700; }
.studio-tile-subtitle { font-size:0.7rem;color:var(--text-muted);margin-top:0.05rem; }
.tile-chevron { margin-left:auto;font-size:0.875rem;color:var(--text-muted);transition:transform 0.2s; }
.tile-chevron.open { transform:rotate(180deg); }
.studio-tile-content { padding:0 0.875rem 0.875rem;border-top:1px solid var(--border-color); }
.studio-tile-outputs { display:flex;flex-direction:column;gap:0.375rem;margin-top:0.5rem; }
.studio-output-item { display:flex;align-items:center;gap:0.5rem; padding:0.5rem 0.625rem; border-radius:0.5rem; background:rgba(0,0,0,0.15); border:1px solid var(--border-color); font-size:0.75rem;cursor:pointer;transition:all 0.15s; }
.studio-output-item:hover { background:rgba(255,255,255,0.05);border-color:var(--accent); }
.studio-report-grid { display:grid;grid-template-columns:1fr 1fr; gap:0.375rem;padding-top:0.625rem; }
.studio-report-btn { padding:0.6rem 0.5rem; background:rgba(0,0,0,0.15); border:1px solid var(--border-color); border-radius:0.625rem; color:var(--text-main); font-size:0.72rem;font-weight:600; cursor:pointer;text-align:left; transition:all 0.15s; white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.studio-report-btn:hover { background:rgba(139,92,246,0.15);border-color:#8b5cf6;color:white; }
.panel-section-header { display:flex;justify-content:space-between;align-items:center; font-size:0.78rem;font-weight:700;color:var(--accent); padding:0.5rem 0;border-bottom:1px solid var(--border-color); margin-bottom:0.5rem; }
.studio-quick-content { font-size:0.8rem;line-height:1.6; max-height:300px;overflow-y:auto; color:var(--text-main); }
.citation-chip { display:inline-flex;align-items:center;gap:0.2rem; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.35); color:var(--accent); font-size:0.7rem;font-weight:700; padding:0.05rem 0.45rem; border-radius:2rem; cursor:pointer;margin:0 0.1rem; transition:all 0.15s;white-space:nowrap; }
.citation-chip:hover { background:rgba(59,130,246,0.3);transform:translateY(-1px); }
.follow-up-chips { display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem; }
.follow-up-chip { padding:0.35rem 0.85rem; border-radius:2rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.04); font-size:0.78rem;cursor:pointer; color:var(--text-muted);transition:all 0.15s; }
.follow-up-chip:hover { border-color:var(--accent);color:var(--accent);background:rgba(59,130,246,0.08); }
.save-to-notes-btn { background:transparent;border:none; color:var(--text-muted);font-size:0.72rem; cursor:pointer;padding:0.2rem 0.5rem; border-radius:0.4rem;transition:all 0.15s; display:inline-flex;align-items:center;gap:0.25rem; }
.save-to-notes-btn:hover { color:var(--success);background:rgba(16,185,129,0.1); }
.notes-grid { display:flex;flex-direction:column;gap:1rem; }
.note-card { background:var(--panel-bg); border:1px solid var(--border-color); border-radius:1.25rem; padding:1.25rem 1.5rem; backdrop-filter:blur(16px); transition:all 0.2s; }
.note-card:hover { border-color:rgba(255,255,255,0.2);transform:translateY(-1px); }
.note-card.pinned { border-color:var(--warning); }
.note-card-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem; }
.note-card-title { font-weight:700;font-size:1rem; }
.note-card-actions { display:flex;gap:0.3rem; }
.note-card-body { font-size:0.875rem;line-height:1.7;color:var(--text-main); }
.note-card-footer { margin-top:0.75rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap; }
.note-meta { font-size:0.7rem;color:var(--text-muted); }
.note-as-source-badge { font-size:0.65rem;font-weight:700; padding:0.1rem 0.45rem;border-radius:2rem; background:rgba(139,92,246,0.15);color:#8b5cf6; border:1px solid rgba(139,92,246,0.3); }
.tier-badge { font-size:0.65rem;font-weight:800; padding:0.15rem 0.6rem;border-radius:2rem; text-transform:uppercase;letter-spacing:0.05em; }
.tier-badge.free { background:rgba(100,116,139,0.2);color:var(--text-muted);border:1px solid var(--border-color); }
.tier-badge.plus { background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(249,115,22,0.2));color:#f59e0b;border:1px solid rgba(245,158,11,0.35); }
.upgrade-prompt { background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(249,115,22,0.08)); border:1px solid rgba(245,158,11,0.25); border-radius:1rem;padding:1.5rem; text-align:center; }
.upgrade-prompt h3 { color:#f59e0b;margin-bottom:0.5rem; }
.upgrade-prompt p { font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem; }
.notebooks-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1.25rem; }
.notebook-card { background:var(--panel-bg); border:1px solid var(--border-color); border-radius:1.5rem; padding:1.5rem; cursor:pointer; transition:all 0.2s; position:relative; backdrop-filter:blur(16px); display:flex;flex-direction:column;gap:0.75rem; }
.notebook-card:hover { border-color:var(--accent);transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,0.3); }
.notebook-card.pinned { border-color:var(--warning); }
.notebook-card-emoji { font-size:2.5rem;line-height:1; }
.notebook-card-title { font-weight:700;font-size:1.05rem; }
.notebook-card-meta { font-size:0.75rem;color:var(--text-muted); }
.notebook-card-footer { display:flex;align-items:center;justify-content:space-between;margin-top:auto; }
.notebook-card-actions { display:flex;gap:0.25rem;opacity:0;transition:opacity 0.15s; }
.notebook-card:hover .notebook-card-actions { opacity:1; }
.notebook-pin-indicator { position:absolute;top:1rem;right:1rem; font-size:0.85rem;color:var(--warning); }
.chat-config-drawer { position:fixed;top:0;right:0; width:320px;height:100vh; background:rgba(12,20,40,0.97); border-left:1px solid var(--border-color); backdrop-filter:blur(20px); z-index:500; transform:translateX(100%); transition:transform 0.3s ease; overflow-y:auto; }
.chat-config-drawer:not(.hidden) { transform:translateX(0); }
.chat-config-content { padding:1.5rem; }
.audio-overview-item { background:rgba(0,0,0,0.15);border:1px solid var(--border-color);border-radius:0.875rem;padding:0.875rem 1rem;margin-bottom:0.5rem; }
.audio-overview-item-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.8rem;font-weight:700; }
.audio-overview-controls { display:flex;gap:0.5rem;align-items:center; }
@media (max-width:900px) { .studio-panel{display:none;} .sources-panel{width:240px;} .content-area{padding:1rem;} }
@media (max-width:600px) { .sources-panel{display:none;} .icon-nav{width:52px;} .icon-nav-btn span{display:none;} .icon-nav-btn{width:42px;height:42px;} }
`;
fs.appendFileSync('styles.css', css);
console.log('CSS appended OK, new size:', fs.statSync('styles.css').size, 'bytes');
