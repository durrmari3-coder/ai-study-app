// NotebookLM 2025-2026 Extension Logic
// Advanced Dashboard, Search, Thumbnails, and Configurations

window.Views.notebooks = () => {
    const allNbs = window.AppState.notebooks || [];
    const query = (window.AppState.notebookSearchQuery || '').toLowerCase();
    const nbs = allNbs.filter(nb => 
        nb.title.toLowerCase().includes(query) || 
        (nb.sources || []).some(s => s.title.toLowerCase().includes(query))
    );
    const tier = window.AppState.userTier || 'free';
    
    return `
        <div class="glass-panel" style="min-height: 100%; padding: 2rem;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.5rem;">
                <div>
                    <h2 style="font-size: 3rem; margin-bottom: 0.5rem; font-weight:900; letter-spacing:-0.02em; background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Notebooks</h2>
                    <p style="color:var(--text-muted); font-size: 1.1rem;">Your personal research ecosystem.</p>
                </div>
                <div style="display:flex; gap: 1.5rem; align-items:center; flex-wrap:wrap;">
                    ${window.AppState.selectedNotebookIds.length > 0 ? `
                        <div class="bulk-actions glass-panel" style="padding:0.5rem 1rem; display:flex; gap:0.5rem; background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2);">
                            <span style="font-size:0.85rem; font-weight:700; color:#ef4444;">${window.AppState.selectedNotebookIds.length} Selected</span>
                            <button class="btn btn-sm" style="background:var(--error); color:white;" onclick="window.bulkDeleteNotebooks()">Delete</button>
                            <button class="btn btn-sm btn-secondary" onclick="window.bulkPinNotebooks()">Pin</button>
                            <button class="btn btn-sm btn-secondary" onclick="window.clearNotebookSelection()">Cancel</button>
                        </div>
                    ` : ''}

                    <div class="search-input-wrapper" style="position:relative; width: 300px;">

                        <ion-icon name="search-outline" style="position:absolute; left:1rem; top:50%; transform:translateY(-50%); color:var(--text-muted);"></ion-icon>
                        <input type="text" placeholder="Search notebooks..." 
                               value="${window.AppState.notebookSearchQuery || ''}"
                               oninput="window.updateNotebookSearch(this.value)"
                               style="width:100%; padding: 0.75rem 1rem 0.75rem 2.8rem; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:2rem; color:white; outline:none; font-size:0.9rem;">
                    </div>

                    ${tier === 'free' ? `
                    <div class="upgrade-prompt" style="padding: 0.6rem 1.25rem; border-radius: 2rem; display:flex; align-items:center; gap:0.75rem; background:rgba(255,255,255,0.03); border:1px solid var(--border-color);">
                        <span class="tier-badge free" style="padding: 0.2rem 0.6rem; font-size:0.7rem;">Free</span>
                        <span style="font-size:0.85rem; color:var(--text-muted);">${allNbs.length}/100</span>
                    </div>` : `
                    <div class="upgrade-prompt" style="padding: 0.6rem 1.25rem; border-radius: 2rem; display:flex; align-items:center; gap:0.75rem; background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.3);">
                        <span class="tier-badge plus" style="padding: 0.2rem 0.6rem; font-size:0.7rem;">Plus</span>
                        <span style="font-size:0.85rem; color:var(--accent); font-weight:600;">${allNbs.length}/500</span>
                    </div>`}
                    
                    <button class="btn btn-primary" onclick="window.createNotebook()" style="box-shadow: 0 4px 20px rgba(96,165,250,0.3);">
                        <ion-icon name="add-outline"></ion-icon> New Notebook
                    </button>
                </div>
            </div>
            
            <div class="notebooks-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                ${nbs.map((nb, i) => `
                    <div class="notebook-card ${nb.pinned ? 'pinned' : ''}" onclick="window.setActiveNotebook('${nb.id}')" 
                         style="position:relative; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:1.5rem; overflow:hidden; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer;">
                        
                        <div class="notebook-card-thumbnail" style="height:120px; background: ${nb.thumbnail ? `url(${nb.thumbnail})` : 'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(139,92,246,0.1) 100%)'}; background-size:cover; display:flex; align-items:center; justify-content:center; border-bottom:1px solid var(--border-color); position:relative;">
                            <input type="checkbox" style="position:absolute; top:0.75rem; left:0.75rem; width:20px; height:20px; cursor:pointer;" 
                                   ${window.AppState.selectedNotebookIds.includes(nb.id) ? 'checked' : ''}
                                   onclick="event.stopPropagation(); window.toggleNotebookSelection('${nb.id}')">
                            ${!nb.thumbnail ? `<span style="font-size:3rem; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3));">${nb.emoji || '📓'}</span>` : ''}
                        </div>


                        <div style="padding: 1.5rem;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                                <div class="notebook-card-title" style="font-size:1.25rem; font-weight:700; color:white;">${nb.title || 'Untitled Notebook'}</div>
                                ${nb.pinned ? '<ion-icon name="pin" style="color:var(--accent); font-size:1.2rem;"></ion-icon>' : ''}
                            </div>
                            <div class="notebook-card-meta" style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.5rem;">
                                ${(nb.sources||[]).length} Sources &bull; ${(nb.notes||[]).length} Notes &bull; ${new Date(nb.updatedAt).toLocaleDateString()}
                            </div>
                            
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; gap:0.25rem;">
                                    <button class="panel-icon-btn" title="Rename" onclick="event.stopPropagation(); window.renameNotebook('${nb.id}')"><ion-icon name="pencil-outline"></ion-icon></button>
                                    <button class="panel-icon-btn" title="Pin" onclick="event.stopPropagation(); window.pinNotebook('${nb.id}')"><ion-icon name="pin-outline"></ion-icon></button>
                                    <button class="panel-icon-btn" title="Duplicate" onclick="event.stopPropagation(); window.duplicateNotebook('${nb.id}')"><ion-icon name="copy-outline"></ion-icon></button>
                                    <button class="panel-icon-btn" title="Share" onclick="event.stopPropagation(); window.shareNotebook('${nb.id}')"><ion-icon name="share-social-outline"></ion-icon></button>
                                </div>
                                <button class="panel-icon-btn" title="Delete" style="color:#ef4444;" onclick="event.stopPropagation(); window.deleteNotebook('${nb.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                            </div>
                        </div>
                    </div>
                `).join('')}
                
                ${nbs.length === 0 ? `
                    <div class="notebook-card" style="border: 2px dashed var(--border-color); align-items:center; justify-content:center; text-align:center; min-height: 280px; display:flex; flex-direction:column; background:transparent; opacity:0.6;" onclick="window.createNotebook()">
                        <div style="font-size:3rem; color:var(--text-muted); margin-bottom: 1rem;">${query ? '🔍' : '📓'}</div>
                        <div class="notebook-card-title" style="color:var(--text-muted); font-size:1.1rem;">${query ? 'No notebooks match your search' : 'Create your first notebook to get started'}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
};

