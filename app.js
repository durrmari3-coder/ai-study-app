// Lumina App Logic - Part 1: State, Helpers, Views
const AppState = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    settings: JSON.parse(localStorage.getItem('lumina_settings') || '{"studyMode":"medium","model":"gemini-2.5-flash"}'),
    rooms: JSON.parse(localStorage.getItem('lumina_rooms') || '[]'),
    currentRoomIndex: parseInt(localStorage.getItem('lumina_current_room') || '-1'),
    chatHistory: [], documents: [], quizzes: [], flashcards: [], pathways: [],
    wrongAnswers: [], overviewChat: [], presentations: [], infographics: [], overviews: [],
    activeSourceIndices: [], selectedQuizMode: 'multiple-choice', selectedComplexity: 'medium',
    activeDashboardTab: 'rooms', masteryTimeframe: 'week'
};

// Migration
if (AppState.rooms.length === 0) {
    const oldDocs = JSON.parse(localStorage.getItem('lumina_docs') || '[]');
    const oldFlashcards = JSON.parse(localStorage.getItem('lumina_flashcards') || '[]');
    const oldQuizzes = JSON.parse(localStorage.getItem('lumina_quizzes') || '[]');
    if (oldDocs.length > 0 || oldFlashcards.length > 0) {
        // Migration to grouped documents format
        const migratedDocs = oldDocs.map(d => {
            if (d.items) return d;
            return { title: d.title, date: d.date || new Date().toISOString(), items: [{ type: 'text', title: 'Original Content', content: d.content }] };
        });
        AppState.rooms.push({ id: Date.now().toString(), title: 'Default Archive', documents: migratedDocs, quizzes: oldQuizzes, flashcards: oldFlashcards, chatHistory: JSON.parse(localStorage.getItem('lumina_chat') || '[]'), pathways: [], sharedChat: [], presentations: [], infographics: [], wrongAnswers: [], overviewChat: [], overviews: [] });
        AppState.currentRoomIndex = 0;
        localStorage.setItem('lumina_rooms', JSON.stringify(AppState.rooms));
        localStorage.setItem('lumina_current_room', '0');
    }
}

// Ensure items exist in documents for current room
if (AppState.currentRoomIndex > -1 && AppState.rooms[AppState.currentRoomIndex]) {
    const r = AppState.rooms[AppState.currentRoomIndex];
    AppState.documents = (r.documents || []).map(d => {
        if (!d.items) return { ...d, items: [{ type: 'text', title: 'Content', content: d.content || '' }] };
        return d;
    });
    AppState.quizzes = r.quizzes || [];
    AppState.flashcards = r.flashcards || [];
    AppState.chatHistory = r.chatHistory || [];
    AppState.pathways = r.pathways || [];
    AppState.wrongAnswers = r.wrongAnswers || [];
    AppState.overviewChat = r.overviewChat || [];
    AppState.presentations = r.presentations || [];
    AppState.infographics = r.infographics || [];
    AppState.overviews = r.overviews || [];
}

const saveState = (key, value) => {
    if (['apiKey', 'settings'].includes(key)) {
        AppState[key] = value;
        if(key === 'apiKey') localStorage.setItem('gemini_api_key', value);
        if(key === 'settings') localStorage.setItem('lumina_settings', JSON.stringify(value));
        updateApiStatus();
    } else if (['documents', 'quizzes', 'flashcards', 'chatHistory', 'pathways', 'sharedChat', 'presentations', 'infographics', 'wrongAnswers', 'overviewChat', 'overviews'].includes(key)) {
        AppState[key] = value;
        if (AppState.currentRoomIndex > -1) {
            AppState.rooms[AppState.currentRoomIndex][key] = value;
            localStorage.setItem('lumina_rooms', JSON.stringify(AppState.rooms));
        }
    } else if (key === 'rooms') {
        AppState.rooms = value;
        localStorage.setItem('lumina_rooms', JSON.stringify(value));
    } else if (key === 'currentRoomIndex') {
        AppState.currentRoomIndex = value;
        AppState.activeSourceIndices = [];
        localStorage.setItem('lumina_current_room', value.toString());
        location.reload();
    }
};

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline';
    toast.innerHTML = `<ion-icon name="${icon}"></ion-icon> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
};

const updateApiStatus = () => {
    const el = document.getElementById('api-key-status');
    if (AppState.apiKey) { el.textContent = 'API Key Active'; el.className = 'status-badge active'; }
    else { el.textContent = 'API Key Missing'; el.className = 'status-badge missing'; }
};

window.toggleActiveSource = (index) => {
    const i = AppState.activeSourceIndices.indexOf(index);
    if(i > -1) AppState.activeSourceIndices.splice(i, 1);
    else AppState.activeSourceIndices.push(index);
    showToast(`Source ${i > -1 ? 'removed from' : 'added to'} active notebook`, 'success');
    if (window.renderSourcesSidebar) window.renderSourcesSidebar();
    if (currentRoute === 'notebook' || currentRoute === 'dashboard') navigate(currentRoute);
};

window.escapeHtml = (unsafe) => {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

window.switchNotebookTab = (tab) => {
    window._notebookTab = tab;
    navigate('notebook');
};

window.viewSavedOverview = (title, content, isMermaid) => {
    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    if (isMermaid) {
        body.innerHTML = `<span class="close-modal" onclick="window.closeModal()"><ion-icon name="close"></ion-icon></span>
            <h2 style="margin-bottom:1rem">${title}</h2>
            <div class="glass-panel"><div class="mermaid-container"><div class="mermaid"></div></div></div>`;
        body.querySelector('.mermaid').textContent = content;
        modal.classList.remove('hidden');
        if (window.mermaid) mermaid.init(undefined, body.querySelectorAll('.mermaid'));
    } else {
        body.innerHTML = `<span class="close-modal" onclick="window.closeModal()"><ion-icon name="close"></ion-icon></span>
            <h2 style="margin-bottom:1rem">${title}</h2>
            <div class="glass-panel" style="font-size:0.9rem; line-height:1.6; max-height:60vh; overflow-y:auto">${marked.parse(content)}</div>`;
        modal.classList.remove('hidden');
    }
};

window.viewSavedPresentation = (idx) => {
    const deck = AppState.presentations[idx];
    if (!deck) return;
    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    window.currentSlideIdx = 0;
    body.innerHTML = `<span class="close-modal" onclick="window.closeModal()"><ion-icon name="close"></ion-icon></span>
        <h2 style="margin-bottom:1rem">${deck.title || 'Presentation'}</h2>
        <div id="modal-studio-output"><div class="slide-carousel">${deck.slides.map((s, i) => `<div class="slide ${i===0?'active':''}"><div class="slide-title">${s.title}</div><div class="slide-subtitle">${s.subtitle || ''}</div><div class="slide-content"><ul>${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul></div></div>`).join('')}<div class="slide-controls"><button onclick="window.currentSlideIdx = Math.max(0, window.currentSlideIdx-1); window.renderSlide(window.currentSlideIdx);"><ion-icon name="arrow-back"></ion-icon></button><button onclick="window.currentSlideIdx = Math.min(${deck.slides.length-1}, window.currentSlideIdx+1); window.renderSlide(window.currentSlideIdx);"><ion-icon name="arrow-forward"></ion-icon></button></div></div></div>`;
    modal.classList.remove('hidden');
};

window.viewSavedInfographic = (idx) => {
    const info = AppState.infographics[idx];
    if (!info) return;
    window.viewSavedOverview(info.title || 'Infographic', info.code, true);
};

const getActiveContextString = () => {
    if(AppState.activeSourceIndices.length === 0) return "No active sources selected.";
    return AppState.activeSourceIndices.map(idx => {
        const d = AppState.documents[idx];
        const itemsContext = d.items.map(it => `ITEM TITLE: ${it.title}\nTYPE: ${it.type}\nCONTENT: ${it.content}`).join('\n');
        return `SOURCE GROUP: ${d.title}\nDATE: ${d.date}\n---\n${itemsContext}\n`;
    }).join('\n====================\n');
};

const getComplexityModifier = (level) => {
    const mods = {
        easy: '[EASY: Use simple vocabulary, basic concepts, beginner-friendly explanations.]\n',
        medium: '[MEDIUM: Standard academic level, clear and thorough.]\n',
        hard: '[HARD: Advanced concepts, nuanced details, challenging material.]\n',
        expert: '[EXPERT: Graduate-level depth, cutting-edge nuance, maximum rigor.]\n'
    };
    return mods[level] || mods.medium;
};

const complexitySelector = (id = 'gen-complexity') => `
    <div class="form-group">
        <label>Complexity Level</label>
        <div class="complexity-selector" id="${id}">
            <span class="complexity-chip ${AppState.selectedComplexity==='easy'?'active':''}" data-level="easy" onclick="window.setComplexity('easy',this)">Easy</span>
            <span class="complexity-chip ${AppState.selectedComplexity==='medium'?'active':''}" data-level="medium" onclick="window.setComplexity('medium',this)">Medium</span>
            <span class="complexity-chip ${AppState.selectedComplexity==='hard'?'active':''}" data-level="hard" onclick="window.setComplexity('hard',this)">Hard</span>
            <span class="complexity-chip ${AppState.selectedComplexity==='expert'?'active':''}" data-level="expert" onclick="window.setComplexity('expert',this)">Expert</span>
        </div>
    </div>`;

const customFocusInput = (id) => `
    <div class="form-group" style="margin-top: 1rem;">
        <label>Custom Focus / Prompt (Optional)</label>
        <input type="text" id="${id}" class="form-control" placeholder="e.g. Focus on definitions, or Use real-world examples..." autocomplete="off">
    </div>`;

window.setComplexity = (level, el) => {
    AppState.selectedComplexity = level;
    document.querySelectorAll('.complexity-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
};

async function callGemini(prompt, systemInstruction = "You are Lumina, a helpful AI study assistant.", inlineData = null, mimeType = "text/plain", model = null, isRetry = false) {
    if (!AppState.apiKey) throw new Error("API Key is missing. Please add it in Settings.");
    const baseModel = model || AppState.settings.model || "gemini-2.5-flash";
    const activeModel = isRetry ? "gemini-2.5-flash" : baseModel;
    
    let modeModifiers = "";
    if (AppState.settings.studyMode === "casual") modeModifiers = "[CASUAL MODE: Use simple terms, fun analogies, and be forgiving/encouraging.]\n";
    if (AppState.settings.studyMode === "exam") modeModifiers = "[EXAM MODE: Be extremely rigorous, academic, deeply thorough, and challenge the user.]\n";
    const complexMod = getComplexityModifier(AppState.selectedComplexity);
    const parts = [{ text: prompt }];
    if (inlineData) parts.push({ inlineData: inlineData });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${AppState.apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: complexMod + modeModifiers + systemInstruction }] }, generationConfig: { temperature: 0.7, responseMimeType: mimeType } })
        });

        if (!response.ok) {
            const err = await response.json();
            const errMsg = err.error?.message || "Failed to contact Gemini API";
            
            // Handle Quota Error (429)
            if (response.status === 429) {
                if (!isRetry && activeModel.includes('pro')) {
                    showToast("Primary quota reached. Falling back to Flash model...", "warning");
                    return await callGemini(prompt, systemInstruction, inlineData, mimeType, model, true);
                }
                throw new Error("Quota Capacity Reached: You've hit the Google AI limit. Please wait 60 seconds or switch to a different API key in Settings.");
            }
            throw new Error(errMsg);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        if (e.message.includes("Quota")) {
            showToast("Quota Reached: Try again in 1 minute.", "error");
        }
        throw e;
    }
}

let currentRoute = 'dashboard';
// Part 2: Views
const Views = {
    dashboard: () => `
        <div class="glass-panel dashboard-panel-root" style="position:relative;">
            <button class="dashboard-settings-btn" onclick="window.switchDashboardTab('settings')" title="API Settings">
                <ion-icon name="settings-outline"></ion-icon>
            </button>
            <div class="dashboard-hero-clip">
                <img src="dashboard_hero.png" class="dashboard-hero-img">
            </div>
            <div style="position:relative; z-index:2">
                <div class="dashboard-tabs">
                    <div class="dashboard-tab ${AppState.activeDashboardTab === 'rooms' ? 'active' : ''}" onclick="window.switchDashboardTab('rooms')">Subject Rooms</div>
                    <div class="dashboard-tab ${AppState.activeDashboardTab === 'settings' ? 'active' : ''}" onclick="window.switchDashboardTab('settings')">API Settings</div>
                </div>

                <div class="dashboard-tab-content ${AppState.activeDashboardTab === 'rooms' ? 'active' : ''}">
                    <h2 style="margin-bottom: 1.5rem; font-size: 2.5rem; font-weight:700;">Subject Rooms</h2>
                    <p style="color:var(--text-muted); margin-bottom: 2rem;">Select a subject to enter its dedicated workspace or create a new one.</p>
                    <div class="dashboard-grid">
                        ${AppState.rooms.map((r, i) => `
                            <div class="glass-panel stat-card ${AppState.currentRoomIndex === i ? 'active-source' : ''}" style="background:rgba(0,0,0,0.6); cursor:pointer; border: ${AppState.currentRoomIndex === i ? '2px solid var(--accent)' : '1px solid var(--border-color)'}" onclick="saveState('currentRoomIndex', ${i})">
                                <h3 style="color:var(--text-main); font-size: 1.25rem;">${r.title}</h3>
                                <p style="color:var(--text-muted); font-size: 0.85rem; margin-top:0.5rem">${(r.documents||[]).length} Sources â€¢ ${(r.flashcards||[]).length} Decks â€¢ ${(r.quizzes||[]).length} Quizzes</p>
                                ${AppState.currentRoomIndex === i ? '<div style="margin-top:0.75rem; color:var(--accent); font-weight:bold; font-size:0.75rem; display:flex; align-items:center; gap:0.25rem"><ion-icon name="checkmark-circle"></ion-icon> CURRENT ROOM</div>' : ''}
                            </div>
                        `).join('')}
                        <div class="glass-panel stat-card" style="background:rgba(96,165,250,0.05); cursor:pointer; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center; border: 2px dashed var(--accent); padding:2rem" onclick="window.createRoom()">
                            <div style="font-size:2.5rem; color:var(--accent)"><ion-icon name="add-circle-outline"></ion-icon></div>
                            <div style="color:var(--accent); font-weight:bold; margin-top:0.5rem">New Subject Room</div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-tab-content ${AppState.activeDashboardTab === 'settings' ? 'active' : ''}">
                    <h2 style="margin-bottom: 1.5rem; font-size: 2.5rem; font-weight:700;">API Settings</h2>
                    <p style="color:var(--text-muted); margin-bottom: 2rem;">Manage your API keys for Gemini and OpenAI models.</p>
                    
                    <div class="api-key-upload-container">
                        <div class="form-group">
                            <label>Google Gemini API Key</label>
                            <div style="display:flex; gap:0.75rem">
                                <input type="password" id="dash-api-key" class="form-control" value="${AppState.apiKey}" placeholder="AIzaSy...">
                                <button class="btn btn-primary" onclick="window.saveDashApiKey()">Save</button>
                            </div>
                        </div>

                        <div class="upload-key-box" onclick="document.getElementById('api-key-file').click()">
                            <ion-icon name="cloud-upload-outline" style="font-size:2rem; color:var(--accent); margin-bottom:0.5rem"></ion-icon>
                            <div style="font-weight:600">Upload .env or .txt file</div>
                            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem">We'll automatically find your keys</div>
                            <input type="file" id="api-key-file" style="display:none" onchange="window.handleApiKeyUpload(event)">
                        </div>
                        
                        <div id="upload-feedback" style="font-size:0.85rem; text-align:center; min-height:1.2rem"></div>

                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); text-align:center; display:flex; flex-direction:column; gap:0.75rem">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="btn btn-secondary" style="display:flex; justify-content:center; align-items:center; gap:0.5rem; text-decoration:none; width:100%">
                                <ion-icon name="key-outline"></ion-icon> Get a Free Google Gemini API Key
                            </a>
                            <a href="https://aistudio.google.com/app/plan_management" target="_blank" style="color:var(--accent); font-size:0.85rem; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:0.5rem">
                                <ion-icon name="speedometer-outline"></ion-icon> Check My Google AI Quota & Limits
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>`,
    sourceViewer: (idx) => {
        const doc = AppState.documents[idx];
        const relF = AppState.flashcards.filter(f => f.sourceIdxs && f.sourceIdxs.includes(idx));
        const relQ = AppState.quizzes.filter(q => q.sourceIdxs && q.sourceIdxs.includes(idx));
        return `<div class="source-viewer" style="max-width: 900px; margin: 0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
                <div>
                    <div class="source-viewer-title" style="margin-bottom:0.25rem">${doc.title}</div>
                    <div style="color:var(--text-muted); font-size:0.85rem">${doc.items.length} files in this source group</div>
                </div>
                <button class="btn btn-secondary" onclick="navigate('notebook')"><ion-icon name="arrow-back"></ion-icon> Back</button>
            </div>
            
            <div class="glass-panel" style="margin-bottom:2rem; padding:1.5rem">
                <h3 style="margin-bottom:1rem; font-size:1.1rem">Files in this Group</h3>
                <div style="display:flex; flex-direction:column; gap:0.5rem">
                    ${doc.items.map((it, i) => `
                        <div class="glass-panel" style="padding:1rem; background:rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center; cursor:pointer" onclick="document.getElementById('file-content-${i}').style.display=document.getElementById('file-content-${i}').style.display==='none'?'block':'none'">
                            <div style="display:flex; align-items:center; gap:0.75rem">
                                <ion-icon name="${it.type==='image'?'image-outline':'document-text-outline'}" style="color:var(--accent)"></ion-icon>
                                <span>${it.title}</span>
                            </div>
                            <ion-icon name="chevron-down-outline" style="font-size:0.8rem; color:var(--text-muted)"></ion-icon>
                        </div>
                        <div id="file-content-${i}" style="display:none; padding:1.5rem; background:rgba(0,0,0,0.2); border-radius:0.5rem; margin-top:0.25rem; font-size:0.9rem; line-height:1.6; white-space:pre-wrap; border:1px solid var(--border-color)">${it.content}</div>
                    `).join('')}
                </div>
                <button class="btn btn-primary" style="margin-top:1.5rem; width:100%" onclick="window.openIngestModal(${idx})"><ion-icon name="add-outline"></ion-icon> Add More Files to this Group</button>
            </div>

            <div style="display:flex; gap:1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                <button class="btn btn-secondary" onclick="document.getElementById('sv-gens').style.display=document.getElementById('sv-gens').style.display==='none'?'block':'none'">View Related Generations</button>
                <button class="btn btn-secondary" style="border-color:var(--error); color:var(--error); margin-left:auto" onclick="window.deleteSource(${idx})"><ion-icon name="trash-outline"></ion-icon> Delete Group</button>
            </div>
            
            <div id="sv-gens" style="display:none; margin-top:1.5rem">
                <h3 style="margin-bottom:1rem">Related Flashcards</h3>
                ${relF.map(f => `<div class="glass-panel" style="padding:1rem; margin-bottom:1rem; cursor:pointer;" onclick="navigate('flashcards')">Deck: ${f.title} (${f.cards.length} cards)</div>`).join('')}
                ${relF.length === 0 ? '<p style="color:var(--text-muted)">No flashcards generated via this source yet.</p>' : ''}
                <h3 style="margin-top:2rem; margin-bottom:1rem">Related Quizzes</h3>
                ${relQ.map(q => `<div class="glass-panel" style="padding:1rem; margin-bottom:1rem; cursor:pointer;" onclick="navigate('quizzes')">Quiz from ${new Date(q.date).toLocaleDateString()}</div>`).join('')}
                ${relQ.length === 0 ? '<p style="color:var(--text-muted)">No quizzes generated via this source yet.</p>' : ''}
            </div></div>`;
    },
    notebook: () => {
        let historyHtml = '<div style="display:flex; flex-direction:column; gap:1.5rem; padding-top:1rem;">';
        
        if (AppState.overviews && AppState.overviews.length > 0) {
            historyHtml += `<div><h3 style="margin-bottom:1rem; font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem">Overviews & Reports</h3>
            ${AppState.overviews.map(o => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); margin-bottom:1rem; cursor:pointer;" onclick="window.viewSavedOverview('${window.escapeHtml(o.title)}', '${window.escapeHtml(o.content)}', ${o.isMermaid})"><div style="font-weight:bold">${o.title}</div><div style="font-size:0.8rem; color:var(--text-muted)">${new Date(o.date).toLocaleDateString()}</div></div>`).join('')}</div>`;
        }
        
        if (AppState.presentations && AppState.presentations.length > 0) {
            historyHtml += `<div><h3 style="margin-bottom:1rem; font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem">Presentations</h3>
            ${AppState.presentations.map((p, idx) => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); margin-bottom:1rem; cursor:pointer;" onclick="window.viewSavedPresentation(${idx})"><div style="font-weight:bold">${p.title || 'Presentation'}</div><div style="font-size:0.8rem; color:var(--text-muted)">${new Date(p.date).toLocaleDateString()} &bull; ${p.slides.length} slides</div></div>`).join('')}</div>`;
        }

        if (AppState.infographics && AppState.infographics.length > 0) {
            historyHtml += `<div><h3 style="margin-bottom:1rem; font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem">Infographics</h3>
            ${AppState.infographics.map((info, idx) => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); margin-bottom:1rem; cursor:pointer;" onclick="window.viewSavedInfographic(${idx})"><div style="font-weight:bold">${info.title || 'Infographic'}</div><div style="font-size:0.8rem; color:var(--text-muted)">${new Date(info.date).toLocaleDateString()}</div></div>`).join('')}</div>`;
        }

        if ((!AppState.overviews || AppState.overviews.length===0) && (!AppState.presentations || AppState.presentations.length===0) && (!AppState.infographics || AppState.infographics.length===0)) {
            historyHtml += `<div style="text-align:center; color:var(--text-muted); padding:3rem">No saved generations yet. Go to Studio or Overviews to create some!</div>`;
        }

        historyHtml += '</div>';

        return `
        <div style="display:flex; flex-direction:column; height: 100%; max-width: 800px; margin: 0 auto; width: 100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h2 style="margin:0"><ion-icon name="chatbubbles-outline"></ion-icon> Notebook Workspace</h2>
            </div>
            
            <div class="notebook-tabs" style="display:flex; gap:1rem; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem">
                <button class="btn ${window._notebookTab === 'history' ? 'btn-secondary' : 'btn-primary'}" style="flex:1" onclick="window.switchNotebookTab('chat')">Live Chat</button>
                <button class="btn ${window._notebookTab === 'history' ? 'btn-primary' : 'btn-secondary'}" style="flex:1" onclick="window.switchNotebookTab('history')">Saved Generations</button>
            </div>

            <div id="notebook-chat-tab" style="display:${window._notebookTab === 'history' ? 'none' : 'flex'}; flex-direction:column; flex:1; min-height:0">
                <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">Your AI is strictly grounded in the sources checked in the sidebar.</p>
                <div class="chat-container" style="flex: 1;">
                    <div class="chat-history" id="chat-history-box">
                        ${AppState.chatHistory.map(msg => `<div class="chat-bubble ${msg.role}">${marked.parse(msg.content)}</div>`).join('')}
                        ${AppState.chatHistory.length === 0 ? '<div style="text-align:center; color:var(--text-muted); margin-top: 2rem;">Start asking questions about your active sources!</div>' : ''}
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="chat-input" placeholder="Ask about your active sources..." autocomplete="off">
                        <button class="btn btn-primary" id="btn-send-chat" style="padding: 0.75rem"><ion-icon name="send"></ion-icon></button>
                    </div>
                </div>
            </div>
            
            <div id="notebook-history-tab" style="display:${window._notebookTab === 'history' ? 'block' : 'none'}; flex:1; overflow-y:auto">
                ${historyHtml}
            </div>
        </div>`;
    },
    studio: () => `
        <div class="glass-panel" style="margin-bottom: 2rem;">
            <h2>Studio Generator</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Create rich visual assets derived directly from your Active Sources.</p>
            ${complexitySelector()}
            ${customFocusInput('input-studio-focus')}
            <div class="gen-config-row">
                <div class="form-group" style="max-width: 200px;"><label>Number of Slides</label><input type="number" id="input-slide-count" class="form-control" value="5" min="2" max="15"></div>
            </div>
            <div style="display:flex; gap: 1rem; margin-top:1rem;">
                <button class="btn btn-primary" id="btn-gen-slides"><ion-icon name="easel-outline"></ion-icon> Generate Presentation</button>
                <button class="btn btn-primary" id="btn-gen-infographic" style="background:linear-gradient(135deg, #10b981, #3b82f6)"><ion-icon name="analytics-outline"></ion-icon> Generate Infographic</button>
            </div>
        </div>
        <div id="studio-output" style="border-radius:1rem;"></div>`,
    settings: () => `
        <div class="glass-panel" style="max-width: 600px;">
            <h2>Settings & Study Modes</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Configure your preferences, API Keys, and difficulty level.</p>
            <div class="form-group"><label>Google Gemini API Key</label><input type="password" id="input-api-key" class="form-control" value="${AppState.apiKey}" placeholder="AIzaSy..."><div style="margin-top:0.5rem; display:flex; justify-content:space-between; align-items:center;"><p style="font-size:0.8rem; color:var(--text-muted); margin:0;">Required to run the application.</p><a href="https://aistudio.google.com/app/apikey" target="_blank" style="font-size:0.8rem; color:var(--accent); text-decoration:none; display:flex; align-items:center; gap:0.25rem"><ion-icon name="key-outline"></ion-icon> Get a free key</a></div></div>
            <div class="form-group" style="margin-top: 1.5rem"><label>AI Model</label>
                <select id="input-model" class="form-control">
                    <option value="gemini-2.5-flash" ${AppState.settings.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash (Fast)</option>
                    <option value="gemini-2.5-pro" ${AppState.settings.model === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro (Expert)</option>
                    <option value="gemini-2.0-flash-exp" ${AppState.settings.model === 'gemini-2.0-flash-exp' ? 'selected' : ''}>Gemini 2.0 Flash</option>
                    <option value="gpt-4o" ${AppState.settings.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o (requires OpenAI key)</option>
                </select></div>
            <div class="form-group" style="margin-top: 1.5rem"><label>OpenAI API Key (optional, for GPT-4o)</label><input type="password" id="input-openai-key" class="form-control" value="${AppState.settings.openaiKey||''}" placeholder="sk-..."></div>
            <div class="form-group" style="margin-top: 1.5rem"><label>Study Mode Complexity</label>
                <select id="input-study-mode" class="form-control" style="cursor:pointer">
                    <option value="casual" ${AppState.settings.studyMode === 'casual' ? 'selected' : ''}>Casual (Simple, Analogies)</option>
                    <option value="medium" ${AppState.settings.studyMode === 'medium' ? 'selected' : ''}>Medium (Standard)</option>
                    <option value="exam" ${AppState.settings.studyMode === 'exam' ? 'selected' : ''}>Exam (Extremely Rigorous)</option>
                </select><p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">Changes how AI responds globally.</p></div>
            <button class="btn btn-primary" id="btn-save-settings" style="margin-top: 1rem"><ion-icon name="save-outline"></ion-icon> Save Settings</button>
            <button class="btn btn-secondary" onclick="localStorage.clear(); location.reload();" style="margin-top:2rem; border-color:var(--error); color:var(--error)">Wipe ALL Storage</button>
        </div>`,
    pathways: () => `
        <div class="glass-panel" style="margin-bottom: 2rem;">
            <h2>Mastery Pathways</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Generate a structured learning path for a topic within this Subject Room.</p>
            <div class="form-group"><label>Topic to Master</label><input type="text" id="input-pathway-topic" class="form-control" placeholder="e.g. The Krebs Cycle"></div>
            <button class="btn btn-primary" id="btn-gen-pathway"><ion-icon name="map-outline"></ion-icon> Generate Pathway</button>
            <div id="pathway-gen-status" style="margin-top:1rem; color:var(--accent);"></div>
        </div>
        <div id="pathways-workspace">
            ${AppState.pathways.map((p, pIdx) => `
                <div class="glass-panel" style="margin-bottom: 1.5rem"><h3 style="margin-bottom: 1rem">${p.topic}</h3>
                <div style="display:flex; flex-direction:column; gap: 0.5rem;">
                    ${p.steps.map((step, sIdx) => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); padding: 1rem; border-left: 4px solid var(--accent); cursor:pointer;" onclick="window.runPathwayStep(${pIdx}, ${sIdx}, this)"><b>Step ${sIdx+1}:</b> ${step.title}<div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem">${step.description}</div><div id="pathway-content-${pIdx}-${sIdx}" style="display:none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); font-size: 0.9rem;"></div></div>`).join('')}
                </div></div>`).join('')}
        </div>`,
    quizzes: () => `
        <div class="glass-panel">
            <h2>Quizzes</h2>
            <p style="color:var(--text-muted); margin-bottom: 1.5rem;">Test your knowledge against your Active Sources.</p>
            <div class="quiz-mode-selector">
                <div class="quiz-mode-btn ${AppState.selectedQuizMode==='multiple-choice'?'active':''}" onclick="window.setQuizMode('multiple-choice',this)">
                    <ion-icon name="list-outline"></ion-icon><div class="mode-title">Multiple Choice</div><div class="mode-desc">Pick A, B, C, or D</div></div>
                <div class="quiz-mode-btn ${AppState.selectedQuizMode==='short-answer'?'active':''}" onclick="window.setQuizMode('short-answer',this)">
                    <ion-icon name="create-outline"></ion-icon><div class="mode-title">Short Answer</div><div class="mode-desc">Type your answer</div></div>
                <div class="quiz-mode-btn ${AppState.selectedQuizMode==='mam'?'active':''}" onclick="window.setQuizMode('mam',this)">
                    <ion-icon name="calculator-outline"></ion-icon><div class="mode-title">MAM Mode</div><div class="mode-desc">Solve problems</div></div>
            </div>
            ${complexitySelector('quiz-complexity')}
            ${customFocusInput('input-quiz-focus')}
            <div class="gen-config-row">
                <div class="form-group" style="max-width: 200px;"><label>Number of Questions</label><input type="number" id="input-quiz-count" class="form-control" value="5" min="1" max="100"></div>
                <button class="btn btn-primary" id="btn-gen-quiz"><ion-icon name="sparkles"></ion-icon> Generate Quiz</button>
            </div>
            <div id="quiz-result" style="margin-top:2rem;"></div>
        </div>`,
    flashcards: () => `
        <div class="glass-panel" style="min-height: 500px">
            <h2>Flashcards</h2>
            <p style="color:var(--text-muted); margin-bottom: 1.5rem;">Spaced repetition mastery built strictly from your active sources.</p>
            ${complexitySelector('fc-complexity')}
            ${customFocusInput('input-fc-focus')}
            <div class="gen-config-row">
                <div class="form-group" style="max-width: 200px;"><label>Deck Size (Cards)</label><input type="number" id="input-flashcard-count" class="form-control" value="10" min="2" max="100"></div>
                <button class="btn btn-primary" id="btn-gen-flashcards"><ion-icon name="sparkles"></ion-icon> Generate Active Deck</button>
                ${AppState.flashcards.length > 0 ? '<button class="btn btn-secondary" id="btn-view-flashcards">View Saved Decks</button>' : ''}
            </div>
            <div id="flashcard-workspace" style="margin-top: 2rem; display:flex; flex-direction:column; align-items:center;">
                <p style="color:var(--text-muted)">Generate a new deck grounded in your Active Sources or view saved decks.</p>
            </div>
        </div>`,
    overviews: () => {
        const chatMsgs = AppState.overviewChat || [];
        return `
        <div class="glass-panel" style="margin-bottom: 2rem;">
            <h2>Multi-Modal Executive Overviews</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Synthesize your Active Sources into high-impact formats powered by Gemini 3.1 Pro.</p>
            ${complexitySelector('ov-complexity')}
            ${customFocusInput('input-ov-focus')}
            <div class="overview-tool-grid">
                <button class="btn btn-primary" onclick="window.generateOverview('summary')"><ion-icon name="document-text-outline"></ion-icon> Written Summary</button>
                <button class="btn btn-primary" onclick="window.generateOverview('mindmap')" style="background:linear-gradient(135deg, #8b5cf6, #d946ef)"><ion-icon name="git-merge-outline"></ion-icon> Neural Mind Map</button>
                <button class="btn btn-primary" onclick="window.generateOverview('report')" style="background:linear-gradient(135deg, #f59e0b, #ef4444)"><ion-icon name="ribbon-outline"></ion-icon> Detailed Report</button>
                <button class="btn btn-primary" onclick="window.generateOverview('table')" style="background:linear-gradient(135deg, #10b981, #3b82f6)"><ion-icon name="table-outline"></ion-icon> Data Table</button>
            </div>
            <div id="overview-status" style="margin-top:1.5rem; color:var(--accent); font-weight:600; text-align:center;"></div>
        </div>
        <div id="overview-workspace" style="display:none; flex-direction:column; gap: 2rem;">
            <div class="glass-panel" style="background:rgba(0,0,0,0.3)">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                    <h3 id="overview-result-title" style="display:flex; align-items:center; gap:0.5rem; margin:0"><ion-icon name="sparkles" style="color:var(--accent)"></ion-icon> Result</h3>
                    <div style="display:flex; gap:0.5rem">
                        <button class="btn btn-secondary btn-sm" onclick="window.playAudioOverview()" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>
                        <button class="btn btn-secondary btn-sm" onclick="window.speechSynthesis.cancel()" title="Stop"><ion-icon name="stop-outline"></ion-icon></button>
                    </div>
                </div>
                <div id="overview-result-content" style="font-size:0.9rem; line-height:1.6"></div>
            </div>
            <div class="glass-panel" style="background:rgba(0,0,0,0.3)"><h3 style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem"><ion-icon name="logo-youtube" style="color:var(--error)"></ion-icon> Video Expansion</h3><p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">Deep dive into visual concepts from your sources.</p><div id="overview-video-links" style="display:flex; flex-wrap:wrap; gap:1rem;"></div></div>
            <div class="overview-chat-panel">
                <div class="overview-chat-header">
                    <ion-icon name="chatbubble-ellipses-outline" style="font-size:1.25rem; color:var(--accent)"></ion-icon>
                    <div>
                        <h3 style="font-size:1rem; margin:0">Live Intelligence Layer</h3>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin:0.25rem 0 0">Powered by Gemini 3.1 Pro &#8226; Full source grounding</p>
                    </div>
                    <span class="chat-model-badge">GEMINI 3.1</span>
                </div>
                <div class="overview-chat-history" id="overview-chat-history">
                    ${chatMsgs.map(msg => `<div class="chat-bubble ${msg.role}">${marked.parse(msg.content)}</div>`).join('')}
                    ${chatMsgs.length === 0 ? '<div style="text-align:center; color:var(--text-muted); margin-top: 4rem;"><ion-icon name="chatbubble-ellipses-outline" style="font-size:2.5rem; display:block; margin:0 auto 1rem; opacity:0.4"></ion-icon>Ask any question about your sources.<br><span style="font-size:0.8rem">Gemini 3.1 will answer using your full source context.</span></div>' : ''}
                </div>
                <div class="overview-chat-typing" id="overview-chat-typing">
                    <div class="typing-dots"><span></span><span></span><span></span></div>
                    Gemini 3.1 is thinking...
                </div>
                <div class="overview-chat-input-area">
                    <input type="text" id="overview-chat-input" placeholder="Ask a question about your sources..." autocomplete="off">
                    <button class="btn btn-primary" id="btn-overview-chat-send" style="padding: 0.75rem; border-radius: 2rem;"><ion-icon name="send"></ion-icon></button>
                </div>
            </div>
        </div>`;
    },
    'blur-study': () => `
        <div class="glass-panel"><h2>Blur Study</h2><p style="color:var(--text-muted); margin-bottom: 2rem;">Write down everything you remember about the Active Sources.</p>
            <div class="form-group"><label>Your Recollection</label><textarea id="blur-content" class="form-control" rows="8" placeholder="I remember that..."></textarea></div>
            <button class="btn btn-primary" id="btn-check-blur">Check Accuracy</button>
            <div id="blur-result" style="margin-top:2rem;"></div></div>`,
    'study-rooms': () => {
        const room = AppState.currentRoomIndex > -1 ? AppState.rooms[AppState.currentRoomIndex] : null;
        const sharedChat = room ? (room.sharedChat || []) : [];
        const username = localStorage.getItem('lumina_username') || 'You';
        if (!room) return `<div class="glass-panel" style="text-align:center; padding:4rem"><h2>No Room Selected</h2><p style="color:var(--text-muted); margin-top:1rem">Go to Dashboard and select or create a Subject Room first.</p><button class="btn btn-primary" style="margin-top:2rem" onclick="navigate('dashboard')">Go to Dashboard</button></div>`;
        return `<div class="study-room-grid">
            <div class="study-room-main">
                <div class="glass-panel" style="margin-bottom:1rem; padding:1rem 1.5rem; display:flex; align-items:center; gap:1rem">
                    <ion-icon name="people" style="font-size:1.5rem; color:var(--accent)"></ion-icon>
                    <div><h3 style="font-size:1.1rem">${room.title} â€” Study Room</h3><p style="font-size:0.75rem; color:var(--text-muted)">Collaborative workspace â€¢ Cross-tab sync enabled</p></div>
                    <div style="margin-left:auto"><input type="text" id="input-username" class="form-control" style="width:140px; padding:0.4rem 0.75rem; font-size:0.8rem" value="${username}" placeholder="Your name" onchange="localStorage.setItem('lumina_username', this.value)"></div>
                </div>
                <div class="chat-container" style="flex:1">
                    <div class="chat-history" id="room-chat-history">
                        ${sharedChat.map(msg => `<div class="chat-bubble ${msg.role}"><div style="font-size:0.7rem; font-weight:700; margin-bottom:0.25rem; opacity:0.6">${msg.username||'User'}</div>${marked.parse(msg.content)}</div>`).join('')}
                        ${sharedChat.length === 0 ? '<div style="text-align:center; color:var(--text-muted); margin-top:2rem">Room chat is empty. Start collaborating!</div>' : ''}
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="room-chat-input" placeholder="Chat with your study group..." autocomplete="off">
                        <button class="btn btn-primary" id="btn-room-send" style="padding: 0.75rem"><ion-icon name="send"></ion-icon></button>
                    </div>
                </div>
            </div>
            <div class="study-room-sidebar-panel">
                <div class="glass-panel" style="padding:1.25rem">
                    <h4 style="margin-bottom:0.75rem; font-size:0.9rem">Members Online</h4>
                    <div class="room-member-list">
                        <div class="room-member-badge"><span class="online-dot"></span> ${username}</div>
                    </div>
                </div>
                <div class="glass-panel" style="padding:1.25rem">
                    <h4 style="margin-bottom:0.75rem; font-size:0.9rem">Quick Actions</h4>
                    <div class="room-actions-grid">
                        <div class="room-action-btn" onclick="navigate('quizzes')"><ion-icon name="help-circle-outline"></ion-icon>Quiz</div>
                        <div class="room-action-btn" onclick="navigate('flashcards')"><ion-icon name="albums-outline"></ion-icon>Flashcards</div>
                        <div class="room-action-btn" onclick="window.roomAskAI()"><ion-icon name="sparkles"></ion-icon>Ask AI</div>
                        <div class="room-action-btn" onclick="navigate('studio')"><ion-icon name="analytics-outline"></ion-icon>Infographic</div>
                        <div class="room-action-btn" onclick="navigate('overviews')"><ion-icon name="volume-high-outline"></ion-icon>Audio</div>
                        <div class="room-action-btn" onclick="navigate('overviews')"><ion-icon name="videocam-outline"></ion-icon>Video</div>
                    </div>
                </div>
                <div class="glass-panel" style="padding:1.25rem">
                    <h4 style="margin-bottom:0.75rem; font-size:0.9rem">Room Content</h4>
                    <div style="font-size:0.8rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.5rem">
                        <div style="display:flex; justify-content:space-between"><span>Sources</span><span style="color:var(--accent); font-weight:700">${(room.documents||[]).length}</span></div>
                        <div style="display:flex; justify-content:space-between"><span>Flashcard Decks</span><span style="color:var(--accent); font-weight:700">${(room.flashcards||[]).length}</span></div>
                        <div style="display:flex; justify-content:space-between"><span>Quizzes</span><span style="color:var(--accent); font-weight:700">${(room.quizzes||[]).length}</span></div>
                    </div>
                </div>
            </div>
        </div>`;
    },
    'review-mistakes': () => {
        const wa = AppState.wrongAnswers || [];
        const mcErrors = wa.filter(w => w.type === 'quiz-mc');
        const saErrors = wa.filter(w => w.type === 'quiz-sa');
        const mamErrors = wa.filter(w => w.type === 'quiz-mam');
        const fcErrors = wa.filter(w => w.type === 'flashcard');
        const totalErrors = wa.length;

        const renderMistakeCard = (item, idx) => `
            <div class="mistake-card">
                <div class="mistake-question">${item.question}</div>
                <div class="mistake-answer-row">
                    <div class="mistake-user-answer">
                        <div class="mistake-answer-label">Your Answer</div>
                        <div style="font-size:0.9rem; margin-top:0.25rem">${item.userAnswer}</div>
                    </div>
                    <div class="mistake-correct-answer">
                        <div class="mistake-answer-label">Correct Answer</div>
                        <div style="font-size:0.9rem; margin-top:0.25rem">${item.correctAnswer}</div>
                    </div>
                </div>
                ${item.explanation ? `<div class="mistake-explanation">${item.explanation}</div>` : ''}
                <div class="mistake-meta">
                    <span>${item.sourceRoom || 'Unknown Room'} &bull; ${new Date(item.date).toLocaleDateString()}</span>
                    <button class="mistake-delete-btn" onclick="window.deleteMistake(${idx})"><ion-icon name="trash-outline"></ion-icon> Remove</button>
                </div>
            </div>`;

        const renderGroup = (title, icon, items, typeKey) => {
            if (items.length === 0) return '';
            const globalIndices = items.map(item => wa.indexOf(item));
            return `
                <div class="mistakes-group-header" onclick="const el=document.getElementById('group-${typeKey}'); el.style.display=el.style.display==='none'?'block':'none'">
                    <ion-icon name="${icon}" style="font-size:1.25rem; color:var(--accent)"></ion-icon>
                    <h3 style="font-size:1rem; margin:0">${title}</h3>
                    <span class="group-count">${items.length}</span>
                </div>
                <div id="group-${typeKey}">
                    ${items.map((item, i) => renderMistakeCard(item, globalIndices[i])).join('')}
                </div>`;
        };

        if (totalErrors === 0) {
            return `
                <div class="glass-panel mistakes-empty">
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                    <h2 style="margin-bottom:0.5rem">No Mistakes Yet!</h2>
                    <p>Take quizzes and study flashcards. Any wrong answers will appear here for review.</p>
                    <div style="display:flex; gap:1rem; justify-content:center; margin-top:2rem">
                        <button class="btn btn-primary" onclick="navigate('quizzes')"><ion-icon name="help-circle-outline"></ion-icon> Take a Quiz</button>
                        <button class="btn btn-secondary" onclick="navigate('flashcards')"><ion-icon name="albums-outline"></ion-icon> Study Flashcards</button>
                    </div>
                </div>`;
        }

        return `
            <div class="mistakes-container">
                <div class="glass-panel" style="padding:1.5rem 2rem">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem">
                        <div>
                            <h2 style="margin:0">Review Mistakes</h2>
                            <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem">Catalogue of all incorrectly answered questions and hard flashcards</p>
                        </div>
                        <div style="display:flex; gap:0.75rem">
                            <button class="btn btn-primary" id="btn-requiz-mistakes"><ion-icon name="refresh-outline"></ion-icon> Re-Quiz Me</button>
                            <button class="btn btn-secondary" style="border-color:var(--error); color:var(--error)" onclick="window.clearAllMistakes()"><ion-icon name="trash-outline"></ion-icon> Clear All</button>
                        </div>
                    </div>
                    <div class="mistakes-stats-row">
                        <div class="mistake-stat-card">
                            <div class="stat-value">${totalErrors}</div>
                            <div class="stat-label">Total Mistakes</div>
                        </div>
                        <div class="mistake-stat-card">
                            <div class="stat-value">${mcErrors.length}</div>
                            <div class="stat-label">Multiple Choice</div>
                        </div>
                        <div class="mistake-stat-card">
                            <div class="stat-value">${saErrors.length + mamErrors.length}</div>
                            <div class="stat-label">Written / MAM</div>
                        </div>
                        <div class="mistake-stat-card">
                            <div class="stat-value">${fcErrors.length}</div>
                            <div class="stat-label">Flashcards</div>
                        </div>
                    </div>
                </div>
                ${renderGroup('Multiple Choice Mistakes', 'list-outline', mcErrors, 'mc')}
                ${renderGroup('Short Answer Mistakes', 'create-outline', saErrors, 'sa')}
                ${renderGroup('MAM / Problem-Solving Mistakes', 'calculator-outline', mamErrors, 'mam')}
                ${renderGroup('Hard Flashcards', 'albums-outline', fcErrors, 'fc')}
                <div id="requiz-output" style="margin-top:1rem"></div>
            </div>`;
    },
    mastery: () => {
        const totalSources = AppState.documents.length;
        const totalQuizzes = AppState.quizzes.length;
        const totalFlashcards = AppState.flashcards.length;
        const totalMistakes = AppState.wrongAnswers.length;

        return `
            <div class="analytics-container">
                <div class="analytics-header">
                    <div>
                        <h2 style="font-size:2rem; font-weight:700">Mastery Analytics</h2>
                        <p style="color:var(--text-muted); font-size:0.9rem">Track your learning velocity and accuracy over time.</p>
                    </div>
                    <div class="time-selector">
                        <button class="time-btn ${AppState.masteryTimeframe==='day'?'active':''}" onclick="window.setMasteryTime('day')">Daily</button>
                        <button class="time-btn ${AppState.masteryTimeframe==='week'?'active':''}" onclick="window.setMasteryTime('week')">Weekly</button>
                        <button class="time-btn ${AppState.masteryTimeframe==='month'?'active':''}" onclick="window.setMasteryTime('month')">Monthly</button>
                    </div>
                </div>

                <div class="analytics-stats">
                    <div class="glass-panel ana-stat-card">
                        <div class="label">Total Sources</div>
                        <div class="value">${totalSources}</div>
                    </div>
                    <div class="glass-panel ana-stat-card" style="border-left-color: #c084fc">
                        <div class="label">Quizzes Taken</div>
                        <div class="value">${totalQuizzes}</div>
                    </div>
                    <div class="glass-panel ana-stat-card" style="border-left-color: var(--success)">
                        <div class="label">Flashcard Decks</div>
                        <div class="value">${totalFlashcards}</div>
                    </div>
                    <div class="glass-panel ana-stat-card" style="border-left-color: var(--error)">
                        <div class="label">Active Mistakes</div>
                        <div class="value">${totalMistakes}</div>
                    </div>
                </div>

                <div class="glass-panel graph-card">
                    <h3 style="font-size:1.1rem; font-weight:600">Learning Activity Pattern</h3>
                    <p style="color:var(--text-muted); font-size:0.8rem; margin-top:0.25rem">Activity markers (Quizzes, Flashcards, Mistakes) distributed over time.</p>
                    <div class="graph-container" id="mastery-graph-container">
                        <!-- SVG injected here -->
                    </div>
                    <div id="graph-tooltip" class="graph-tooltip"></div>
                </div>
            </div>`;
    }
};
// Part 3: Event Binding & Logic
let currentSlideIdx = 0;
window.renderSlide = (idx) => {
    document.querySelectorAll('.slide').forEach((el, i) => { el.className = 'slide'; if(i === idx) el.classList.add('active'); else if (i < idx) el.classList.add('prev'); });
};

window.renderSourcesSidebar = () => {
    const list = document.getElementById('global-sources-list');
    if(!list) return;
    if(AppState.documents.length === 0) { list.innerHTML = `<div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.8rem">No sources yet.<br><br>Click + to add some.</div>`; return; }
    list.innerHTML = AppState.documents.map((d, i) => {
        const isActive = AppState.activeSourceIndices.includes(i);
        return `<div class="source-item ${isActive ? 'active' : ''}" onclick="window.viewSource(${i})">
            <div class="source-checkbox" onclick="toggleActiveSource(${i}); event.stopPropagation();"></div>
            <div class="source-title" title="${d.title}">${d.title}</div>
            <div class="source-quick-view" onclick="window.quickViewSource(${i}); event.stopPropagation();" title="Quick View">
                <ion-icon name="eye-outline"></ion-icon>
            </div>
        </div>`;
    }).join('');
};