window.updateNotebookSearch = (val) => {
    window.AppState.notebookSearchQuery = val;
    window.navigate('notebooks');
};

// Utility to generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Create Notebook
window.createNotebook = () => {
    const limit = window.AppState.userTier === 'plus' ? 500 : 100;
    if (window.AppState.notebooks.length >= limit) {
        window.showToast(`You have reached the ${limit} notebook limit for your tier.`, "warning");
        return;
    }
    
    if (window.showModal) {
        window.showModal('Create Notebook', `
            <div style="display:flex; flex-direction:column; gap:1rem;">
                <input type="text" id="new-nb-title" class="form-control" value="New Research Project" placeholder="Notebook Title">
                <button class="btn btn-primary" onclick="window.confirmCreateNotebook()">Create Project</button>
            </div>
        `);
    } else {
        // Fallback
        const t = prompt("Enter notebook name:", "New Research Project");
        if(t) {
            document.body.insertAdjacentHTML('beforeend', `<input type="hidden" id="new-nb-title" value="${t}">`);
            window.confirmCreateNotebook();
        }
    }
};

window.confirmCreateNotebook = () => {
    const titleEl = document.getElementById('new-nb-title');
    if (!titleEl) return;
    const title = titleEl.value.trim();
    if (!title) return;
    
    if (window.closeModal) window.closeModal();
    
    const emojis = ['📓', '🧠', '🔬', '📚', '⚡', '💡', '📊', '🌐', '🔭', '🧬'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const newNb = {
        id: generateId(),
        title: title,
        emoji: randomEmoji,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: false,
        sources: [],
        chatHistory: [],
        notes: [],
        config: {
            persona: 'academic',
            tone: 'neutral',
            length: 'medium',
            language: 'english'
        }
    };
    
    window.AppState.notebooks.push(newNb);
    if (window.idbKeyval) window.idbKeyval.set('lumina_notebooks', window.AppState.notebooks);
    window.saveState('notebooks', window.AppState.notebooks); // Ensure state is saved properly
    
    // Firestore Sync
    if (window.auth && window.auth.currentUser && window.db) {
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js").then(({ doc, setDoc }) => {
            setDoc(doc(window.db, `users/${window.auth.currentUser.uid}/notebooks`, newNb.id), newNb, { merge: true }).catch(e => console.warn(e));
        });
    }

    window.setActiveNotebook(newNb.id);
};