window.quickViewSource = (idx) => {
    const doc = AppState.documents[idx];
    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <span class="close-modal" onclick="window.closeModal()"><ion-icon name="close"></ion-icon></span>
        <h2>${doc.title}</h2>
        <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:1.5rem">Quick Preview of Group Contents</p>
        <div style="display:flex; flex-direction:column; gap:1rem">
            ${doc.items.map(it => `
                <div class="glass-panel" style="padding:1rem; background:rgba(255,255,255,0.03)">
                    <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem">
                        <ion-icon name="${it.type==='image'?'image-outline':'document-text-outline'}" style="color:var(--accent)"></ion-icon> ${it.title}
                    </div>
                    <div style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); max-height:100px; overflow:hidden; mask-image: linear-gradient(to bottom, black 50%, transparent 100%)">${it.content}</div>
                </div>
            `).join('')}
        </div>
        <button class="btn btn-primary" style="margin-top:1.5rem; width:100%" onclick="window.closeModal(); window.viewSource(${idx})">View Full Details</button>
    `;
    modal.classList.remove('hidden');
};

window.viewSource = (idx) => { navigate('sourceViewer'); document.getElementById('page-title').textContent = "Source Details"; document.getElementById('content-area').innerHTML = `<div class="view-section active">${Views.sourceViewer(idx)}</div>`; };

window.createRoom = () => {
    const title = prompt("Enter Subject/Room Name:");
    if (!title) return;
    const rooms = AppState.rooms;
    rooms.push({ id: Date.now().toString(), title, documents: [], quizzes: [], flashcards: [], chatHistory: [], pathways: [], sharedChat: [], presentations: [], infographics: [], wrongAnswers: [], overviewChat: [], overviews: [] });
    saveState('rooms', rooms);
    saveState('currentRoomIndex', rooms.length - 1);
};

window.closeModal = () => { const modal = document.getElementById('modal-container'); if (modal) modal.classList.add('hidden'); };

window.setQuizMode = (mode, el) => {
    AppState.selectedQuizMode = mode;
    document.querySelectorAll('.quiz-mode-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};

window.roomAskAI = async () => {
    const question = prompt("Ask the AI a question about your sources:");
    if (!question) return;
    if(AppState.activeSourceIndices.length === 0) return showToast("Select active sources first", "error");
    try {
        showToast("AI is thinking...", "success");
        const res = await callGemini(`Sources:\n${getActiveContextString()}\n\nQuestion: ${question}`, "You are a helpful study assistant. Answer based on the sources.");
        const room = AppState.rooms[AppState.currentRoomIndex];
        const username = localStorage.getItem('lumina_username') || 'You';
        if (!room.sharedChat) room.sharedChat = [];
        room.sharedChat.push({ role: 'user', content: question, username, time: Date.now() });
        room.sharedChat.push({ role: 'ai', content: res, username: 'Lumina AI', time: Date.now() });
        saveState('rooms', AppState.rooms);
        navigate('study-rooms');
    } catch(e) { showToast(e.message, 'error'); }
};

window.openIngestModal = (existingGroupIdx = -1) => {
    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    const existingGroup = existingGroupIdx > -1 ? AppState.documents[existingGroupIdx] : null;

    body.innerHTML = `
        <span class="close-modal" onclick="window.closeModal()"><ion-icon name="close"></ion-icon></span>
        <h2>${existingGroup ? `Add to: ${existingGroup.title}` : `Add New Source Group`}</h2>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.5rem">${existingGroup ? 'Select a file type to add to this existing group.' : 'Create a new group and add your first source.'}</p>
        
        <div class="ingest-tabs">
            <button class="ingest-tab active" onclick="window.switchIngestTab('manual')"><ion-icon name="create-outline"></ion-icon> Manual</button>
            <button class="ingest-tab" onclick="window.switchIngestTab('web')"><ion-icon name="globe-outline"></ion-icon> Website</button>
            <button class="ingest-tab" onclick="window.switchIngestTab('youtube')"><ion-icon name="logo-youtube"></ion-icon> YouTube</button>
        </div>

        <div id="tab-manual" class="ingest-content active">
            ${!existingGroup ? `<div class="form-group"><label>Group Title</label><input type="text" id="modal-doc-title" class="form-control" placeholder="e.g. History of Rome"></div>` : ''}
            <div class="form-group"><label>Source Content</label><textarea id="modal-doc-content" class="form-control" rows="6" placeholder="Paste your text or notes here..."></textarea></div>
            <div class="file-drop-area" onclick="document.getElementById('modal-image-upload').click()">
                <ion-icon name="image-outline"></ion-icon>
                <p>Upload image for Multimodal OCR</p>
                <input type="file" id="modal-image-upload" accept="image/*" style="display:none">
            </div>
            <div id="modal-upload-status" style="margin-top: 1rem; color: var(--accent);"></div>
            <button class="btn btn-primary" id="modal-btn-save-doc" style="margin-top:1rem; width:100%">${existingGroup ? 'Add to Group' : 'Create Group'}</button>
        </div>

        <div id="tab-web" class="ingest-content" style="display:none;">
            ${!existingGroup ? `<div class="form-group"><label>Group Title</label><input type="text" id="modal-web-group-title" class="form-control" placeholder="e.g. Web Research"></div>` : ''}
            <div class="form-group"><label>URL</label><input type="url" id="modal-web-url" class="form-control" placeholder="https://wikipedia.org/wiki/..."></div>
            <button class="btn btn-primary" id="modal-btn-fetch-web" style="width:100%">Gemini 3.1 Web Extract</button>
            <div id="modal-web-status" style="margin-top: 1rem; color: var(--accent);"></div>
        </div>

        <div id="tab-youtube" class="ingest-content" style="display:none;">
            ${!existingGroup ? `<div class="form-group"><label>Group Title</label><input type="text" id="modal-yt-group-title" class="form-control" placeholder="e.g. Video Lectures"></div>` : ''}
            <div class="form-group"><label>YouTube URL</label><input type="url" id="modal-yt-url" class="form-control" placeholder="https://youtube.com/watch?v=..."></div>
            <button class="btn btn-primary" id="modal-btn-fetch-yt" style="width:100%; background:var(--error)">Gemini 3.1 Video Intelligence</button>
            <div id="modal-yt-status" style="margin-top: 1rem; color: var(--error);"></div>
        </div>
    `;
    modal.classList.remove('hidden');

    window.switchIngestTab = (tab) => {
        document.querySelectorAll('.ingest-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.ingest-tab').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${tab}`).style.display = 'block';
        event.currentTarget.classList.add('active');
    };

    document.getElementById('modal-image-upload').onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const statusEl = document.getElementById('modal-upload-status');
        statusEl.innerHTML = `<span class="scanning-text">Gemini 3.1 analyzing multimodal data...</span>`;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Str = event.target.result.split(',')[1];
            try {
                const text = await callGemini("Please perform a deep OCR and extract all readable text perfectly. Maintain formatting.", "You are an expert multimodal agent.", { mimeType: file.type, data: base64Str }, "text/plain", "gemini-2.5-pro");
                document.getElementById('modal-doc-content').value = text;
                if (!existingGroup && !document.getElementById('modal-doc-title').value) {
                    document.getElementById('modal-doc-title').value = file.name.split('.')[0];
                }
                statusEl.innerHTML = `<span style="color:var(--success)">Intelligence extraction complete!</span>`;
            } catch (err) { statusEl.innerHTML = `<span style="color:var(--error)">Error: ${err.message}</span>`; }
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('modal-btn-save-doc').onclick = () => {
        const title = existingGroup ? 'New Addition' : document.getElementById('modal-doc-title').value;
        const content = document.getElementById('modal-doc-content').value;
        if(!title || !content) return showToast('Title and content required', 'error');
        _saveDocs({ title, content, type: 'text' }, existingGroupIdx);
    };

    document.getElementById('modal-btn-fetch-web').onclick = async () => {
        const url = document.getElementById('modal-web-url').value; if(!url) return;
        const groupTitle = existingGroup ? '' : document.getElementById('modal-web-group-title').value;
        const statusEl = document.getElementById('modal-web-status');
        statusEl.innerHTML = `<span class="scanning-text">Gemini 3.1 extracting website core...</span>`;
        try {
            // Using a broader prompt for web extraction
            const content = await callGemini(`Execute a deep extraction of all educational content from this URL: ${url}. Provide a comprehensive, clean transcript/article.`, "You are a Web Intelligence Agent powered by Gemini 3.1 Pro.");
            _saveDocs({title: url.split('/')[2] || 'Web Content', content, type: 'web'}, existingGroupIdx, groupTitle);
        } catch (fail) { statusEl.innerHTML = `<span style="color:var(--error)">${fail.message}</span>`; }
    };

    document.getElementById('modal-btn-fetch-yt').onclick = async () => {
        const url = document.getElementById('modal-yt-url').value; if(!url) return;
        const groupTitle = existingGroup ? '' : document.getElementById('modal-yt-group-title').value;
        const statusEl = document.getElementById('modal-yt-status');
        statusEl.innerHTML = `<span class="scanning-text">Gemini 3.1 analyzing video stream...</span>`;
        try {
            const content = await callGemini(`Provide a deep, timestamp-accurate educational synthesis of the video at: ${url}. Extract all key lectures, points, and nuances as if you had watched it.`, "You are a Video Intelligence Agent powered by Gemini 3.1 Pro.");
            _saveDocs({title: "Video Insights: " + (url.split('v=')[1] || 'Lecture'), content, type: 'video'}, existingGroupIdx, groupTitle);
        } catch (fail) { statusEl.innerHTML = `<span style="color:var(--error)">${fail.message}</span>`; }
    };

    function _saveDocs(item, groupIdx = -1, newGroupTitle = '') {
        if(AppState.currentRoomIndex === -1) { showToast('Create or select a room first!', 'error'); return; }
        const docs = AppState.documents;
        
        if (groupIdx > -1) {
            // Add to existing group
            docs[groupIdx].items.push(item);
            showToast('File added to group!', 'success');
        } else {
            // Create new group
            const groupTitle = newGroupTitle || item.title || 'New Source Group';
            docs.push({ 
                title: groupTitle, 
                date: new Date().toISOString(), 
                items: [item] 
            });
            showToast('New source group created!', 'success');
        }
        
        saveState('documents', docs);
        window.renderSourcesSidebar();
        window.closeModal();
        if (currentRoute === 'sourceViewer') navigate('sourceViewer'); // Refresh view
    }
};

window.deleteSource = (idx) => {
    if (!confirm('Are you sure you want to delete this source group and all its files?')) return;
    const docs = AppState.documents;
    docs.splice(idx, 1);
    // Update active indices
    AppState.activeSourceIndices = AppState.activeSourceIndices
        .filter(i => i !== idx)
        .map(i => i > idx ? i - 1 : i);
    saveState('documents', docs);
    showToast('Source group deleted', 'success');
    navigate('notebook');
    window.renderSourcesSidebar();
};

window.switchDashboardTab = (tab) => {
    AppState.activeDashboardTab = tab;
    if (currentRoute === 'dashboard') navigate('dashboard');
};

window.saveDashApiKey = () => {
    const key = document.getElementById('dash-api-key').value.trim();
    if (key) {
        saveState('apiKey', key);
        showToast('Gemini API Key saved!', 'success');
    }
};

window.handleApiKeyUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const feedback = document.getElementById('upload-feedback');
    if (feedback) {
        feedback.textContent = "Processing file...";
        feedback.style.color = "var(--accent)";
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const geminiMatch = content.match(/(?:GEMINI_API_KEY|API_KEY|key)\s*[:=]\s*["']?(AIzaSy[a-zA-Z0-9_-]{33})["']?/i) || content.match(/AIzaSy[a-zA-Z0-9_-]{33}/);
        const openaiMatch = content.match(/(?:OPENAI_API_KEY)\s*[:=]\s*["']?(sk-[a-zA-Z0-9]{48})["']?/i) || content.match(/sk-[a-zA-Z0-9]{48}/);

        let found = false;
        if (geminiMatch) {
            const key = geminiMatch[1] || geminiMatch[0];
            saveState('apiKey', key);
            found = true;
        }
        if (openaiMatch) {
            const key = openaiMatch[1] || openaiMatch[0];
            const settings = AppState.settings;
            settings.openaiKey = key;
            saveState('settings', settings);
            found = true;
        }

        if (found) {
            if (feedback) {
                feedback.textContent = "Keys extracted and saved!";
                feedback.style.color = "var(--success)";
            }
            showToast("API Keys updated from file", "success");
            navigate('dashboard');
        } else {
            if (feedback) {
                feedback.textContent = "No valid keys found in file.";
                feedback.style.color = "var(--error)";
            }
        }
    };
    reader.readAsText(file);
};

window.runPathwayStep = async (pIdx, sIdx, element) => {
    const pContent = document.getElementById(`pathway-content-${pIdx}-${sIdx}`);
    if(pContent.innerHTML.trim() !== '') { pContent.style.display = pContent.style.display === 'none' ? 'block' : 'none'; return; }
    pContent.style.display = 'block';
    pContent.innerHTML = '<span style="color:var(--accent)">Generating lesson...</span>';
    try {
        const step = AppState.pathways[pIdx].steps[sIdx];
        const res = await callGemini(`Teach a comprehensive lesson strictly focused on step: ${step.title}. Context goal: ${AppState.pathways[pIdx].topic}. Use Markdown.`, "You are a specialized Professor.");
        pContent.innerHTML = marked.parse(res);
    } catch(err) { pContent.innerHTML = `<span style="color:var(--error)">${err.message}</span>`; }
};

// Cross-tab sync for study rooms
window.addEventListener('storage', (e) => {
    if (e.key === 'lumina_rooms' && currentRoute === 'study-rooms') {
        AppState.rooms = JSON.parse(e.newValue || '[]');
        if (AppState.currentRoomIndex > -1) {
            const r = AppState.rooms[AppState.currentRoomIndex];
            if (r) { AppState.documents = r.documents || []; AppState.quizzes = r.quizzes || []; AppState.flashcards = r.flashcards || []; }
        }
        navigate('study-rooms');
    }
});
// Part 4: bindViewEvents and navigation
const bindViewEvents = (route) => {
    if (route === 'settings') {
        document.getElementById('btn-save-settings').onclick = () => {
            saveState('apiKey', document.getElementById('input-api-key').value);
            const settings = AppState.settings;
            settings.studyMode = document.getElementById('input-study-mode').value;
            settings.model = document.getElementById('input-model').value;
            settings.openaiKey = document.getElementById('input-openai-key').value;
            saveState('settings', settings);
            showToast('Settings saved successfully!');
        };
    }

    if (route === 'pathways') {
        document.getElementById('btn-gen-pathway').onclick = async () => {
            const topic = document.getElementById('input-pathway-topic').value;
            if (!topic) return showToast('Enter a topic first.', 'error');
            if(AppState.currentRoomIndex === -1) return showToast('Enter a Room first.', 'error');
            const statusEl = document.getElementById('pathway-gen-status');
            statusEl.textContent = "AI is designing your mastery curriculum...";
            try {
                const schema = `{ "steps": [ { "title": "Step Title", "description": "Short reasoning" } ] }`;
                const prompt = `Design a comprehensive learning pathway to master: "${topic}". Room: "${AppState.rooms[AppState.currentRoomIndex].title}". Return strict JSON: ${schema}`;
                const res = await callGemini(prompt, "You are a master Academic Curriculum Architect. Return raw JSON.", null, "application/json");
                const parsed = JSON.parse(res);
                const cp = AppState.pathways; cp.push({ topic, steps: parsed.steps, date: new Date().toISOString() });
                saveState('pathways', cp); navigate('pathways');
            } catch(err) { statusEl.innerHTML = `<span style="color:var(--error)">${err.message}</span>`; }
        };
    }

    if (route === 'notebook') {
        const chatBox = document.getElementById('chat-history-box');
        const input = document.getElementById('chat-input');
        chatBox.scrollTop = chatBox.scrollHeight;
        const handleSend = async () => {
            if(!input.value.trim() || AppState.activeSourceIndices.length === 0) { showToast("Need a message and at least 1 Active Source", "error"); return; }
            const userMsg = input.value; input.value = '';
            AppState.chatHistory.push({role: 'user', content: userMsg});
            saveState('chatHistory', AppState.chatHistory); navigate('notebook');
            try {
                showToast("Generating...", "success");
                const aiRes = await callGemini(`Active Sources:\n${getActiveContextString()}\n\nUser Question:\n${userMsg}`, "You are a Notebook expert guide. Answer strictly using the Active Sources. If the answer is not in context, say you don't know.");
                AppState.chatHistory.push({role: 'ai', content: aiRes});
                saveState('chatHistory', AppState.chatHistory); navigate('notebook');
            } catch (err) { showToast(err.message, "error"); }
        };
        document.getElementById('btn-send-chat').onclick = handleSend;
        input.onkeypress = (e) => { if(e.key === 'Enter') handleSend(); };
    }

    if (route === 'study-rooms') {
        const sendBtn = document.getElementById('btn-room-send');
        const inputEl = document.getElementById('room-chat-input');
        if (sendBtn && inputEl) {
            const handleRoomSend = () => {
                const msg = inputEl.value.trim(); if (!msg) return;
                inputEl.value = '';
                const room = AppState.rooms[AppState.currentRoomIndex];
                if (!room.sharedChat) room.sharedChat = [];
                const username = localStorage.getItem('lumina_username') || 'You';
                room.sharedChat.push({ role: 'user', content: msg, username, time: Date.now() });
                saveState('rooms', AppState.rooms);
                navigate('study-rooms');
            };
            sendBtn.onclick = handleRoomSend;
            inputEl.onkeypress = (e) => { if(e.key === 'Enter') handleRoomSend(); };
        }
        const chatH = document.getElementById('room-chat-history');
        if (chatH) chatH.scrollTop = chatH.scrollHeight;
    }

    if (route === 'studio') {
        const outBase = document.getElementById('studio-output');
        document.getElementById('btn-gen-slides').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select active sources first", "error");
            const slideCount = document.getElementById('input-slide-count').value || 5;
            const focus = document.getElementById('input-studio-focus')?.value.trim() || '';
            try {
                outBase.innerHTML = `<div class="glass-panel" style="text-align:center">Generating Presentation...</div>`;
                const prompt = `Based on the Active Sources, create a ${slideCount}-slide presentation. Output strict JSON: { "slides": [ { "title": "Title", "subtitle": "sub", "bullets": ["b1","b2"] } ] } \n${focus ? `\nUSER FOCUS/INSTRUCTION: ${focus}\n` : ''}\nSOURCES:\n${getActiveContextString()}`;
                const res = await callGemini(prompt, "You return JSON.", null, "application/json");
                const deck = JSON.parse(res);
                deck.title = "Presentation " + new Date().toLocaleDateString();
                deck.date = new Date().toISOString();
                const presentations = AppState.presentations;
                presentations.push(deck);
                saveState('presentations', presentations);
                currentSlideIdx = 0;
                outBase.innerHTML = `<div class="slide-carousel">${deck.slides.map((s, i) => `<div class="slide ${i===0?'active':''}"><div class="slide-title">${s.title}</div><div class="slide-subtitle">${s.subtitle || ''}</div><div class="slide-content"><ul>${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul></div></div>`).join('')}<div class="slide-controls"><button onclick="currentSlideIdx = Math.max(0, currentSlideIdx-1); renderSlide(currentSlideIdx);"><ion-icon name="arrow-back"></ion-icon></button><button onclick="currentSlideIdx = Math.min(${deck.slides.length-1}, currentSlideIdx+1); renderSlide(currentSlideIdx);"><ion-icon name="arrow-forward"></ion-icon></button></div></div>`;
            } catch (e) { outBase.innerHTML = `<div class="glass-panel"><span style="color:var(--error)">Error: ${e.message}</span></div>`; }
        };
        document.getElementById('btn-gen-infographic').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select active sources first", "error");
            const focus = document.getElementById('input-studio-focus')?.value.trim() || '';
            try {
                outBase.innerHTML = `<div class="glass-panel" style="text-align:center">Drafting MermaidJS Diagram...</div>`;
                const prompt = `Based on the Active Sources, create a Mermaid flowchart (graph TD). Format as ONLY Mermaid.js syntax without markdown backticks. Example:\ngraph TD\n    id1["Start"] --> id2["Decision (Yes/No)"]\n\nIMPORTANT: ALL node labels MUST be enclosed in double quotes (e.g., id1["Label (text)"]). Do not use unquoted text containing parentheses or brackets.\n${focus ? `\nUSER FOCUS/INSTRUCTION: ${focus}\n` : ''}\nSOURCES:\n${getActiveContextString()}`;
                let res = await callGemini(prompt, "You are a Mermaid JS expert. Output raw mermaid syntax only.");
                const match = res.match(/```(?:mermaid)?([\s\S]*?)```/);
                let mermaidCode = match ? match[1].trim() : res.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
                
                const infographics = AppState.infographics;
                infographics.push({ title: "Infographic " + new Date().toLocaleDateString(), code: mermaidCode, date: new Date().toISOString() });
                saveState('infographics', infographics);
                
                outBase.innerHTML = `<div class="glass-panel"><div class="mermaid-container"><div class="mermaid"></div></div></div>`;
                outBase.querySelector('.mermaid').textContent = mermaidCode;
                mermaid.init(undefined, outBase.querySelectorAll('.mermaid'));
            } catch (e) { outBase.innerHTML = `<div class="glass-panel"><span style="color:var(--error)">Error: ${e.message}</span></div>`; }
        };
    }

    if (route === 'flashcards') {
        const workspace = document.getElementById('flashcard-workspace');
        const viewBtn = document.getElementById('btn-view-flashcards');
        if (viewBtn) viewBtn.onclick = () => {
            workspace.innerHTML = `<div style="width:100%;"><h3 style="margin-bottom:1rem">Saved Decks</h3><div class="dashboard-grid">` + AppState.flashcards.map((f, i) => `<div class="glass-panel stat-card" style="padding:1.5rem; text-align:center; cursor:pointer;" onclick="playFlashcards(${i})"><h3 style="color:var(--text-main)">${f.title}</h3><p style="color:var(--text-muted); margin-top:0.5rem">${f.cards.length} Cards</p></div>`).join('') + `</div></div>`;
        };
        const genBtn = document.getElementById('btn-gen-flashcards');
        if (genBtn) genBtn.onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("No active sources", "error");
            const count = document.getElementById('input-flashcard-count').value || 10;
            const focus = document.getElementById('input-fc-focus')?.value.trim() || '';
            workspace.innerHTML = `<div class="glass-panel" style="text-align:center">Generating ${count} Flashcards...</div>`;
            try {
                const prompt = `Create exactly ${count} flashcards from the Active Sources. Format as pure JSON:\n{ "cards": [ { "term": "Concept", "definition": "Deep explanation", "tags": ["tag1"], "difficulty": 1 } ] }\n${focus ? `\nUSER FOCUS/INSTRUCTION: ${focus}\n` : ''}\nSOURCES:\n${getActiveContextString()}`;
                const res = await callGemini(prompt, "You are an educator. Return JSON.", null, "application/json");
                const data = JSON.parse(res);
                if(!data.cards || data.cards.length === 0) throw new Error("No cards generated.");
                const newDeck = { title: "Deck: " + new Date().toLocaleDateString(), cards: data.cards, date: new Date().toISOString(), sourceIdxs: [...AppState.activeSourceIndices] };
                const cc = AppState.flashcards; cc.push(newDeck); saveState('flashcards', cc);
                showToast("Flashcards saved!", "success");
                window.playFlashcards(cc.length - 1);
            } catch (err) { workspace.innerHTML = `<span style="color:var(--error)">Error: ${err.message}</span>`; }
        };
    }

    // Quiz modes
    if (route === 'quizzes') {
        document.getElementById('btn-gen-quiz').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("No active sources", "error");
            const resEl = document.getElementById('quiz-result');
            const count = document.getElementById('input-quiz-count').value || 5;
            const focus = document.getElementById('input-quiz-focus')?.value.trim() || '';
            const mode = AppState.selectedQuizMode;
            resEl.innerHTML = `<i>Generating ${count} ${mode} questions...</i>`;

            try {
                if (mode === 'multiple-choice') {
                    const prompt = `Create a ${count}-question multiple choice quiz from these sources. For each question provide explanations for ALL options (why each is right or wrong). Format as JSON:\n{ "quiz": [ { "question": "Q", "options": ["A","B","C","D"], "correctIndex": 0, "explanations": ["Why A...","Why B...","Why C...","Why D..."] } ] }\n${focus ? `\nUSER FOCUS/INSTRUCTION: ${focus}\n` : ''}\nSOURCES:\n${getActiveContextString()}`;
                    const result = await callGemini(prompt, "You are an expert examiner. Return JSON.", null, "application/json");
                    const data = JSON.parse(result);
                    if(!data.quiz) throw new Error("Invalid output");
                    window._mcData = data;
                    window.checkMC = (qIdx, optIdx, btn) => {
                        const q = data.quiz[qIdx]; const correct = q.correctIndex === optIdx;
                        btn.style.background = correct ? 'var(--success)' : 'var(--error)'; btn.style.color = 'white';
                        const explEl = document.getElementById('expl-' + qIdx);
                        explEl.style.display = 'block';
                        const expls = q.explanations || [q.explanation || ''];
                        explEl.innerHTML = (correct ? '<b style="color:var(--success)">✓ Correct!</b>' : `<b style="color:var(--error)">✗ Incorrect.</b> Correct answer: ${q.options[q.correctIndex]}`) + '<div style="margin-top:1rem">' + q.options.map((o, oi) => `<div style="margin-bottom:0.75rem; padding:0.5rem; border-radius:0.5rem; background:rgba(${oi===q.correctIndex?'16,185,129':'255,255,255'},0.08)"><b>${String.fromCharCode(65+oi)}. ${o}</b><br><span style="font-size:0.85rem; color:var(--text-muted)">${expls[oi] || ''}</span></div>`).join('') + '</div>';
                        if (!correct) {
                            const wa = AppState.wrongAnswers;
                            wa.push({ type: 'quiz-mc', question: q.question, userAnswer: q.options[optIdx], correctAnswer: q.options[q.correctIndex], explanation: expls[q.correctIndex] || '', date: new Date().toISOString(), sourceRoom: AppState.rooms[AppState.currentRoomIndex]?.title || 'Unknown' });
                            saveState('wrongAnswers', wa);
                        }
                    };
                    resEl.innerHTML = data.quiz.map((q, i) => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); margin-bottom:1.5rem;"><h3 style="margin-bottom:1rem; font-size:1.1rem; line-height:1.4">${i+1}. ${q.question}</h3><div style="display:flex; flex-direction:column; gap:0.5rem">${q.options.map((opt, oIdx) => `<button class="btn btn-secondary" style="text-align:left; padding:1rem; justify-content:flex-start" onclick="window.checkMC(${i}, ${oIdx}, this)">${String.fromCharCode(65+oIdx)}. ${opt}</button>`).join('')}</div><div id="expl-${i}" style="display:none; margin-top:1rem; padding:1rem; border-left:4px solid var(--accent); background:rgba(255,255,255,0.05); font-size:0.9rem"></div></div>`).join('');

                } else if (mode === 'short-answer') {
                    const prompt = `Create ${count} short-answer questions from these sources. Format as JSON:\n{ "quiz": [ { "question": "Q", "referenceAnswer": "The correct answer based on sources" } ] }\n${focus ? `\nUSER FOCUS/INSTRUCTION: ${focus}\n` : ''}\nSOURCES:\n${getActiveContextString()}`;
                    const result = await callGemini(prompt, "You are an expert examiner. Return JSON.", null, "application/json");
                    const data = JSON.parse(result);
                    if(!data.quiz) throw new Error("Invalid output");
                    window._saData = data;
                    window.checkSA = async (qIdx) => {
                        const input = document.getElementById('sa-input-' + qIdx);
                        const btn = document.getElementById('sa-btn-' + qIdx);
                        const explEl = document.getElementById('sa-expl-' + qIdx);
                        const userAns = input.value.trim(); if (!userAns) return;
                        btn.disabled = true; btn.textContent = 'Checking...';
                        try {
                            const checkPrompt = `Question: ${data.quiz[qIdx].question}\nReference Answer: ${data.quiz[qIdx].referenceAnswer}\nStudent Answer: ${userAns}\n\nSOURCES:\n${getActiveContextString()}\n\nEvaluate the student's answer. Respond with JSON: { "correct": true/false, "explanation": "why right or wrong with source references" }`;
                            const res = await callGemini(checkPrompt, "You are a fair grader. Return JSON.", null, "application/json");
                            const eval_ = JSON.parse(res);
                            explEl.style.display = 'block';
                            explEl.innerHTML = eval_.correct ? `<b style="color:var(--success)">✓ Correct!</b><br>${eval_.explanation}` : `<b style="color:var(--error)">✗ Incorrect.</b><br>${eval_.explanation}<br><br><b>Reference:</b> ${data.quiz[qIdx].referenceAnswer}`;
                            input.style.borderColor = eval_.correct ? 'var(--success)' : 'var(--error)';
                            if (!eval_.correct) {
                                const wa = AppState.wrongAnswers;
                                wa.push({ type: 'quiz-sa', question: data.quiz[qIdx].question, userAnswer: userAns, correctAnswer: data.quiz[qIdx].referenceAnswer, explanation: eval_.explanation || '', date: new Date().toISOString(), sourceRoom: AppState.rooms[AppState.currentRoomIndex]?.title || 'Unknown' });
                                saveState('wrongAnswers', wa);
                            }
                        } catch(e) { explEl.style.display = 'block'; explEl.innerHTML = `<span style="color:var(--error)">${e.message}</span>`; }
                        btn.disabled = false; btn.textContent = 'Submit';
                    };
                    resEl.innerHTML = data.quiz.map((q, i) => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); margin-bottom:1.5rem;"><h3 style="margin-bottom:1rem; font-size:1.1rem; line-height:1.4">${i+1}. ${q.question}</h3><input type="text" class="quiz-answer-input" id="sa-input-${i}" placeholder="Type your answer..."><button class="quiz-submit-btn" id="sa-btn-${i}" onclick="window.checkSA(${i})">Submit</button><div id="sa-expl-${i}" style="display:none; margin-top:1rem; padding:1rem; border-left:4px solid var(--accent); background:rgba(255,255,255,0.05); font-size:0.9rem"></div></div>`).join('');

                } else if (mode === 'mam') {
                    const prompt = `Create ${count} math/analytical problems from these sources. Each should require computation or problem-solving. Format as JSON:\n{ "quiz": [ { "question": "Problem statement", "referenceAnswer": "Step-by-step solution and final answer" } ] }\n${focus ? `\nUSER FOCUS/INSTRUCTION: ${focus}\n` : ''}\nSOURCES:\n${getActiveContextString()}`;
                    const result = await callGemini(prompt, "You are a math/science problem creator. Return JSON.", null, "application/json");
                    const data = JSON.parse(result);
                    if(!data.quiz) throw new Error("Invalid output");
                    window._mamData = data;
                    window.checkMAM = async (qIdx) => {
                        const input = document.getElementById('mam-input-' + qIdx);
                        const btn = document.getElementById('mam-btn-' + qIdx);
                        const explEl = document.getElementById('mam-expl-' + qIdx);
                        const userAns = input.value.trim(); if (!userAns) return;
                        btn.disabled = true; btn.textContent = 'Evaluating...';
                        try {
                            const checkPrompt = `Problem: ${data.quiz[qIdx].question}\nReference Solution: ${data.quiz[qIdx].referenceAnswer}\nStudent Answer: ${userAns}\n\nSOURCES:\n${getActiveContextString()}\n\nEvaluate correctness. If wrong, explain step-by-step how to solve it. JSON: { "correct": true/false, "explanation": "detailed step-by-step" }`;
                            const res = await callGemini(checkPrompt, "You are a rigorous math grader. Return JSON.", null, "application/json");
                            const eval_ = JSON.parse(res);
                            explEl.style.display = 'block';
                            explEl.innerHTML = eval_.correct ? `<b style="color:var(--success)">✓ Correct!</b><br>${marked.parse(eval_.explanation)}` : `<b style="color:var(--error)">✗ Incorrect.</b><br>${marked.parse(eval_.explanation)}<br><br><b>Full Solution:</b><br>${marked.parse(data.quiz[qIdx].referenceAnswer)}`;
                            input.style.borderColor = eval_.correct ? 'var(--success)' : 'var(--error)';
                            if (!eval_.correct) {
                                const wa = AppState.wrongAnswers;
                                wa.push({ type: 'quiz-mam', question: data.quiz[qIdx].question, userAnswer: userAns, correctAnswer: data.quiz[qIdx].referenceAnswer, explanation: eval_.explanation || '', date: new Date().toISOString(), sourceRoom: AppState.rooms[AppState.currentRoomIndex]?.title || 'Unknown' });
                                saveState('wrongAnswers', wa);
                            }
                        } catch(e) { explEl.style.display = 'block'; explEl.innerHTML = `<span style="color:var(--error)">${e.message}</span>`; }
                        btn.disabled = false; btn.textContent = 'Submit';
                    };
                    resEl.innerHTML = data.quiz.map((q, i) => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); margin-bottom:1.5rem;"><h3 style="margin-bottom:1rem; font-size:1.1rem; line-height:1.4">${i+1}. ${q.question}</h3><input type="text" class="quiz-answer-input" id="mam-input-${i}" placeholder="Enter your solution..."><button class="quiz-submit-btn" id="mam-btn-${i}" onclick="window.checkMAM(${i})">Submit</button><div id="mam-expl-${i}" style="display:none; margin-top:1rem; padding:1rem; border-left:4px solid var(--accent); background:rgba(255,255,255,0.05); font-size:0.9rem"></div></div>`).join('');
                }
                // Save quiz
                const quizzes = AppState.quizzes;
                const correctCount = mode === 'multiple-choice' ? 0 : 0; // Handled in session
                quizzes.push({ mode, date: new Date().toISOString(), sourceIdxs: [...AppState.activeSourceIndices], total: parseInt(count), correct: 0 });
                saveState('quizzes', quizzes);
            } catch(e) { resEl.innerHTML = `<span style="color:var(--error)">${e.message}</span>`; }
        };
    }

    if (route === 'overviews') {
        window.generateOverview = async (type) => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select active sources first", "error");
            const statusEl = document.getElementById('overview-status');
            const resultTitle = document.getElementById('overview-result-title');
            const resultContent = document.getElementById('overview-result-content');
            const workspace = document.getElementById('overview-workspace');
            const focus = document.getElementById('input-ov-focus')?.value.trim() || '';
            
            workspace.style.display = 'flex';
            statusEl.innerHTML = `<span class="scanning-text">Gemini 3.1 is constructing your ${type}...</span>`;
            
            try {
                let prompt = "";
                let systemMsg = "You are an expert academic synthesist powered by Gemini 3.1 Pro.";
                let isMermaid = false;
                let focusStr = focus ? `\nUSER FOCUS/INSTRUCTION: ${focus}\n` : '';

                if (type === 'summary') {
                    prompt = `Create a thorough, well-structured executive summary of the following sources. Use markdown with clear headings and bold terms.\n${focusStr}\nSOURCES:\n${getActiveContextString()}`;
                    resultTitle.innerHTML = `<ion-icon name="document-text-outline" style="color:var(--accent)"></ion-icon> Written Executive Summary`;
                } else if (type === 'mindmap') {
                    prompt = `Create a complex, detailed concept map of all key concepts in the sources using a Mermaid.js flowchart. Output ONLY raw mermaid code starting with 'graph TD'. No markdown backticks. IMPORTANT: All node labels must use double quotes like id1["Label (with parentheses)"] to prevent syntax errors.\n${focusStr}\nSOURCES:\n${getActiveContextString()}`;
                    systemMsg = "You are a Mermaid.js diagram expert. Output raw syntax only.";
                    isMermaid = true;
                    resultTitle.innerHTML = `<ion-icon name="git-merge-outline" style="color:var(--accent)"></ion-icon> Neural Concept Mind Map`;
                } else if (type === 'report') {
                    prompt = `Generate a formal, multi-page style academic report based on the sources. Include an Introduction, Analysis of key themes, and a Conclusion. Use professional markdown.\n${focusStr}\nSOURCES:\n${getActiveContextString()}`;
                    resultTitle.innerHTML = `<ion-icon name="ribbon-outline" style="color:var(--accent)"></ion-icon> Comprehensive Academic Report`;
                } else if (type === 'table') {
                    prompt = `Extract all key data points, dates, formulas, or definitions from the sources and organize them into a beautiful markdown table. Categorize appropriately.\n${focusStr}\nSOURCES:\n${getActiveContextString()}`;
                    resultTitle.innerHTML = `<ion-icon name="table-outline" style="color:var(--accent)"></ion-icon> Structured Data Table`;
                }

                let res = await callGemini(prompt, systemMsg, null, "text/plain", "gemini-2.5-pro");
                
                if (isMermaid) {
                    const match = res.match(/```(?:mermaid)?([\s\S]*?)```/);
                    res = match ? match[1].trim() : res.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
                    resultContent.innerHTML = `<div class="mermaid-container"><div class="mermaid"></div></div>`;
                    resultContent.querySelector('.mermaid').textContent = res;
                    mermaid.init(undefined, resultContent.querySelectorAll('.mermaid'));
                } else {
                    resultContent.innerHTML = marked.parse(res);
                    window._overviewText = res; // Store for audio
                }
                
                const overviews = AppState.overviews;
                const titles = { summary: 'Executive Summary', mindmap: 'Concept Mind Map', report: 'Academic Report', table: 'Data Table' };
                overviews.push({ title: titles[type] || 'Overview', content: res, isMermaid: isMermaid, date: new Date().toISOString() });
                saveState('overviews', overviews);
                
                statusEl.textContent = "";
                
                // Refresh video links
                const topicsRes = await callGemini(`Extract 3 key visual topics for video deep-dives from:\n${getActiveContextString()}\nReturn JSON: { "topics": ["topic1","topic2","topic3"] }`, "Return JSON.", null, "application/json");
                const topics = JSON.parse(topicsRes).topics || [];
                document.getElementById('overview-video-links').innerHTML = topics.map(t => `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(t)}" target="_blank" class="btn btn-secondary" style="text-decoration:none"><ion-icon name="logo-youtube"></ion-icon> ${t}</a>`).join('');
                
            } catch(e) { 
                statusEl.innerHTML = `<span style="color:var(--error)">${e.message}</span>`;
            }
        };

        window.playAudioOverview = () => {
            if (!window._overviewText) return showToast("Generate an overview/report first", "error");
            window.speechSynthesis.cancel(); // Reset any existing speech
            
            // Clean markdown for better TTS
            const cleanText = window._overviewText
                .replace(/[#*_`]/g, '')
                .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
                .substring(0, 4000); // Most browsers have a limit
                
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 1.0;
            utterance.pitch = 1;
            
            // Handle longer texts by splitting if necessary in a future update, 
            // but for now, 4000 chars is usually safe.
            window.speechSynthesis.speak(utterance);
            showToast("Playing audio narration...", "success");
        };
        // Overview Live Chat
        const ovChatInput = document.getElementById('overview-chat-input');
        const ovChatSendBtn = document.getElementById('btn-overview-chat-send');
        const ovChatHistory = document.getElementById('overview-chat-history');
        if (ovChatInput && ovChatSendBtn) {
            const handleOverviewChat = async () => {
                const msg = ovChatInput.value.trim();
                if (!msg) return;
                if (AppState.activeSourceIndices.length === 0) return showToast('Select active sources first', 'error');
                ovChatInput.value = '';
                const overviewChat = AppState.overviewChat;
                overviewChat.push({ role: 'user', content: msg, timestamp: Date.now() });
                saveState('overviewChat', overviewChat);
                ovChatHistory.innerHTML = overviewChat.map(m => `<div class="chat-bubble ${m.role}">${marked.parse(m.content)}</div>`).join('');
                ovChatHistory.scrollTop = ovChatHistory.scrollHeight;
                const typingEl = document.getElementById('overview-chat-typing');
                typingEl.classList.add('visible');
                try {
                    const conversationContext = overviewChat.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n\n');
                    const overviewContext = window._overviewText ? `\n\nEXECUTIVE OVERVIEW ALREADY GENERATED:\n${window._overviewText}` : '';
                    const fullPrompt = `FULL SOURCE MATERIAL:\n${getActiveContextString()}${overviewContext}\n\nCONVERSATION HISTORY:\n${conversationContext}\n\nRespond to the latest user message. Use markdown formatting. Be thorough and reference the source material.`;
                    const aiRes = await callGemini(fullPrompt, 'You are Lumina, a brilliant AI study assistant powered by Gemini 2.5 Pro. You have access to the user\'s complete study sources and conversation history. Provide deeply knowledgeable, well-structured answers. Always ground your answers in the provided source material. Maintain full conversation awareness.', null, 'text/plain', 'gemini-2.5-pro');
                    overviewChat.push({ role: 'ai', content: aiRes, timestamp: Date.now() });
                    saveState('overviewChat', overviewChat);
                    ovChatHistory.innerHTML = overviewChat.map(m => `<div class="chat-bubble ${m.role}">${marked.parse(m.content)}</div>`).join('');
                    ovChatHistory.scrollTop = ovChatHistory.scrollHeight;
                } catch(e) {
                    showToast(e.message, 'error');
                    overviewChat.push({ role: 'ai', content: `**Error:** ${e.message}`, timestamp: Date.now() });
                    saveState('overviewChat', overviewChat);
                    ovChatHistory.innerHTML = overviewChat.map(m => `<div class="chat-bubble ${m.role}">${marked.parse(m.content)}</div>`).join('');
                }
                typingEl.classList.remove('visible');
            };
            ovChatSendBtn.onclick = handleOverviewChat;
            ovChatInput.onkeypress = (e) => { if (e.key === 'Enter') handleOverviewChat(); };
            if (ovChatHistory) ovChatHistory.scrollTop = ovChatHistory.scrollHeight;
        }
    }

    if (route === 'blur-study') {
        document.getElementById('btn-check-blur').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("No active sources", "error");
            const memory = document.getElementById('blur-content').value;
            if(!memory) return showToast("Type recollection", "error");
            const resEl = document.getElementById('blur-result');
            resEl.innerHTML = `<i>Checking against sources...</i>`;
            try {
                const prompt = `Original Sources:\n${getActiveContextString()}\n\nStudent Memory:\n${memory}\n\nAssess accuracy, point out gaps.`;
                const result = await callGemini(prompt);
                resEl.innerHTML = `<div class="glass-panel" style="background: rgba(0,0,0,0.3)">${marked.parse(result)}</div>`;
            } catch(e) { resEl.innerHTML = `<span style="color:var(--error)">${e.message}</span>`; }
        };
    }

    if (route === 'review-mistakes') {
        const requizBtn = document.getElementById('btn-requiz-mistakes');
        if (requizBtn) {
            requizBtn.onclick = async () => {
                const wa = AppState.wrongAnswers;
                if (wa.length === 0) return showToast('No mistakes to review', 'error');
                const outputEl = document.getElementById('requiz-output');
                outputEl.innerHTML = `<div class="glass-panel" style="text-align:center"><i>Generating targeted remediation quiz from your ${wa.length} mistakes...</i></div>`;
                try {
                    const mistakesSummary = wa.slice(0, 20).map((w, i) => `${i+1}. Q: ${w.question} | Wrong: ${w.userAnswer} | Correct: ${w.correctAnswer}`).join('\n');
                    const prompt = `A student got these questions wrong:\n${mistakesSummary}\n\nCreate a ${Math.min(wa.length, 10)}-question multiple choice remediation quiz targeting EXACTLY these weak areas. Format as JSON:\n{ "quiz": [ { "question": "Q", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "Why correct" } ] }`;
                    const res = await callGemini(prompt, 'You are an expert remediation tutor. Create questions that specifically target the student\'s identified weaknesses. Return JSON.', null, 'application/json');
                    const data = JSON.parse(res);
                    if (!data.quiz) throw new Error('Invalid output');
                    window._requizData = data;
                    window.checkRequiz = (qIdx, optIdx, btn) => {
                        const q = data.quiz[qIdx]; const correct = q.correctIndex === optIdx;
                        btn.style.background = correct ? 'var(--success)' : 'var(--error)'; btn.style.color = 'white';
                        const explEl = document.getElementById('requiz-expl-' + qIdx);
                        explEl.style.display = 'block';
                        explEl.innerHTML = correct ? `<b style="color:var(--success)">Correct!</b><br>${q.explanation || ''}` : `<b style="color:var(--error)">Still wrong.</b> Correct: ${q.options[q.correctIndex]}<br>${q.explanation || ''}`;
                    };
                    outputEl.innerHTML = '<h3 style="margin-bottom:1.5rem">Remediation Quiz</h3>' + data.quiz.map((q, i) => `<div class="glass-panel" style="background:rgba(0,0,0,0.3); margin-bottom:1.5rem;"><h3 style="margin-bottom:1rem; font-size:1.1rem; line-height:1.4">${i+1}. ${q.question}</h3><div style="display:flex; flex-direction:column; gap:0.5rem">${q.options.map((opt, oIdx) => `<button class="btn btn-secondary" style="text-align:left; padding:1rem; justify-content:flex-start" onclick="window.checkRequiz(${i}, ${oIdx}, this)">${String.fromCharCode(65+oIdx)}. ${opt}</button>`).join('')}</div><div id="requiz-expl-${i}" style="display:none; margin-top:1rem; padding:1rem; border-left:4px solid var(--accent); background:rgba(255,255,255,0.05); font-size:0.9rem"></div></div>`).join('');
                } catch(e) { outputEl.innerHTML = `<span style="color:var(--error)">Error: ${e.message}</span>`; }
            };
        }
    }

    if (route === 'mastery') {
        window.renderMasteryGraph();
    }
};