// Rename Notebook
window.renameNotebook = (id) => {
    const nb = window.AppState.notebooks.find(n => n.id === id);
    if (!nb) return;
    
    if (window.showModal) {
        window.showModal('Rename Notebook', `
            <div style="display:flex; flex-direction:column; gap:1rem;">
                <input type="hidden" id="rename-nb-id" value="${id}">
                <input type="text" id="rename-nb-title" class="form-control" value="${nb.title}">
                <button class="btn btn-primary" onclick="window.confirmRenameNotebook()">Save</button>
            </div>
        `);
    } else {
        const newTitle = prompt("Enter new notebook name:", nb.title);
        if (newTitle && newTitle.trim() !== "") {
            document.body.insertAdjacentHTML('beforeend', `<input type="hidden" id="rename-nb-id" value="${id}"><input type="hidden" id="rename-nb-title" value="${newTitle}">`);
            window.confirmRenameNotebook();
        }
    }
};

window.confirmRenameNotebook = () => {
    const idEl = document.getElementById('rename-nb-id');
    const titleEl = document.getElementById('rename-nb-title');
    if (!idEl || !titleEl) return;
    
    const id = idEl.value;
    const newTitle = titleEl.value.trim();
    if (!newTitle) return;
    
    if (window.closeModal) window.closeModal();
    
    const nb = window.AppState.notebooks.find(n => n.id === id);
    if (nb) {
        nb.title = newTitle;
        nb.updatedAt = new Date().toISOString();
        window.saveState('notebooks', window.AppState.notebooks);
        window.navigate('notebooks');
    }
};

// Duplicate Notebook
window.duplicateNotebook = (id) => {
    const nb = window.AppState.notebooks.find(n => n.id === id);
    if (!nb) return;
    
    const limit = window.AppState.userTier === 'plus' ? 500 : 100;
    if (window.AppState.notebooks.length >= limit) {
        if (window.showToast) window.showToast(`You have reached the ${limit} notebook limit for your tier.`, "warning");
        else alert(`You have reached the ${limit} notebook limit for your tier.`);
        return;
    }
    
    const dup = JSON.parse(JSON.stringify(nb));
    dup.id = generateId();
    dup.title = dup.title + " (Copy)";
    dup.createdAt = new Date().toISOString();
    dup.updatedAt = new Date().toISOString();
    dup.pinned = false;
    
    window.AppState.notebooks.unshift(dup);
    window.saveState('notebooks', window.AppState.notebooks);
    window.navigate('notebooks');
};