window.setMasteryTime = (time) => {
    AppState.masteryTimeframe = time;
    navigate('mastery');
};

window.renderMasteryGraph = () => {
    const container = document.getElementById('mastery-graph-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const padding = 40;

    // Generate time points based on timeframe
    const now = new Date();
    let points = [];
    let labels = [];
    const timeframe = AppState.masteryTimeframe;

    if (timeframe === 'day') {
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now); d.setHours(now.getHours() - i);
            points.push({ time: d, count: 0, details: [] });
            labels.push(d.getHours() + ':00');
        }
    } else if (timeframe === 'week') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i);
            points.push({ time: d, count: 0, details: [] });
            labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        }
    } else { // month
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i);
            points.push({ time: d, count: 0, details: [] });
            if (i % 5 === 0) labels.push(d.getDate() + '/' + (d.getMonth() + 1));
            else labels.push('');
        }
    }

    // Populate data
    const allEvents = [
        ...AppState.quizzes.map(q => ({ date: new Date(q.date), type: 'Quiz' })),
        ...AppState.flashcards.map(f => ({ date: new Date(f.date), type: 'Flashcard' })),
        ...AppState.wrongAnswers.map(w => ({ date: new Date(w.date), type: 'Mistake' }))
    ];

    allEvents.forEach(ev => {
        const idx = points.findIndex(p => {
            if (timeframe === 'day') return ev.date.getHours() === p.time.getHours() && ev.date.getDate() === p.time.getDate();
            return ev.date.toDateString() === p.time.toDateString();
        });
        if (idx > -1) {
            points[idx].count++;
            points[idx].details.push(ev.type);
        }
    });

    const maxCount = Math.max(...points.map(p => p.count), 5);
    const stepX = (width - padding * 2) / (points.length - 1);
    const scaleY = (height - padding * 2) / maxCount;

    const getX = (i) => padding + i * stepX;
    const getY = (count) => height - padding - count * scaleY;

    let pathD = `M ${getX(0)} ${getY(points[0].count)}`;
    let areaD = `M ${getX(0)} ${height - padding} L ${getX(0)} ${getY(points[0].count)}`;

    points.forEach((p, i) => {
        if (i > 0) {
            const prevX = getX(i - 1);
            const prevY = getY(points[i - 1].count);
            const currX = getX(i);
            const currY = getY(p.count);
            // Smooth curve
            const cp1x = prevX + (currX - prevX) / 2;
            pathD += ` C ${cp1x} ${prevY}, ${cp1x} ${currY}, ${currX} ${currY}`;
        }
    });

    areaD += pathD.substring(1) + ` L ${getX(points.length - 1)} ${height - padding} Z`;

    const svg = `
        <svg class="graph-svg">
            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <!-- Grid Lines -->
            ${[0, 0.25, 0.5, 0.75, 1].map(v => `<line class="graph-grid" x1="${padding}" y1="${getY(maxCount * v)}" x2="${width - padding}" y2="${getY(maxCount * v)}"/>`).join('')}
            
            <!-- Area & Path -->
            <path d="${areaD}" fill="url(#areaGradient)"/>
            <path d="${pathD}" class="graph-path"/>
            
            <!-- Labels -->
            ${labels.map((l, i) => l ? `<text class="graph-label" x="${getX(i)}" y="${height - 10}" text-anchor="middle">${l}</text>` : '').join('')}
            
            <!-- Points -->
            ${points.map((p, i) => `<circle class="graph-point" cx="${getX(i)}" cy="${getY(p.count)}" onmouseover="window.showGraphTooltip(event, '${p.time.toLocaleString()}', ${p.count}, '${p.details.join(', ')}')" onmouseout="window.hideGraphTooltip()"/>`).join('')}
        </svg>`;

    container.innerHTML = svg;
};

window.showGraphTooltip = (e, time, count, details) => {
    const tt = document.getElementById('graph-tooltip');
    if (!tt) return;
    tt.style.opacity = '1';
    tt.style.left = (e.pageX + 10) + 'px';
    tt.style.top = (e.pageY - 40) + 'px';
    tt.innerHTML = `<strong>${time}</strong><br>Activity: ${count}${details ? `<br><small>${details}</small>` : ''}`;
};

window.hideGraphTooltip = () => {
    const tt = document.getElementById('graph-tooltip');
    if (tt) tt.style.opacity = '0';
};

window.playFlashcards = (deckIndex) => {
    const deck = AppState.flashcards[deckIndex]; if(!deck) return;
    let currentCard = 0;
    const renderCard = () => {
        const workspace = document.getElementById('flashcard-workspace'); if(!workspace) return;
        const card = deck.cards[currentCard];
        workspace.innerHTML = `
            <div style="text-align:center; margin-bottom: 1rem; color:var(--text-muted); width: 100%;">Card ${currentCard + 1} of ${deck.cards.length}${card.tags && card.tags.length > 0 ? `<br><span style="font-size:0.8rem; color:var(--accent)">Tags: ${card.tags.join(', ')}</span>` : ''}</div>
            <div class="flashcard-container" onclick="this.classList.toggle('flipped')"><div class="flashcard"><div class="front"><h3 style="font-size:1.5rem; text-align:center;">${card.term}</h3><div style="margin-top:auto; font-size:0.8rem; color:rgba(255,255,255,0.3)">Click to flip</div></div><div class="back"><p style="text-align:center; line-height:1.6; font-size: 1.1rem">${card.definition}</p><div style="margin-top:auto; font-size:0.8rem; color:rgba(255,255,255,0.3)">Click to flip</div></div></div></div>
            <div style="display:flex; justify-content:center; gap: 0.5rem; margin-top: 2rem; width: 100%;">
                <button class="btn btn-secondary" style="font-size:0.8rem; padding:0.5rem 1rem" onclick="window._trackFlashcardWrong(${deckIndex}, ${currentCard}); showToast('Marked Hard \u2014 added to Review Mistakes'); document.getElementById('btn-next-card').click()">Hard</button>
                <button class="btn btn-secondary" style="font-size:0.8rem; padding:0.5rem 1rem" onclick="showToast('Marked Medium'); document.getElementById('btn-next-card').click()">Medium</button>
                <button class="btn btn-primary" style="font-size:0.8rem; padding:0.5rem 1rem" onclick="showToast('Marked Easy'); document.getElementById('btn-next-card').click()">Easy</button>
            </div>
            <div style="display:flex; justify-content:space-between; width: 100%; max-width: 400px; margin-top: 1rem;">
                <button class="btn btn-secondary" id="btn-prev-card" style="border:none;background:transparent" ${currentCard===0 ? 'disabled':''}><ion-icon name="arrow-back"></ion-icon> Prev</button>
                <button class="btn btn-secondary" id="btn-next-card" style="border:none;background:transparent" ${currentCard===deck.cards.length-1 ? 'disabled':''}>Next <ion-icon name="arrow-forward"></ion-icon></button>
            </div>`;
        document.getElementById('btn-prev-card').onclick = () => { if(currentCard > 0) { currentCard--; renderCard(); } };
        document.getElementById('btn-next-card').onclick = () => { if(currentCard < deck.cards.length - 1) { currentCard++; renderCard(); } };
    };
    renderCard();
};