// Pin Notebook
window.pinNotebook = (id) => {
    const idx = window.AppState.notebooks.findIndex(n => n.id === id);
    if (idx === -1) return;
    
    window.AppState.notebooks[idx].pinned = !window.AppState.notebooks[idx].pinned;
    
    // Re-sort: pinned first, then by updated date
    window.AppState.notebooks.sort((a, b) => {
        if (a.pinned === b.pinned) {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        return a.pinned ? -1 : 1;
    });
    
    window.saveState('notebooks', window.AppState.notebooks);
    window.navigate('notebooks');
};

// Delete Notebook
window.deleteNotebook = (id) => {
    const nb = window.AppState.notebooks.find(n => n.id === id);
    if (!nb) return;
    
    if (confirm(`Are you sure you want to delete "${nb.title}"? This cannot be undone.`)) {
        window.AppState.notebooks = window.AppState.notebooks.filter(n => n.id !== id);
        
        if (window.AppState.activeNotebookId === id) {
            window.AppState.activeNotebookId = null;
            window.saveState('activeNotebookId', null);
        }
        
        window.saveState('notebooks', window.AppState.notebooks);
        window.navigate('notebooks');
    }
};

// Set Active Notebook
// Set Active Notebook
window.setActiveNotebook = (id) => {
    window.AppState.activeNotebookId = id;
    window.saveState('activeNotebookId', id);
    
    // Sync the notebook's sources and other state to AppState
    const nb = window.AppState.notebooks.find(n => n.id === id);
    if (nb) {
        window.AppState.documents = nb.sources || [];
        window.AppState.chatHistory = nb.chatHistory || [];
        window.AppState.quizzes = nb.quizzes || [];
        window.AppState.flashcards = nb.flashcards || [];
        window.AppState.presentations = nb.presentations || [];
        window.AppState.notes = nb.notes || [];
    }
    
    // Phase 11: Initiate Real-time Firestore Listener
    window.initiateNotebookSync(id);
    
    if (window.renderSourcesSidebar) window.renderSourcesSidebar();
    window.navigate('notebook');
};

window.initiateNotebookSync = async (id) => {
    if (!window.db || !window.auth?.currentUser) return;
    
    // Unsubscribe from previous sync if exists
    if (window._syncUnsubscribe) {
        window._syncUnsubscribe();
        window._syncUnsubscribe = null;
    }

    try {
        const { doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        
        // Find if this is a shared notebook or owned
        const nb = window.AppState.notebooks.find(n => n.id === id);
        const ownerId = nb?.ownerId || window.auth.currentUser.uid;
        
        const nbDocRef = doc(window.db, `users/${ownerId}/notebooks`, id);
        
        window._syncUnsubscribe = onSnapshot(nbDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                
                // Prevent loops: Only update if the remote version is newer or we don't have it
                // We use a simple timestamp or change flag
                if (data.updatedAt !== window._lastLocalUpdate) {
                    console.log("[Sync] Remote update received for notebook:", id);
                    
                    // Merge remote data into local state
                    const localNb = window.AppState.notebooks.find(n => n.id === id);
                    if (localNb) {
                        Object.assign(localNb, data);
                        // If it's the active notebook, refresh the UI
                        if (window.AppState.activeNotebookId === id) {
                            window.AppState.documents = data.sources || [];
                            window.AppState.chatHistory = data.chatHistory || [];
                            window.AppState.notes = data.notes || [];
                            // Re-render if in relevant view
                            if (window.location.hash.includes('notebook')) {
                                // debounce render to avoid flicker
                                if (window._renderTimer) clearTimeout(window._renderTimer);
                                window._renderTimer = setTimeout(() => window.navigate('notebook'), 100);
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Sync failed to initiate:", e.message);
    }
};



// Workspace Notes Tab Toggle
window.toggleWorkspaceTab = (tab) => {
    window.AppState.showNotesTab = (tab === 'notes');
    window.navigate('notebook'); // re-render view
};

window.toggleConfigPanel = () => {
    window.AppState.showConfigPanel = !window.AppState.showConfigPanel;
    window.navigate('notebook'); // re-render
};

window.updateNotebookConfig = (key, val) => {
    const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
    if (!nb) return;
    if (!nb.config) nb.config = { persona: 'academic', tone: 'neutral', length: 'medium', language: 'english' };
    nb.config[key] = val;
    nb.updatedAt = new Date().toISOString();
    window.saveState('notebooks', window.AppState.notebooks);
    window.showToast(`Updated notebook ${key}: ${val}`, "success");
    // No need to navigate, just keep panel open or closed based on UX. 
    // Actually, usually users change one and keep it open.
};

window.editNote = (noteIdx) => {
    const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
    if (!nb || !nb.notes) return;
    const note = nb.notes[noteIdx];
    
    window.showModal(`Edit Note: ${note.title}`, `
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="edit-note-title" class="form-control" value="${note.title}">
        </div>
        <div class="form-group">
            <label>Content (Markdown)</label>
            <textarea id="edit-note-content" class="form-control" style="min-height:300px; background:rgba(0,0,0,0.4); color:white; border-color:var(--border-color);">${note.content}</textarea>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="window.saveEditedNote(${noteIdx})">Save Changes</button>
    `);
};

window.saveEditedNote = (idx) => {
    const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
    const title = document.getElementById('edit-note-title').value;
    const content = document.getElementById('edit-note-content').value;
    
    if (nb && nb.notes[idx]) {
        nb.notes[idx].title = title;
        nb.notes[idx].content = content;
        nb.notes[idx].html = window.marked.parse(content);
        nb.notes[idx].date = new Date().toISOString();
        window.saveState('notebooks', window.AppState.notebooks);
        document.getElementById('modal-container').classList.add('hidden');
        window.navigate('notebook');
        window.showToast("Note updated!", "success");
    }
};

window.magicFormatNote = async (idx) => {
    const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
    if (!nb || !nb.notes[idx]) return;
    const note = nb.notes[idx];
    
    window.showToast("Gemini is performing magic...", "info");
    try {
        const res = await window.callGemini([{ text: `Please take the following note and reformat it for maximum clarity, adding professional structure, headers, and bullet points. Preserve all original facts but make it look like a high-quality research document.\n\nNOTE CONTENT:\n${note.content}` }], "You are a master document editor.");
        note.content = res;
        note.html = window.marked.parse(res);
        window.saveState('notebooks', window.AppState.notebooks);
        window.navigate('notebook');
        window.showToast("Note enhanced by AI!", "success");
    } catch (e) { window.showToast(e.message, "error"); }
};

window.deleteNote = (noteIdx) => {
    if (!confirm("Delete this saved note?")) return;
    const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
    if (!nb || !nb.notes) return;
    
    nb.notes.splice(noteIdx, 1);
    window.saveState('notebooks', window.AppState.notebooks);
    window.navigate('notebook'); // re-render
};

// Auto-Generate Title based on first source
window.autoGenerateNotebookTitle = async (id, contentSnippet) => {
    try {
        const nb = window.AppState.notebooks.find(n => n.id === id);
        if (!nb || (nb.title !== "New Research Project" && nb.title !== "Untitled Notebook")) return;
        
        const snippet = typeof contentSnippet === 'string' ? contentSnippet.substring(0, 5000) : "multimedia source";
        const prompt = `Based on this source content snippet, generate a short, professional, and descriptive title for a research notebook. Return ONLY the title string, no quotes or extra text.\n\nCONTENT: ${snippet}`;
        
        const aiTitle = await window.callGemini([{ text: prompt }], "You are a research librarian.");
        if (aiTitle && aiTitle.length < 100) {
            nb.title = aiTitle.trim();
            nb.updatedAt = new Date().toISOString();
            window.saveState('notebooks', window.AppState.notebooks);
            if (window.currentRoute === 'notebook' || window.currentRoute === 'notebooks') window.navigate(window.currentRoute);
            window.showToast("Notebook auto-titled!", "success");
        }
    } catch (e) { console.error("Auto-title error:", e); }
};

window.generateNotebookThumbnail = async (id, type) => {
    try {
        const nb = window.AppState.notebooks.find(n => n.id === id);
        if (!nb) return;
        nb.thumbnail = ""; 
        window.saveState('notebooks', window.AppState.notebooks);
    } catch (e) { console.error("Thumbnail error:", e); }
};

window.saveNotebookConfig = () => {
    const nbId = window.AppState.activeNotebookId;
    if (!nbId) return;
    const nb = window.AppState.notebooks.find(n => n.id === nbId);
    if (nb) {
        nb.config = {
            persona: document.getElementById('config-persona').value,
            tone: document.getElementById('config-tone').value,
            length: document.getElementById('config-length').value,
            language: document.getElementById('config-language').value
        };
        try {
            window.saveState('config', nb.config);
            window.showToast("Notebook settings saved.", "success");
            window.navigate('notebooks');
        } catch (e) {
            console.error("Config save error:", e);
        }
    }
};

// Share Notebook
window.shareNotebook = async (id) => {
    if (!window.auth || !window.auth.currentUser || !window.db) {
        return window.showToast("Please sign in to share notebooks.", "error");
    }

    const role = confirm("Click OK for Viewer (Read-only) or Cancel for Editor (Collaborative)") ? "viewer" : "editor";
    const shareId = generateId();
    
    try {
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        await setDoc(doc(window.db, "shares", shareId), {
            notebookId: id,
            ownerId: window.auth.currentUser.uid,
            role: role,
            createdAt: new Date().toISOString()
        });
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
        await navigator.clipboard.writeText(shareUrl);
        window.showToast(`Share link copied! (${role})`, "success");
    } catch (e) {
        window.showToast(`Error sharing: ${e.message}`, "error");
    }
};

window.toggleNotebookSelection = (id) => {
    const idx = window.AppState.selectedNotebookIds.indexOf(id);
    if (idx === -1) window.AppState.selectedNotebookIds.push(id);
    else window.AppState.selectedNotebookIds.splice(idx, 1);
    window.navigate('notebooks');
};

window.clearNotebookSelection = () => {
    window.AppState.selectedNotebookIds = [];
    window.navigate('notebooks');
};

window.bulkDeleteNotebooks = () => {
    if (!confirm(`Delete ${window.AppState.selectedNotebookIds.length} notebooks?`)) return;
    window.AppState.notebooks = window.AppState.notebooks.filter(nb => !window.AppState.selectedNotebookIds.includes(nb.id));
    window.AppState.selectedNotebookIds = [];
    window.saveState('notebooks', window.AppState.notebooks);
    window.navigate('notebooks');
};

window.bulkPinNotebooks = () => {
    window.AppState.notebooks.forEach(nb => {
        if (window.AppState.selectedNotebookIds.includes(nb.id)) nb.pinned = true;
    });
    window.AppState.selectedNotebookIds = [];
    window.saveState('notebooks', window.AppState.notebooks);
    window.navigate('notebooks');
};

// CHAT CONFIG & MODES
window.setChatMode = (mode) => {
    window.AppState.chatMode = mode;
    window.showToast("Chat mode set to: " + mode.replace('_', ' '), "info");
    if (window.navigate) window.navigate('notebook');
};

window.showChatConfigModal = () => {
    const tone = window.AppState.chatTone || 'neutral';
    const length = window.AppState.chatLength || 'default';
    const persona = window.AppState.chatPersona || '';

    window.showModal('AI Chat Configuration', `
        <div style="display:flex; flex-direction:column; gap:1.2rem;">
            <div>
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:0.3rem;">Response Length</label>
                <select id="config-length" class="form-control" style="width:100%;">
                    <option value="short" ${length === 'short' ? 'selected' : ''}>Short & Concise</option>
                    <option value="default" ${length === 'default' ? 'selected' : ''}>Default</option>
                    <option value="detailed" ${length === 'detailed' ? 'selected' : ''}>Detailed & Comprehensive</option>
                </select>
            </div>
            <div>
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:0.3rem;">Tone</label>
                <select id="config-tone" class="form-control" style="width:100%;">
                    <option value="formal" ${tone === 'formal' ? 'selected' : ''}>Formal / Academic</option>
                    <option value="neutral" ${tone === 'neutral' ? 'selected' : ''}>Neutral</option>
                    <option value="casual" ${tone === 'casual' ? 'selected' : ''}>Casual / Friendly</option>
                </select>
            </div>
            <div>
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:0.3rem;">AI Persona (Optional)</label>
                <input type="text" id="config-persona" class="form-control" placeholder="e.g. Socratic Tutor, Harsh Critic" value="${persona}" style="width:100%;">
            </div>
            <button class="btn btn-primary" onclick="window.saveChatConfig()" style="margin-top:0.5rem;">Save Configuration</button>
        </div>
    `);
};

window.saveChatConfig = () => {
    window.AppState.chatLength = document.getElementById('config-length').value;
    window.AppState.chatTone = document.getElementById('config-tone').value;
    window.AppState.chatPersona = document.getElementById('config-persona').value.trim();
    window.closeModal();
    window.showToast("Chat configuration saved", "success");
};

window.clearChatHistory = async () => {
    if (confirm("Are you sure you want to clear this notebook's chat history?")) {
        window.AppState.chatHistory = [];
        const nb = window.AppState.activeNotebookId ? window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId) : null;
        if (nb) {
            nb.chatHistory = [];
            if (window.saveState) await window.saveState('notebooks', window.AppState.notebooks);
        }
        if (window.navigate) window.navigate('notebook');
    }
};