// Global helpers for wrong answer tracking
window._trackFlashcardWrong = (deckIndex, cardIndex) => {
    const deck = AppState.flashcards[deckIndex];
    if (!deck || !deck.cards[cardIndex]) return;
    const card = deck.cards[cardIndex];
    const wa = AppState.wrongAnswers;
    wa.push({ type: 'flashcard', question: card.term, userAnswer: 'Marked as Hard', correctAnswer: card.definition, explanation: '', date: new Date().toISOString(), sourceRoom: AppState.rooms[AppState.currentRoomIndex]?.title || 'Unknown' });
    saveState('wrongAnswers', wa);
};

window.deleteMistake = (idx) => {
    const wa = AppState.wrongAnswers;
    if (idx >= 0 && idx < wa.length) {
        wa.splice(idx, 1);
        saveState('wrongAnswers', wa);
        navigate('review-mistakes');
        showToast('Mistake removed', 'success');
    }
};

window.clearAllMistakes = () => {
    if (!confirm('Clear all tracked mistakes? This cannot be undone.')) return;
    saveState('wrongAnswers', []);
    navigate('review-mistakes');
    showToast('All mistakes cleared', 'success');
};

window.navigate = (route) => {
    currentRoute = route;
    const content = document.getElementById('content-area');
    const title = document.getElementById('page-title');
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-links li[data-route="${route}"]`);
    if(activeNav) activeNav.classList.add('active');
    title.textContent = route.charAt(0).toUpperCase() + route.slice(1).replace('-', ' ');
    if (Views[route]) { 
        content.innerHTML = `<div class="view-section active">${Views[route]()}</div>`; 
        bindViewEvents(route); 
        content.scrollTop = 0; // Reset scroll on navigation
    }
    if(window.mermaid) mermaid.initialize({ startOnLoad: false, theme: 'default' });
};

document.addEventListener('DOMContentLoaded', () => {
    updateApiStatus();
    if(window.renderSourcesSidebar) window.renderSourcesSidebar();
    document.querySelectorAll('.nav-links li').forEach(li => { li.addEventListener('click', () => { navigate(li.dataset.route); }); });
    navigate('dashboard');
});
