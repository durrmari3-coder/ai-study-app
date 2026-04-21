import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyABoww644_-Z1D9uqH2Mdt7vC9kC6b_4zE",
    authDomain: "lumina-9f61d.firebaseapp.com",
    projectId: "lumina-9f61d",
    storageBucket: "lumina-9f61d.firebasestorage.app",
    messagingSenderId: "460396663674",
    appId: "1:460396663674:web:e120212a33a6c0193c7cc3",
    measurementId: "G-07VKYN007T"
};

let app, auth;
try {
    // We wrap in a try-catch so the app doesn't break if the config is invalid/placeholder
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
} catch (e) {
    console.warn("Firebase not configured properly:", e);
}

// ==========================================
// STATE PERSISTENCE (LocalStorage)
// ==========================================

// Global App State
// Model fallback chain — if primary hits quota, we retry down the list
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

const AppState = {
    apiKey: '',
    settings: { studyMode: "medium", model: "gemini-2.5-flash" },
    rooms: [],
    currentRoomIndex: -1,
    chatHistory: [], documents: [], quizzes: [], flashcards: [], pathways: [],
    wrongAnswers: [], overviewChat: [], presentations: [], infographics: [], overviews: [],
    activeSourceIndices: [], selectedQuizMode: 'multiple-choice', selectedComplexity: 'medium',
    activeDashboardTab: 'rooms', masteryTimeframe: 'week'
};

let currentRoute = 'dashboard';

/**
 * Saves state to LocalStorage.
 */
const saveState = (key, value) => {
    AppState[key] = value;
    
    try {
        if (['apiKey', 'settings', 'currentRoomIndex'].includes(key)) {
            localStorage.setItem(`lumina_${key}`, JSON.stringify(value));
            if (key === 'apiKey') updateApiStatus();
            if (key === 'currentRoomIndex' && value > -1) {
                AppState.activeSourceIndices = [];
                location.reload(); 
            }
        } else if (['documents', 'quizzes', 'flashcards', 'chatHistory', 'pathways', 'sharedChat', 'presentations', 'infographics', 'wrongAnswers', 'overviewChat', 'overviews'].includes(key)) {
            if (AppState.currentRoomIndex > -1) {
                const room = AppState.rooms[AppState.currentRoomIndex];
                room[key] = value;
                localStorage.setItem('lumina_rooms', JSON.stringify(AppState.rooms));
            }
        } else if (key === 'rooms') {
            localStorage.setItem('lumina_rooms', JSON.stringify(value));
        }
    } catch (error) {
        console.error("Save Error:", error);
    }
};

/**
 * Loads all data from LocalStorage.
 */
const loadLocalData = () => {
    try {
        AppState.apiKey = JSON.parse(localStorage.getItem('lumina_apiKey')) || '';
        AppState.settings = JSON.parse(localStorage.getItem('lumina_settings')) || AppState.settings;
        AppState.currentRoomIndex = JSON.parse(localStorage.getItem('lumina_currentRoomIndex')) ?? -1;
        AppState.rooms = JSON.parse(localStorage.getItem('lumina_rooms')) || [];

        if (AppState.currentRoomIndex > -1 && AppState.rooms[AppState.currentRoomIndex]) {
            const r = AppState.rooms[AppState.currentRoomIndex];
            AppState.documents = r.documents || [];
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
    } catch (error) {
        console.error("Load error:", error);
    }
};

/**
 * Core AI Interaction Layer (Gemini API) — with automatic model fallback
 */
const callGemini = async (prompt, systemInstruction = '', history = [], responseMimeType = 'text/plain', modelOverride = '') => {
    const key = AppState.apiKey;
    if (!key) throw new Error("API Key Missing. Please go to Settings and enter your Gemini API key.");
    
    const primaryModel = modelOverride || AppState.settings.model || 'gemini-1.5-flash';
    
    // Build fallback list: primary first, then rest of FALLBACK_MODELS (deduped)
    const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];
    
    const contents = [];
    if (history && history.length > 0) {
        history.forEach(h => {
            contents.push({ role: h.role === 'ai' ? 'model' : 'user', parts: [{ text: h.content }] });
        });
    }
    const promptParts = Array.isArray(prompt) ? prompt : [{ text: prompt }];
    contents.push({ role: 'user', parts: promptParts });

    const body = {
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
            temperature: 0.7,
            responseMimeType: responseMimeType === 'application/json' ? 'application/json' : 'text/plain'
        }
    };

    let lastError = null;
    for (const model of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json();
                const status = response.status;
                const msg = errData.error?.message || 'Gemini API Error';
                
                // On quota/rate-limit errors, try next model in the fallback chain
                if (status === 429 || status === 503 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
                    console.warn(`Model ${model} quota hit, trying next fallback...`);
                    lastError = new Error(`Quota Capacity Reached: You've hit the Google AI limit on model "${model}". Please wait 60 seconds or switch to a different API key in Settings.`);
                    continue; // try next model
                }
                throw new Error(msg);
            }

            const data = await response.json();
            if (!data.candidates || !data.candidates[0]?.content) {
                throw new Error('Empty or blocked response from AI. Try a different source or topic.');
            }
            
            // If we fell back to a different model, let the user know
            if (model !== primaryModel) {
                showToast(`Note: Using ${model} (primary model hit quota limit).`, 'success');
            }
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            if (err.message.includes('Quota Capacity Reached')) {
                lastError = err;
                continue; // try next model
            }
            throw err; // re-throw non-quota errors immediately
        }
    }
    
    // All models exhausted
    throw lastError || new Error('All models failed. Please check your API key in Settings.');
};

/**
 * Safely parse JSON, stripping markdown code fences if present.
 */
const parseJsonSafe = (text) => {
    // Strip ```json ... ``` or ``` ... ``` wrappers that models sometimes add
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
};

// ==========================================
// UI UTILITIES
// ==========================================

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline';
    toast.innerHTML = `<ion-icon name="${icon}"></ion-icon> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
};

const updateApiStatus = () => {
    const el = document.getElementById('api-key-status');
    if (!el) return;
    if (AppState.apiKey) { el.textContent = 'API Key Active'; el.className = 'status-badge active'; }
    else { el.textContent = 'API Key Missing'; el.className = 'status-badge missing'; }
};

const getActiveContextString = () => {
    if(AppState.activeSourceIndices.length === 0) return "No active sources selected.";
    return AppState.activeSourceIndices.map(idx => {
        const d = AppState.documents[idx];
        if (!d) return "";
        const itemsContext = (d.items || []).map(it => {
            if (it.type === 'text' || it.type === 'url') return `ITEM TITLE: ${it.title}\nTYPE: ${it.type}\nCONTENT: ${it.content}`;
            return `ITEM TITLE: ${it.title}\nTYPE: ${it.type}\n[Content is binary/media]`;
        }).join('\n');
        return `SOURCE GROUP: ${d.title}\n---\n${itemsContext}\n`;
    }).join('\n====================\n');
};

const getActiveContextParts = () => {
    if(AppState.activeSourceIndices.length === 0) return [{text: "No active sources selected."}];
    const parts = [];
    let textContext = "";
    AppState.activeSourceIndices.forEach(idx => {
        const d = AppState.documents[idx];
        if (!d) return;
        textContext += `SOURCE GROUP: ${d.title}\n---\n`;
        (d.items || []).forEach(it => {
            if (it.type === 'text' || it.type === 'url') {
                textContext += `ITEM TITLE: ${it.title}\nTYPE: ${it.type}\nCONTENT: ${it.content}\n`;
            } else if (it.type === 'image' || it.type === 'pdf' || it.type === 'video') {
                parts.push({
                    inlineData: {
                        mimeType: it.mimeType,
                        data: it.content
                    }
                });
                textContext += `ITEM TITLE: ${it.title}\nTYPE: ${it.type}\n[Content sent as inline media]\n`;
            }
        });
        textContext += `\n====================\n`;
    });
    parts.unshift({text: textContext});
    return parts;
};

window.renderSourcesSidebar = () => {
    const list = document.getElementById('global-sources-list');
    if (!list) return;
    list.innerHTML = AppState.documents.length === 0 ? '<p style="padding: 1rem; color:var(--text-muted); text-align:center">No sources yet.</p>' : 
        AppState.documents.map((d, i) => `
            <div class="source-item ${AppState.activeSourceIndices.includes(i) ? 'active' : ''}" onclick="window.toggleSource(${i})">
                <ion-icon name="${d.type === 'web' ? 'globe-outline' : 'document-text-outline'}"></ion-icon>
                <div class="source-info">
                    <div class="source-name">${d.title}</div>
                    <div class="source-meta">${(d.items || []).length} chunks</div>
                </div>
                <button class="source-delete" onclick="event.stopPropagation(); window.deleteSource(${i})"><ion-icon name="trash-outline"></ion-icon></button>
            </div>
        `).join('');
};

window.toggleSource = (idx) => {
    const i = AppState.activeSourceIndices.indexOf(idx);
    if (i > -1) AppState.activeSourceIndices.splice(i, 1);
    else AppState.activeSourceIndices.push(idx);
    window.renderSourcesSidebar();
};

window.deleteSource = (idx) => {
    if(!confirm("Delete this source group?")) return;
    AppState.documents.splice(idx, 1);
    saveState('documents', AppState.documents);
    window.renderSourcesSidebar();
};

window.openIngestModal = () => {
    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');
    body.innerHTML = `
        <div class="glass-panel" style="width: 100%;">
            <h2 style="margin-bottom: 2rem">Add Research Source</h2>
            
            <div class="ingest-tabs">
                <button class="ingest-tab active" onclick="window.switchIngestTab('text')"><ion-icon name="text-outline"></ion-icon> Text</button>
                <button class="ingest-tab" onclick="window.switchIngestTab('url')"><ion-icon name="link-outline"></ion-icon> URL</button>
                <button class="ingest-tab" onclick="window.switchIngestTab('file')"><ion-icon name="document-attach-outline"></ion-icon> File</button>
            </div>
            
            <div class="form-group"><label>Source Title</label><input type="text" id="ingest-title" class="form-control" placeholder="e.g. Biology Chapter 1"></div>
            
            <div id="ingest-content-text" class="ingest-content active">
                <div class="form-group"><label>Content</label><textarea id="ingest-content" class="form-control" rows="8" placeholder="Paste your study material here..."></textarea></div>
            </div>
            
            <div id="ingest-content-url" class="ingest-content" style="display:none">
                <div class="form-group"><label>Website URL</label><input type="url" id="ingest-url" class="form-control" placeholder="https://..."></div>
            </div>
            
            <div id="ingest-content-file" class="ingest-content" style="display:none">
                <div class="form-group"><label>Upload File</label>
                <input type="file" id="ingest-file" class="form-control" accept="image/*,application/pdf,video/mp4">
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem">Supported: PDF, Images, MP4 (max 20MB)</p>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap: 1rem; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancel</button>
                <button class="btn btn-primary" onclick="window.processIngest()">Add Source</button>
            </div>
            <input type="hidden" id="ingest-type" value="text">
        </div>`;
};

window.switchIngestTab = (type) => {
    document.querySelectorAll('.ingest-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.ingest-content').forEach(el => el.style.display = 'none');
    
    event.currentTarget.classList.add('active');
    document.getElementById('ingest-content-' + type).style.display = 'block';
    document.getElementById('ingest-type').value = type;
};

window.processIngest = async () => {
    const title = document.getElementById('ingest-title').value;
    const type = document.getElementById('ingest-type').value;
    if (!title) return showToast("Title is required", "error");
    
    let content = "", mimeType = "", actualType = 'text';
    let isLargeMedia = false;
    
    try {
        if (type === 'text') {
            content = document.getElementById('ingest-content').value;
            if(!content) return showToast("Content required", "error");
        } else if (type === 'url') {
            content = document.getElementById('ingest-url').value;
            if(!content) return showToast("URL required", "error");
            actualType = 'url';
        } else if (type === 'file') {
            const fileInput = document.getElementById('ingest-file');
            if(!fileInput.files.length) return showToast("File required", "error");
            const file = fileInput.files[0];
            actualType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'pdf');
            mimeType = file.type;
            
            // Check if file is > 4MB (will likely crash localStorage)
            if (file.size > 4 * 1024 * 1024) isLargeMedia = true;
            
            content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }
        
        const newDoc = { title, type: actualType, items: [{ title: 'Main Content', type: actualType, mimeType, content, isLargeMedia }] };
        AppState.documents.push(newDoc);
        
        // Before saving to localStorage, strip massive content to prevent quota crash
        const safeDocs = AppState.documents.map(doc => {
            return {
                ...doc,
                items: doc.items.map(it => it.isLargeMedia ? { ...it, content: "[CONTENT STRIPPED FOR STORAGE LIMITS]" } : it)
            }
        });
        
        saveState('documents', safeDocs);
        
        document.getElementById('modal-container').classList.add('hidden');
        window.renderSourcesSidebar();
        
        if (isLargeMedia) {
            showToast("Large file added! It will be available for this session only.", "warning");
        } else {
            showToast("Source added successfully!");
        }
    } catch (e) {
        showToast("Error processing source", "error");
    }
};

const getComplexityModifier = (level) => {
    const mods = {
        easy: '[EASY: Simple vocab, basic concepts.]\n',
        medium: '[MEDIUM: Standard academic level.]\n',
        hard: '[HARD: Advanced, nuanced.]\n',
        expert: '[EXPERT: Maximum rigor.]\n'
    };
    return mods[level] || mods.medium;
};

// ==========================================
// VIEWS & TEMPLATES
// ==========================================

function complexitySelector(id) {
    return `<div class="form-group" style="margin:0">
        <label style="font-weight: 600; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">Complexity Level</label>
        <div class="complexity-pill-container" style="background: rgba(255,255,255,0.05); padding: 0.25rem; border-radius: 0.5rem; display: flex; gap: 0.25rem;">
            <div class="complexity-pill" onclick="window.setComplexity(this, '${id}')" style="flex:1; text-align:center; padding: 0.5rem; border-radius: 0.4rem; cursor:pointer; font-weight: 600; font-size: 0.8rem;" data-value="easy">Easy</div>
            <div class="complexity-pill active" onclick="window.setComplexity(this, '${id}')" style="flex:1; text-align:center; padding: 0.5rem; border-radius: 0.4rem; cursor:pointer; font-weight: 600; font-size: 0.8rem;" data-value="medium">Standard</div>
            <div class="complexity-pill" onclick="window.setComplexity(this, '${id}')" style="flex:1; text-align:center; padding: 0.5rem; border-radius: 0.4rem; cursor:pointer; font-weight: 600; font-size: 0.8rem;" data-value="hard">Hard</div>
            <div class="complexity-pill" onclick="window.setComplexity(this, '${id}')" style="flex:1; text-align:center; padding: 0.5rem; border-radius: 0.4rem; cursor:pointer; font-weight: 600; font-size: 0.8rem;" data-value="expert">Expert</div>
        </div>
        <input type="hidden" id="${id}" value="medium">
    </div>`;
}

function countSelector(id, defaultValue) {
    return `<div class="form-group" style="margin:0">
        <label style="font-weight: 600; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">Amount</label>
        <input type="number" id="${id}" class="form-control" value="${defaultValue}" min="1" max="50">
    </div>`;
}

function customFocusInput(id) {
    return `<div class="form-group" style="margin:0">
        <label style="font-weight: 600; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">Custom Focus (Optional)</label>
        <input type="text" id="${id}" class="form-control" placeholder="e.g. Focus on definitions..." autocomplete="off">
    </div>`;
}

const Views = {
    dashboard: () => `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Dashboard</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Welcome back to your research workspace.</p>
            <div class="dashboard-grid">
                ${AppState.rooms.map((r, i) => `
                    <div class="glass-panel stat-card ${AppState.currentRoomIndex === i ? 'active-source' : ''}" 
                         style="background:rgba(255,255,255,0.05); cursor:pointer" 
                         onclick="window.setActiveRoom(${i})">
                         <ion-icon name="folder-open-outline" style="font-size: 1.5rem; color:var(--accent); margin-bottom: 1rem"></ion-icon>
                        <h3>${r.title}</h3>
                        <p style="color:var(--text-muted); font-size: 0.8rem;">${(r.documents||[]).length} Sources &bull; ${(r.flashcards||[]).length} Decks</p>
                    </div>
                `).join('')}
                <div class="glass-panel stat-card" style="background:rgba(255,255,255,0.02); cursor:pointer; text-align:center; border: 1px dashed var(--border-color)" onclick="window.createRoom()">
                    <ion-icon name="add-outline" style="font-size:2rem; color:var(--accent); margin-bottom: 0.5rem"></ion-icon>
                    <div style="color:var(--accent); font-weight:600;">Create New Room</div>
                </div>
            </div>
        </div>`,
    notebook: () => `
        <div style="display:flex; flex-direction:column; height: 100%; max-width: 1000px; margin: 0 auto; width: 100%;">
            <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 2rem">Research Hub</h2>
            <div class="chat-container" style="flex: 1;">
                <div class="chat-history" id="chat-history-box">
                    ${AppState.chatHistory.map(msg => `<div class="chat-bubble ${msg.role}">${marked.parse(msg.content)}</div>`).join('')}
                </div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Query your research context..." autocomplete="off">
                    <button class="btn btn-primary" id="btn-send-chat"><ion-icon name="send"></ion-icon></button>
                </div>
            </div>
        </div>`,
    studio: () => {
        const presentations = AppState.presentations || [];
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Creative Studio</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Generate academic presentations and visual aids.</p>
            <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color)">
                ${customFocusInput('input-studio-focus')}
                ${complexitySelector('studio-complexity')}
                ${countSelector('input-studio-count', 5)}
            </div>
            <div class="studio-generator-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="studio-gen-card glass-panel" onclick="window.generateStudio('presentation')" style="cursor:pointer; padding: 1.5rem; background: rgba(255,255,255,0.03)">
                    <ion-icon name="easel-outline" style="font-size:1.5rem; color:var(--accent)"></ion-icon>
                    <h3>Academic Presentation</h3>
                    <p>Structured slide deck analysis.</p>
                </div>
                <div class="studio-gen-card glass-panel" onclick="window.generateStudio('mindmap')" style="cursor:pointer; padding: 1.5rem; background: rgba(255,255,255,0.03)">
                    <ion-icon name="git-branch-outline" style="font-size:1.5rem; color:var(--accent)"></ion-icon>
                    <h3>Neural Map</h3>
                    <p>Visual relationship graph.</p>
                </div>
            </div>
            <div id="studio-status" style="margin-top:2rem; text-align:center; font-weight:600; color:var(--accent)"></div>
            <div id="studio-workspace" style="margin-top:2rem; display:none"></div>
            <div id="presentation-history" style="margin-top: 3rem">
                <h3 style="font-size: 1.25rem; margin-bottom: 1rem">Recent Presentations</h3>
                ${presentations.length === 0 ? '<p style="color:var(--text-muted)">No presentations generated yet.</p>' : 
                presentations.map((p, i) => `
                    <div class="glass-panel" style="margin-bottom: 1rem; display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding: 1rem;">
                        <div>
                            <h4 style="margin:0">${p.slides[0].title}</h4>
                            <p style="margin:0; font-size:0.8rem; color:var(--text-muted)">${p.slides.length} slides &bull; ${p.date ? new Date(p.date).toLocaleDateString() : 'Recent'}</p>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="window.viewPresentation(${i})">View Presentation</button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },
    settings: () => `
        <div class="glass-panel" style="max-width: 600px;">
            <h2 style="font-size: 2rem; margin-bottom: 2rem">System Configuration</h2>
            <div class="form-group"><label>Gemini API Key</label><input type="password" id="input-api-key" class="form-control" value="${AppState.apiKey}"></div>
            <div class="form-group" style="margin-top: 1.5rem"><label>Study Mode</label>
                <select id="input-study-mode" class="form-control">
                    <option value="casual" ${AppState.settings.studyMode==='casual'?'selected':''}>Casual - Fun & Encouraging</option>
                    <option value="medium" ${AppState.settings.studyMode==='medium'?'selected':''}>Academic - Balanced</option>
                    <option value="exam" ${AppState.settings.studyMode==='exam'?'selected':''}>Exam - Rigorous & Challenging</option>
                </select>
            </div>
            <button class="btn btn-primary" id="btn-save-settings" style="margin-top: 2.5rem; width:100%">Save Configuration</button>
        </div>`,
    flashcards: () => {
        const decks = AppState.flashcards || [];
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Mastery Decks</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">AI-generated active recall sets.</p>
            <div style="display:flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color)">
                <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.5rem;">
                    ${customFocusInput('input-flashcard-focus')}
                    ${complexitySelector('flashcard-complexity')}
                    ${countSelector('input-card-count', 10)}
                </div>
                <button class="btn btn-primary" id="btn-gen-flashcards" style="align-self: flex-end; margin-top: 1rem"><ion-icon name="sparkles"></ion-icon> Generate New Deck</button>
            </div>
            <div id="flashcard-workspace">
                ${decks.length === 0 ? '<p style="text-align:center; color:var(--text-muted); padding: 5rem;">No decks created yet.</p>' : 
                decks.map((d, i) => `<div class="glass-panel" style="margin-bottom: 1rem; display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.02); padding: 1rem;">
                    <div><h4 style="margin:0">${d.title}</h4><p style="margin:0; font-size:0.8rem; color:var(--text-muted)">${d.cards.length} cards &bull; ${d.date}</p></div>
                    <button class="btn btn-secondary btn-sm" onclick="window.studyDeck(${i})">Study</button>
                </div>`).join('')}
            </div>
        </div>`;
    },
    quizzes: () => {
        const quizzes = AppState.quizzes || [];
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Assessment Engine</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Challenge your knowledge with adaptive testing.</p>
            <div style="display:flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color)">
                <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.5rem;">
                    ${customFocusInput('input-quiz-focus')}
                    ${complexitySelector('quiz-complexity')}
                    ${countSelector('input-quiz-count', 5)}
                </div>
                <button class="btn btn-primary" id="btn-gen-quiz" style="align-self: flex-end; margin-top: 1rem"><ion-icon name="sparkles"></ion-icon> Start New Quiz</button>
            </div>
            <div id="quiz-workspace">
                ${quizzes.length === 0 ? '<p style="text-align:center; color:var(--text-muted); padding: 5rem;">No assessments completed yet.</p>' : 
                quizzes.map((q, i) => `<div class="glass-panel" style="margin-bottom: 1rem; display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.02); padding: 1rem;">
                    <div><h4 style="margin:0">${q.title}</h4><p style="margin:0; font-size:0.8rem; color:var(--text-muted)">Score: ${q.score}% &bull; ${q.date}</p></div>
                    <button class="btn btn-secondary btn-sm" onclick="window.viewQuiz(${i})">View</button>
                </div>`).join('')}
            </div>
        </div>`;
    },
    overviews: () => {
        const overviews = AppState.overviews || [];
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Executive Overviews</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Generate comprehensive summaries, infographics, and data tables from your documents.</p>
            
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color)">
                ${customFocusInput('input-overview-focus')}
                ${complexitySelector('overview-complexity')}
            </div>

            <div class="studio-generator-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div class="studio-gen-card glass-panel" onclick="window.generateOverview('summary')" style="cursor:pointer; padding: 1.5rem; background: rgba(255,255,255,0.03)">
                    <ion-icon name="document-text-outline" style="font-size:1.5rem; color:var(--accent)"></ion-icon>
                    <h3>Executive Summary</h3>
                    <p>High-level brief of key points.</p>
                </div>
                <div class="studio-gen-card glass-panel" onclick="window.generateOverview('infographic')" style="cursor:pointer; padding: 1.5rem; background: rgba(255,255,255,0.03)">
                    <ion-icon name="pie-chart-outline" style="font-size:1.5rem; color:var(--accent)"></ion-icon>
                    <h3>Infographic Flow</h3>
                    <p>Mermaid diagram representation.</p>
                </div>
                <div class="studio-gen-card glass-panel" onclick="window.generateOverview('datatable')" style="cursor:pointer; padding: 1.5rem; background: rgba(255,255,255,0.03)">
                    <ion-icon name="grid-outline" style="font-size:1.5rem; color:var(--accent)"></ion-icon>
                    <h3>Data Table</h3>
                    <p>Structured tabular data extraction.</p>
                </div>
            </div>
            
            <div id="overview-status" style="margin-top:2rem; text-align:center; font-weight:600; color:var(--accent)"></div>
            <div id="overview-workspace" class="glass-panel" style="margin-top:2rem; display:none; background: rgba(15,23,42,0.8)"></div>
            
            <div id="overview-history" style="margin-top: 3rem">
                <h3 style="font-size: 1.25rem; margin-bottom: 1rem">Recent Overviews</h3>
                ${overviews.length === 0 ? '<p style="color:var(--text-muted)">No overviews generated yet.</p>' : 
                overviews.map((o, i) => `
                    <div class="glass-panel" style="margin-bottom: 1rem; display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding: 1rem;">
                        <div>
                            <h4 style="margin:0">${o.type.toUpperCase()} Overview</h4>
                            <p style="margin:0; font-size:0.8rem; color:var(--text-muted)">${new Date(o.date).toLocaleDateString()}</p>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="window.viewOverview(${i})">View</button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },
    pathways: () => {
        const pathways = AppState.pathways || [];
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Mastery Pathways</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Let Gemini build you a step-by-step personalized curriculum from your sources.</p>
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color)">
                ${customFocusInput('input-pathway-focus')}
                ${complexitySelector('pathway-complexity')}
            </div>
            <button class="btn btn-primary" id="btn-gen-pathway" style="width:100%"><ion-icon name="map-outline"></ion-icon> Generate Learning Pathway</button>
            <div id="pathway-status" style="margin-top:1.5rem; text-align:center; font-weight:600; color:var(--accent)"></div>
            <div id="pathway-workspace" style="margin-top:2rem; display:none;"></div>

            <div style="margin-top: 3rem">
                <h3 style="font-size: 1.25rem; margin-bottom: 1rem">Saved Pathways</h3>
                ${pathways.length === 0 ? '<p style="color:var(--text-muted)">No pathways generated yet.</p>' :
                pathways.map((p, i) => `
                    <div class="glass-panel" style="margin-bottom: 1rem; display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding: 1rem;">
                        <div>
                            <h4 style="margin:0">${p.title || 'Learning Pathway'}</h4>
                            <p style="margin:0; font-size:0.8rem; color:var(--text-muted)">${new Date(p.date).toLocaleDateString()}</p>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="window.viewPathway(${i})">View</button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },
    'study-rooms': () => {
        const rooms = AppState.rooms || [];
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Study Rooms Manager</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Manage all your study rooms, sources, and assets in one place.</p>
            <div style="display:flex; flex-direction: column; gap: 1rem;">
                ${rooms.length === 0 ? '<p style="color:var(--text-muted); text-align:center; padding:3rem;">No rooms yet. Create one from the Dashboard!</p>' :
                rooms.map((r, i) => `
                    <div class="glass-panel" style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 1.5rem;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem">
                            <div style="display:flex; align-items:center; gap:0.75rem">
                                <ion-icon name="folder-open-outline" style="font-size:1.5rem; color:var(--accent)"></ion-icon>
                                <h3 style="margin:0">${r.title}</h3>
                                ${AppState.currentRoomIndex === i ? '<span style="background:rgba(59,130,246,0.2); color:var(--accent); padding:0.2rem 0.75rem; border-radius:2rem; font-size:0.7rem; font-weight:700;">ACTIVE</span>' : ''}
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn btn-secondary btn-sm" onclick="window.setActiveRoom(${i})" style="padding:0.4rem 0.9rem; font-size:0.8rem; border-radius:2rem;">Switch To</button>
                                <button class="btn btn-secondary btn-sm" onclick="window.renameRoom(${i})" style="padding:0.4rem 0.9rem; font-size:0.8rem; border-radius:2rem;">Rename</button>
                                <button class="btn btn-sm" onclick="window.deleteRoom(${i})" style="padding:0.4rem 0.9rem; font-size:0.8rem; border-radius:2rem; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3);">Delete</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;">
                            <div style="background:rgba(255,255,255,0.05); padding:0.75rem; border-radius:1rem; text-align:center;">
                                <div style="font-size:1.5rem; font-weight:800; color:var(--accent)">${(r.documents||[]).length}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted)">Sources</div>
                            </div>
                            <div style="background:rgba(255,255,255,0.05); padding:0.75rem; border-radius:1rem; text-align:center;">
                                <div style="font-size:1.5rem; font-weight:800; color:#10b981">${(r.flashcards||[]).length}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted)">Decks</div>
                            </div>
                            <div style="background:rgba(255,255,255,0.05); padding:0.75rem; border-radius:1rem; text-align:center;">
                                <div style="font-size:1.5rem; font-weight:800; color:#8b5cf6">${(r.quizzes||[]).length}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted)">Quizzes</div>
                            </div>
                            <div style="background:rgba(255,255,255,0.05); padding:0.75rem; border-radius:1rem; text-align:center;">
                                <div style="font-size:1.5rem; font-weight:800; color:#f59e0b">${(r.presentations||[]).length}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted)">Slides</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-primary" onclick="window.createRoom()" style="margin-top:2rem; width:100%"><ion-icon name="add-outline"></ion-icon> Create New Room</button>
        </div>`;
    },
    'blur-study': () => `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Blur Study: The Semantic Heatmap</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Gemini identifies key terms and blurs them. Move the slider to increase recall difficulty.</p>
            
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color)">
                ${customFocusInput('input-blur-focus')}
                <div class="form-group" style="margin:0">
                    <label style="font-weight: 600; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">Recall Mode</label>
                    <select id="blur-mode" class="form-control">
                        <option value="blur">Progressive Hiding</option>
                        <option value="redaction">Redaction Game (Reverse Blur)</option>
                        <option value="blurt">Full Blurt (Semantic Validation)</option>
                    </select>
                </div>
            </div>

            <div class="confidence-slider-container" id="blur-difficulty-container">
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; font-size: 0.8rem; font-weight:700; color:var(--text-muted);">
                    <span>NOVICE (Connectives)</span>
                    <span>INTERMEDIATE (Keywords)</span>
                    <span>MASTERY (Blank)</span>
                </div>
                <input type="range" min="1" max="3" value="1" class="confidence-slider" id="blur-confidence-slider">
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem; text-align:center;">Only active in "Progressive Hiding" mode</p>
            </div>

            <button class="btn btn-primary" id="btn-gen-blur" style="width:100%; margin-top: 1.5rem;"><ion-icon name="eye-off-outline"></ion-icon> Initialize Study Session</button>
            
            <div id="blur-status" style="margin-top:1.5rem; text-align:center; font-weight:600; color:var(--accent)"></div>
            
            <div id="blur-workspace" style="margin-top:2rem; display:none;">
                <div class="glass-panel" id="blur-text-panel" style="background:rgba(255,255,255,0.02); padding:2rem; line-height:2.2; font-size:1.05rem;"></div>
                
                <div id="blurt-input-area" class="blurt-input-container" style="display:none">
                    <h3 style="margin-bottom: 0.5rem">Your Blurt</h3>
                    <p style="color:var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Type everything you remember about the topic below. Gemini will validate your semantic understanding.</p>
                    <textarea id="blurt-textarea" class="blurt-textarea" placeholder="Start typing what you remember..."></textarea>
                    <button class="btn btn-primary" id="btn-validate-blurt"><ion-icon name="checkmark-done-outline"></ion-icon> Validate My Recall</button>
                </div>

                <div id="redaction-controls" style="display:none; margin-top: 1.5rem; text-align:center;">
                    <p style="color:var(--text-muted); font-size: 0.85rem;">Click words to delete "fluff". Keep only the core meaning.</p>
                    <div id="redaction-score" style="font-size: 1.5rem; font-weight: 800; color: var(--accent); margin-top: 1rem;">Reduction: 0%</div>
                </div>
            </div>
        </div>`,
    'review-mistakes': () => {
        const wrongAnswers = AppState.wrongAnswers || [];
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Review Mistakes</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Your personal mistake bank — every wrong quiz answer is saved here for targeted review.</p>
            ${wrongAnswers.length === 0 ? `
                <div style="text-align:center; padding:4rem; color:var(--text-muted);">
                    <ion-icon name="checkmark-circle-outline" style="font-size:4rem; color:var(--success); display:block; margin-bottom:1rem;"></ion-icon>
                    <p style="font-size:1.1rem;">Your mistake bank is empty! Complete some quizzes to start tracking errors.</p>
                </div>` : `
                <button class="btn btn-primary" id="btn-analyze-mistakes" style="margin-bottom:2rem;"><ion-icon name="sparkles"></ion-icon> AI Tutor Analysis</button>
                <div id="analysis-workspace" style="display:none; margin-bottom:2rem;" class="glass-panel"></div>
                <div style="display:flex; flex-direction:column; gap: 0.75rem;">
                    ${wrongAnswers.map((w, i) => `
                        <div class="glass-panel" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); padding: 1.25rem; border-radius:1.5rem;">
                            <p style="font-weight:600; margin-bottom:0.5rem;">❌ ${w.question}</p>
                            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.25rem;">Your answer: <span style="color:#ef4444">${w.yourAnswer}</span></p>
                            <p style="font-size:0.85rem;">Correct: <span style="color:var(--success); font-weight:600">${w.correctAnswer}</span></p>
                        </div>
                    `).join('')}
                </div>
                <button class="btn" onclick="window.clearMistakes()" style="margin-top:1.5rem; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); border-radius:2rem;">Clear All Mistakes</button>
            `}
        </div>`;
    },
    mastery: () => {
        const quizzes = AppState.quizzes || [];
        const flashcards = AppState.flashcards || [];
        const presentations = AppState.presentations || [];
        const wrongAnswers = AppState.wrongAnswers || [];
        const avgScore = quizzes.length > 0 ? Math.round(quizzes.reduce((a, q) => a + (q.score || 0), 0) / quizzes.length) : 0;
        const totalCards = flashcards.reduce((a, d) => a + (d.cards ? d.cards.length : 0), 0);
        const masteryColor = avgScore >= 80 ? 'var(--success)' : avgScore >= 50 ? '#f59e0b' : '#ef4444';
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">Mastery Analytics</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Track your study progress, retention, and performance over time.</p>

            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <div class="glass-panel" style="background:rgba(59,130,246,0.1); border-color:rgba(59,130,246,0.3); text-align:center; padding:1.5rem; border-radius:1.5rem;">
                    <div style="font-size:3rem; font-weight:900; color:var(--accent);">${quizzes.length}</div>
                    <div style="color:var(--text-muted); font-size:0.85rem;">Quizzes Taken</div>
                </div>
                <div class="glass-panel" style="background:rgba(16,185,129,0.1); border-color:rgba(16,185,129,0.3); text-align:center; padding:1.5rem; border-radius:1.5rem;">
                    <div style="font-size:3rem; font-weight:900; color:#10b981;">${totalCards}</div>
                    <div style="color:var(--text-muted); font-size:0.85rem;">Flashcards Studied</div>
                </div>
                <div class="glass-panel" style="background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.3); text-align:center; padding:1.5rem; border-radius:1.5rem;">
                    <div style="font-size:3rem; font-weight:900; color:#8b5cf6;">${presentations.length}</div>
                    <div style="color:var(--text-muted); font-size:0.85rem;">Presentations</div>
                </div>
            </div>

            <div class="glass-panel" style="background:rgba(255,255,255,0.02); border-radius:1.5rem; padding:2rem; margin-bottom:1.5rem;">
                <h3 style="margin-bottom:1.5rem;">Overall Mastery Score</h3>
                <div style="display:flex; align-items:center; gap:1.5rem;">
                    <div style="font-size:4rem; font-weight:900; color:${masteryColor};">${avgScore}%</div>
                    <div style="flex:1;">
                        <div style="height:12px; background:rgba(255,255,255,0.1); border-radius:2rem; overflow:hidden;">
                            <div style="height:100%; width:${avgScore}%; background:${masteryColor}; border-radius:2rem; transition:width 1s ease;"></div>
                        </div>
                        <p style="color:var(--text-muted); margin-top:0.5rem; font-size:0.85rem;">Average across ${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}</p>
                    </div>
                </div>
            </div>

            <div class="glass-panel" style="background:rgba(239,68,68,0.05); border-color:rgba(239,68,68,0.2); border-radius:1.5rem; padding:1.5rem;">
                <h3 style="margin-bottom:0.5rem;">Mistakes Logged</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;">${wrongAnswers.length} incorrect answer${wrongAnswers.length !== 1 ? 's' : ''} recorded. <a onclick="window.navigate('review-mistakes')" style="color:var(--accent); cursor:pointer; font-weight:600;">Review them →</a></p>
            </div>

            ${quizzes.length > 0 ? `
            <div style="margin-top:2rem;">
                <h3 style="font-size:1.1rem; margin-bottom:1rem;">Quiz History</h3>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    ${quizzes.slice().reverse().map((q, i) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1.25rem; background:rgba(255,255,255,0.03); border-radius:1rem; border:1px solid var(--border-color);">
                            <span style="font-size:0.9rem;">${q.title || 'Quiz'}</span>
                            <span style="font-weight:700; color:${(q.score||0) >= 70 ? 'var(--success)' : '#ef4444'};">${q.score||0}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
        </div>`;
    }
};


// ==========================================
// CORE LOGIC & NAVIGATION
// ==========================================

window.navigate = (route) => {
    currentRoute = route;
    const content = document.getElementById('content-area');
    if (!content) return;
    
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-links li[data-route="${route}"]`);
    if(activeNav) activeNav.classList.add('active');
    
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = route.charAt(0).toUpperCase() + route.slice(1);

    if (Views[route]) {
        content.innerHTML = `<div class="view-section active">${Views[route]()}</div>`;
        bindViewEvents(route);
    }
};

const bindViewEvents = (route) => {
    if (route === 'settings') {
        document.getElementById('btn-save-settings').onclick = () => {
            saveState('apiKey', document.getElementById('input-api-key').value);
            showToast('Settings saved!');
        };
    }
    
    if (route === 'studio') {
        window.generateStudio = async (type) => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select sources first", "error");
            const statusEl = document.getElementById('studio-status');
            const workspace = document.getElementById('studio-workspace');
            workspace.style.display = 'block';
            statusEl.textContent = `Architecting ${type}...`;
            
            try {
                const parts = getActiveContextParts();
                const focus = document.getElementById('input-studio-focus').value;
                const complexity = document.getElementById('studio-complexity').value;
                const count = document.getElementById('input-studio-count').value || 5;
                const complexityInstruction = getComplexityModifier(complexity);
                const focusInstruction = focus ? `\nUSER FOCUS INSTRUCTION: ${focus}\n` : '';
                
                if (type === 'presentation') {
                    parts.push({ text: `${complexityInstruction}${focusInstruction}Create exactly ${count} academic presentation slides based on the context. Return ONLY valid JSON matching this exact structure, no markdown, no extra text: {"slides":[{"title":"string","subtitle":"string","content":"2-3 sentence detailed explanation for this slide","bullets":["key point 1","key point 2","key point 3"]}]}` });
                    const res = await callGemini(parts, "You are a JSON generator. Return ONLY raw valid JSON, no markdown fences, no explanation.", null, "application/json");
                    const deck = parseJsonSafe(res);
                    deck.date = new Date().toISOString();
                    AppState.presentations.push(deck);
                    saveState('presentations', AppState.presentations);
                    const newIdx = AppState.presentations.length - 1;
                    statusEl.textContent = "";
                    window.viewPresentation(newIdx);
                } else {
                    parts.push({ text: `${complexityInstruction}${focusInstruction}Create a Mermaid graph TD representing a Neural Map / Mind Map of the key concepts in the context. Output raw syntax ONLY. Do NOT use markdown code blocks.` });
                    const res = await callGemini(parts, "Mermaid expert.");
                    workspace.innerHTML = `<div class="mermaid">${res}</div>`;
                    if (window.mermaid) mermaid.init(undefined, workspace.querySelectorAll('.mermaid'));
                }
                statusEl.textContent = "";
            } catch (e) { statusEl.textContent = e.message; }
        };
    }

    if (route === 'notebook') {
        const input = document.getElementById('chat-input');
        const btn = document.getElementById('btn-send-chat');
        if (btn && input) {
            btn.onclick = async () => {
                const msg = input.value.trim(); if (!msg) return;
                input.value = '';
                AppState.chatHistory.push({ role: 'user', content: msg });
                saveState('chatHistory', AppState.chatHistory);
                window.navigate('notebook');
                try {
                    const parts = getActiveContextParts();
                    parts.push({ text: msg });
                    const res = await callGemini(parts, "Study assistant.", AppState.chatHistory);
                    AppState.chatHistory.push({ role: 'ai', content: res });
                    saveState('chatHistory', AppState.chatHistory);
                    window.navigate('notebook');
                } catch (e) { showToast(e.message, 'error'); }
            };
        }
    }
    if (route === 'flashcards') {
        document.getElementById('btn-gen-flashcards').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select active sources first", "error");
            const count = document.getElementById('input-card-count').value || 10;
            const focus = document.getElementById('input-flashcard-focus').value;
            const complexity = document.getElementById('flashcard-complexity').value;
            showToast("Gemini is curating your mastery deck...");
            try {
                const parts = getActiveContextParts();
                const complexityInstruction = getComplexityModifier(complexity);
                const focusInstruction = focus ? `\nUSER FOCUS INSTRUCTION: ${focus}\n` : '';
                parts.push({ text: `${complexityInstruction}${focusInstruction}Create exactly ${count} flashcards from the source material. For each card, provide a term, a clear definition, and a 'mnemonic' (a surreal, memorable image description or memory hook to help remember it). Also include an 'imagePrompt' (a short DALL-E style prompt for a surreal illustration of the concept). Return ONLY raw valid JSON: {"cards":[{"term":"string","definition":"string","mnemonic":"string","imagePrompt":"string"}]}` });
                const res = await callGemini(parts, "You are a JSON generator. Return ONLY raw valid JSON.", null, "application/json");
                const deck = parseJsonSafe(res);
                deck.title = "Mastery Deck " + new Date().toLocaleDateString();
                deck.date = new Date().toISOString();
                AppState.flashcards.push(deck);
                saveState('flashcards', AppState.flashcards);
                window.navigate('flashcards');
            } catch (e) { showToast(e.message, "error"); }
        };
    }

    if (route === 'quizzes') {
        document.getElementById('btn-gen-quiz').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select active sources first", "error");
            const count = document.getElementById('input-quiz-count').value || 5;
            const focus = document.getElementById('input-quiz-focus').value;
            const complexity = document.getElementById('quiz-complexity').value;
            showToast("Gemini is drafting an assessment...");
            try {
                const parts = getActiveContextParts();
                const complexityInstruction = getComplexityModifier(complexity);
                const focusInstruction = focus ? `\nUSER FOCUS INSTRUCTION: ${focus}\n` : '';
                parts.push({ text: `${complexityInstruction}${focusInstruction}Create exactly ${count} multiple choice questions from the source material. Return ONLY raw valid JSON, no markdown: {"title":"Quiz Title","questions":[{"q":"Question text","options":["A","B","C","D"],"correct":0}]}` });
                const res = await callGemini(parts, "You are a JSON generator. Return ONLY raw valid JSON, no markdown fences, no explanation.", null, "application/json");
                const quiz = parseJsonSafe(res);
                quiz.date = new Date().toISOString();
                quiz.score = 0;
                AppState.quizzes.push(quiz);
                saveState('quizzes', AppState.quizzes);
                window.navigate('quizzes');
            } catch (e) { showToast(e.message, "error"); }
        };
    }
    
    if (route === 'overviews') {
        window.generateOverview = async (type) => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select sources first", "error");
            const statusEl = document.getElementById('overview-status');
            const workspace = document.getElementById('overview-workspace');
            workspace.style.display = 'block';
            workspace.innerHTML = '';
            statusEl.textContent = `Synthesizing ${type}...`;
            
            try {
                const parts = getActiveContextParts();
                const focus = document.getElementById('input-overview-focus').value;
                const complexity = document.getElementById('overview-complexity').value;
                const complexityInstruction = getComplexityModifier(complexity);
                const focusInstruction = focus ? `\nUSER FOCUS INSTRUCTION: ${focus}\n` : '';
                
                let prompt = "";
                let systemInstruction = "You are an expert academic analyst.";
                
                if (type === 'summary') {
                    prompt = `${complexityInstruction}${focusInstruction}Write a highly detailed, extremely comprehensive executive summary of the provided context. Use markdown headers, bullet points, and bold text for emphasis. Do NOT output JSON. Output pure Markdown.`;
                } else if (type === 'infographic') {
                    prompt = `${complexityInstruction}${focusInstruction}Create a Mermaid flowchart (graph TD) that visualizes the main workflow, relationships, or timeline described in the text. Output raw syntax ONLY. Do NOT use markdown code blocks.`;
                    systemInstruction = "Mermaid expert. Output raw syntax ONLY.";
                } else if (type === 'datatable') {
                    prompt = `${complexityInstruction}${focusInstruction}Extract all quantitative data, lists of items, comparisons, or structured information from the text and present it as a Markdown Table. If there is no explicit data, synthesize a comparison table of the key concepts. Output pure Markdown.`;
                }
                
                parts.push({ text: prompt });
                const res = await callGemini(parts, systemInstruction);
                
                const overview = { type, content: res, date: new Date().toISOString() };
                AppState.overviews = AppState.overviews || [];
                AppState.overviews.push(overview);
                saveState('overviews', AppState.overviews);
                
                window.navigate('overviews');
                window.viewOverview(AppState.overviews.length - 1);
                
                statusEl.textContent = "";
            } catch (e) { statusEl.textContent = e.message; }
        };
    }

    if (route === 'pathways') {
        document.getElementById('btn-gen-pathway').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select sources first", "error");
            const statusEl = document.getElementById('pathway-status');
            const workspace = document.getElementById('pathway-workspace');
            workspace.style.display = 'block';
            workspace.innerHTML = '';
            statusEl.textContent = "Architecting your learning pathway...";
            
            const focus = document.getElementById('input-pathway-focus').value;
            const complexity = document.getElementById('pathway-complexity').value;
            const complexityInstruction = getComplexityModifier(complexity);
            const focusInstruction = focus ? `\nUSER FOCUS INSTRUCTION: ${focus}\n` : '';
            
            try {
                const parts = getActiveContextParts();
                parts.push({ text: `${complexityInstruction}${focusInstruction}Create a structured, step-by-step learning pathway or curriculum to help a student master the content in the provided sources. Divide it into clearly numbered phases or modules (e.g., Phase 1: Foundations, Phase 2: Core Concepts, etc.). For each phase, list specific sub-topics and suggested study activities. Output in rich Markdown format with headers, bullet points, and emojis.` });
                const res = await callGemini(parts, "You are an expert academic curriculum designer.");
                
                const pathway = { title: "Learning Pathway", content: res, date: new Date().toISOString() };
                AppState.pathways = AppState.pathways || [];
                AppState.pathways.push(pathway);
                saveState('pathways', AppState.pathways);
                
                workspace.innerHTML = `<div class="glass-panel" style="background:rgba(255,255,255,0.02);">${marked.parse(res)}</div>`;
                statusEl.textContent = "";
                showToast("Pathway generated!");
            } catch (e) { statusEl.textContent = e.message; }
        };
    }

    if (route === 'blur-study') {
        document.getElementById('btn-gen-blur').onclick = async () => {
            if(AppState.activeSourceIndices.length === 0) return showToast("Select sources first", "error");
            const statusEl = document.getElementById('blur-status');
            const workspace = document.getElementById('blur-workspace');
            const textPanel = document.getElementById('blur-text-panel');
            const blurtArea = document.getElementById('blurt-input-area');
            const redactionControls = document.getElementById('redaction-controls');
            const slider = document.getElementById('blur-confidence-slider');
            const mode = document.getElementById('blur-mode').value;

            workspace.style.display = 'block';
            textPanel.innerHTML = '';
            blurtArea.style.display = 'none';
            redactionControls.style.display = 'none';
            statusEl.textContent = "Synthesizing study session...";
            
            const focus = document.getElementById('input-blur-focus').value;
            const focusInstruction = focus ? `\nUSER FOCUS INSTRUCTION: ${focus}\n` : '';
            
            try {
                const parts = getActiveContextParts();
                let prompt = "";
                if (mode === 'redaction') {
                    prompt = `${focusInstruction}Write a 2-paragraph highly detailed explanation of the core concepts in the source. Do NOT use tags. Just plain text.`;
                } else {
                    prompt = `${focusInstruction}Write a 3-paragraph study summary of the content. Then, wrap EVERY important keyword, date, name, and concept in [KEY]word[/KEY] tags. Also wrap EVERY connective word (and, the, but, of, to, in, with) in [CON]word[/CON] tags. Output plain text only. Example: "[CON]The[/CON] [KEY]mitochondria[/KEY] [CON]is[/CON] [CON]the[/CON] [KEY]powerhouse[/KEY] [CON]of[/CON] [CON]the[/CON] [KEY]cell[/KEY]."`;
                }
                
                parts.push({ text: prompt });
                const res = await callGemini(parts, "You are a study material expert.");
                AppState.currentBlurText = res; // Save raw text for validation

                if (mode === 'redaction') {
                    redactionControls.style.display = 'block';
                    const words = res.split(/\s+/);
                    textPanel.classList.add('redaction-mode');
                    textPanel.innerHTML = words.map(w => `<span class="fluff-word" onclick="this.classList.toggle('deleted'); window.updateRedactionScore()">${w}</span>`).join(' ');
                    window.updateRedactionScore = () => {
                        const total = textPanel.querySelectorAll('.fluff-word').length;
                        const deleted = textPanel.querySelectorAll('.fluff-word.deleted').length;
                        const pct = Math.round((deleted / total) * 100);
                        document.getElementById('redaction-score').textContent = `Reduction: ${pct}%`;
                        if (pct > 70) document.getElementById('redaction-score').style.color = 'var(--warning)';
                        if (pct > 85) document.getElementById('redaction-score').style.color = 'var(--success)';
                    };
                } else if (mode === 'blurt') {
                    blurtArea.style.display = 'block';
                    textPanel.innerHTML = `<div style="filter: blur(20px); opacity: 0.3; user-select: none;">${res.replace(/\[CON\]|\[\/CON\]|\[KEY\]|\[\/KEY\]/g, '')}</div>`;
                    
                    document.getElementById('btn-validate-blurt').onclick = async () => {
                        const userBlurt = document.getElementById('blurt-textarea').value;
                        if (!userBlurt) return showToast("Type something first!", "error");
                        statusEl.textContent = "Gemini is validating your understanding...";
                        try {
                            const valRes = await callGemini([
                                { text: `SOURCE TEXT:\n${res.replace(/\[CON\]|\[\/CON\]|\[KEY\]|\[\/KEY\]/g, '')}\n\nUSER RECALL:\n${userBlurt}\n\nCompare the user's recall with the source. Identify which key concepts they GOT RIGHT and which they MISSED or MISUNDERSTOOD. Return a JSON object: {"score": 0-100, "feedback": "overall feedback", "gotRight": ["concept1", "concept2"], "missed": ["concept3"]}` }
                            ], "You are a Socratic validator. Use semantic similarity to judge if the user 'got the concept' even if words differ.", null, "application/json");
                            
                            const valData = parseJsonSafe(valRes);
                            textPanel.style.filter = 'none';
                            textPanel.style.opacity = '1';
                            
                            // Highlight the source text with semantic heatmap
                            let highlightedText = res.replace(/\[CON\]|\[\/CON\]/g, '');
                            valData.gotRight.forEach(concept => {
                                const reg = new RegExp(`(${concept})`, 'gi');
                                highlightedText = highlightedText.replace(reg, `<span class="blur-term correct revealed">$1</span>`);
                            });
                            valData.missed.forEach(concept => {
                                const reg = new RegExp(`(${concept})`, 'gi');
                                highlightedText = highlightedText.replace(reg, `<span class="blur-term missed revealed">$1</span>`);
                            });
                            // Clean up remaining tags
                            highlightedText = highlightedText.replace(/\[KEY\](.*?)\[\/KEY\]/g, '<span class="blur-term revealed">$1</span>');
                            
                            textPanel.innerHTML = `
                                <div class="glass-panel" style="margin-bottom: 1.5rem; border-color: var(--accent);">
                                    <h3 style="color:var(--accent)">Recall Score: ${valData.score}%</h3>
                                    <p>${valData.feedback}</p>
                                </div>
                                <div>${highlightedText}</div>
                            `;
                            statusEl.textContent = "";
                        } catch (e) { statusEl.textContent = e.message; }
                    };
                } else {
                    // Normal Blur Mode with Slider
                    const updateBlur = () => {
                        const val = parseInt(slider.value);
                        let html = res;
                        if (val >= 1) { // Novice: hide connectives
                            html = html.replace(/\[CON\](.*?)\[\/CON\]/g, `<span class="blur-term ${val === 1 ? '' : 'revealed'}">$1</span>`);
                        } else {
                            html = html.replace(/\[CON\]|\[\/CON\]/g, '');
                        }
                        
                        if (val >= 2) { // Intermediate: hide keywords
                            html = html.replace(/\[KEY\](.*?)\[\/KEY\]/g, `<span class="blur-term">$1</span>`);
                        } else {
                            html = html.replace(/\[KEY\]|\[\/KEY\]/g, '');
                        }
                        
                        if (val === 3) { // Mastery: Blank
                             textPanel.style.filter = 'blur(30px)';
                             textPanel.style.opacity = '0.1';
                        } else {
                             textPanel.style.filter = 'none';
                             textPanel.style.opacity = '1';
                        }
                        
                        textPanel.innerHTML = html;
                        // Add click listeners to reveal
                        textPanel.querySelectorAll('.blur-term').forEach(el => {
                            el.onclick = () => el.classList.toggle('revealed');
                        });
                    };
                    slider.oninput = updateBlur;
                    updateBlur();
                }
                statusEl.textContent = "";
            } catch (e) { statusEl.textContent = e.message; }
        };
    }

    if (route === 'review-mistakes') {
        const analyzeBtn = document.getElementById('btn-analyze-mistakes');
        if (analyzeBtn) {
            analyzeBtn.onclick = async () => {
                const workspace = document.getElementById('analysis-workspace');
                workspace.style.display = 'block';
                workspace.innerHTML = '<p style="color:var(--accent); text-align:center; padding:1rem;">AI Tutor is analyzing your mistakes...</p>';
                try {
                    const mistakes = AppState.wrongAnswers || [];
                    const mistakeText = mistakes.map(w => `Q: ${w.question}\nYou answered: ${w.yourAnswer}\nCorrect answer: ${w.correctAnswer}`).join('\n\n');
                    const res = await callGemini(
                        [{ text: `Here are a student's incorrect quiz answers:\n\n${mistakeText}\n\nProvide a compassionate, encouraging AI tutor analysis. For each mistake, explain WHY the correct answer is right, what concept the student likely misunderstood, and a memory trick or analogy to remember it. Format in clear Markdown.` }],
                        "You are a compassionate, expert AI tutor."
                    );
                    workspace.innerHTML = `<div style="padding:1rem;">${marked.parse(res)}</div>`;
                } catch (e) { workspace.innerHTML = `<p style="color:var(--error); padding:1rem;">${e.message}</p>`; }
            };
        }
    }
};



window.viewOverview = (idx) => {
    const overview = AppState.overviews[idx];
    if (!overview) return;
    const workspace = document.getElementById('overview-workspace');
    workspace.style.display = 'block';
    workspace.innerHTML = '';
    
    if (overview.type === 'infographic') {
        workspace.innerHTML = `<div class="mermaid">${overview.content}</div>`;
        if (window.mermaid) mermaid.init(undefined, workspace.querySelectorAll('.mermaid'));
    } else if (overview.type === 'datatable') {
        workspace.innerHTML = `
            <div style="margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center;">
                <input type="text" id="table-pivot-query" class="form-control" placeholder="Pivot by concept (e.g. 'Most relevant to environmental impact')...">
                <button class="btn btn-primary btn-sm" id="btn-pivot-table"><ion-icon name="swap-vertical-outline"></ion-icon> Pivot</button>
            </div>
            <div id="table-container" class="markdown-body">${marked.parse(overview.content)}</div>
        `;
        document.getElementById('btn-pivot-table').onclick = async () => {
            const query = document.getElementById('table-pivot-query').value;
            if (!query) return;
            showToast("Pivoting by concept...");
            try {
                const res = await callGemini([{ text: `TABLE DATA:\n${overview.content}\n\nPIVOT QUERY: ${query}\n\nReorder the rows of this table based on the pivot query (semantic relevance). Return the entire table, reordered. Return ONLY Markdown.` }], "Data analyst.");
                document.getElementById('table-container').innerHTML = marked.parse(res);
            } catch (e) { showToast(e.message, "error"); }
        };
    } else {
        workspace.innerHTML = `<div style="padding: 1rem;" class="markdown-body">${marked.parse(overview.content)}</div>`;
    }
    window.scrollTo({ top: workspace.offsetTop - 100, behavior: 'smooth' });
};


window.viewPresentation = (idx) => {
    const deck = AppState.presentations[idx];
    if (!deck) return;
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
    <div class="view-section active">
        <div class="glass-panel" style="max-width:900px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                <button class="btn btn-secondary btn-sm" onclick="window.navigate('studio')" style="border-radius:2rem;">← Back to Studio</button>
                <h2 style="font-size:1.5rem; margin:0">${deck.slides && deck.slides[0] ? deck.slides[0].title : 'Presentation'}</h2>
            </div>
            <div class="scrolly-container">
                ${(deck.slides || []).map((s, i) => `
                    <div class="scrolly-slide" id="slide-${i}">
                        <div style="color:var(--accent); font-weight:800; font-size:0.8rem; text-transform:uppercase; margin-bottom:1rem; letter-spacing:0.1rem;">Slide ${i+1}</div>
                        <h2>${s.title || ''}</h2>
                        ${s.subtitle ? `<h3 style="color:var(--text-muted); font-size:1.1rem; margin-bottom:1rem">${s.subtitle}</h3>` : ''}
                        ${s.content ? `<p style="margin-bottom:1rem">${s.content}</p>` : ''}
                        ${s.bullets && s.bullets.length ? `<ul style="text-align:left; padding-left:1.5rem; color:var(--text-muted);">${s.bullets.map(b => `<li style="margin-bottom:0.5rem">${b}</li>`).join('')}</ul>` : ''}
                    </div>
                `).join('')}
            </div>
            <p style="text-align:center; margin-top:1.5rem; color:var(--text-muted); font-size:0.85rem;">💡 Scroll between slides for cinematic experience</p>
        </div>
    </div>`;
};


window.setActiveRoom = (idx) => {
    AppState.currentRoomIndex = idx;
    localStorage.setItem('lumina_currentRoomIndex', JSON.stringify(idx));
    AppState.activeSourceIndices = [];
    loadLocalData(); // Reload room-specific data
    window.renderSourcesSidebar();
    window.navigate('dashboard');
    showToast("Environment switched.", "success");
};

window.studyDeck = (idx) => {
    const deck = AppState.flashcards[idx];
    const workspace = document.getElementById('flashcard-workspace');
    if (!deck) return;
    let current = 0;

    // Define enhanceDefinition FIRST before render() uses it
    window.enhanceDefinition = (text) => {
        if (!text) return '';
        const words = text.split(' ');
        return words.map(w => {
            if (w.length > 6 && Math.random() > 0.65) return `<span class="fractal-term" title="Click to drill into this concept">${w.replace(/[.,;:]/g, '')}</span>`;
            return w;
        }).join(' ');
    };

    const render = () => {
        const card = deck.cards[current];
        workspace.innerHTML = `
            <div style="max-width: 560px; margin: 0 auto;">
                <!-- Card flip wrapper -->
                <div id="card-face-front" class="glass-panel" style="text-align:center; padding: 4rem 3rem; background: rgba(255,255,255,0.05); min-height: 300px; display: flex; flex-direction: column; justify-content: center; cursor: pointer; border-radius: 1.5rem; transition: all 0.3s;">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.1rem; margin-bottom:1.5rem;">Card ${current + 1} / ${deck.cards.length}</div>
                    <h2 style="font-size: 2rem; margin:0; line-height:1.3">${card.term}</h2>
                    <p style="margin-top: 1.5rem; color: var(--text-muted); font-size: 0.8rem">Click anywhere to reveal definition</p>
                </div>
                <div id="card-face-back" style="display:none">
                    <div class="glass-panel" style="text-align:left; padding: 2rem; background: rgba(59,130,246,0.05); border-color: rgba(59,130,246,0.3); min-height: 300px; border-radius: 1.5rem;">
                        <div style="font-size:0.75rem; color:var(--accent); font-weight:700; text-transform:uppercase; letter-spacing:0.1rem; margin-bottom:1rem;">${card.term}</div>
                        <p style="font-size: 1.1rem; line-height: 1.8" id="card-definition-text">${window.enhanceDefinition(card.definition)}</p>
                        ${card.mnemonic ? `<div class="mnemonic-pill" style="margin-top:1.5rem;">💡 <strong>Memory Hook:</strong> ${card.mnemonic}</div>` : ''}
                        <button class="btn btn-secondary" style="margin-top:1.5rem; width:100%;" id="btn-deep-dive">🔭 Deep Dive (AI Analysis)</button>
                    </div>
                </div>
                <div id="card-face-depth" style="display:none">
                    <div class="glass-panel" style="background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.3); padding: 2rem; border-radius: 1.5rem; min-height: 300px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <h3 id="depth-title" style="color:#8b5cf6; margin:0">Deep Dive: ${card.term}</h3>
                            <button class="btn btn-secondary btn-sm" onclick="window.flipDepthBack()">← Back</button>
                        </div>
                        <div id="depth-content" class="markdown-body" style="font-size: 0.95rem; line-height: 1.7;">
                            <p style="color:var(--text-muted)">Loading AI analysis...</p>
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1.5rem">
                    <button class="btn btn-secondary btn-sm" onclick="window.navigate('flashcards')">← Exit Deck</button>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-secondary btn-sm" ${current === 0 ? 'disabled' : ''} id="prev-card">← Prev</button>
                        <button class="btn btn-secondary btn-sm" ${current === deck.cards.length - 1 ? 'disabled' : ''} id="next-card">Next →</button>
                    </div>
                </div>
            </div>`;

        const faceFront = document.getElementById('card-face-front');
        const faceBack = document.getElementById('card-face-back');
        const faceDepth = document.getElementById('card-face-depth');

        // Click front card to flip to back
        faceFront.onclick = () => {
            faceFront.style.display = 'none';
            faceBack.style.display = 'block';
        };

        // Click on fractal terms within the back face
        faceBack.addEventListener('click', (e) => {
            if (e.target.classList.contains('fractal-term')) {
                window.drillFractal(e.target.textContent);
            }
        });

        // Deep dive button
        document.getElementById('btn-deep-dive').onclick = () => window.flipToDepth();

        window.flipToDepth = async () => {
            faceBack.style.display = 'none';
            faceDepth.style.display = 'block';
            if (!card.depthInfo) {
                try {
                    const depthRes = await callGemini([{ text: `Term: ${card.term}\nDefinition: ${card.definition}\n\nProvide a deep-dive technical explanation, including sub-components, real-world applications, common misconceptions, and advanced nuances. Format in clear Markdown.` }], "You are an expert tutor providing in-depth analysis.");
                    card.depthInfo = depthRes;
                    document.getElementById('depth-content').innerHTML = marked.parse(depthRes);
                } catch (e) { document.getElementById('depth-content').innerHTML = `<p style="color:var(--error)">${e.message}</p>`; }
            } else {
                document.getElementById('depth-content').innerHTML = marked.parse(card.depthInfo);
            }
        };

        window.flipDepthBack = () => {
            faceDepth.style.display = 'none';
            faceBack.style.display = 'block';
        };

        window.drillFractal = async (term) => {
            const depthTitle = document.getElementById('depth-title');
            const depthContent = document.getElementById('depth-content');
            if (!depthTitle || !depthContent) return;
            depthTitle.textContent = `Drilling: ${term}`;
            depthContent.innerHTML = '<p style="color:var(--text-muted)">Scaling down concept layers...</p>';
            faceBack.style.display = 'none';
            faceDepth.style.display = 'block';
            try {
                const res = await callGemini([{ text: `Analyze the sub-term "${term}" within the context of the main concept "${card.term}". Definition of the parent concept: ${card.definition}. Provide a concise expert-level deep dive into this specific sub-concept. Format in Markdown.` }], "Fractal educator.");
                depthContent.innerHTML = marked.parse(res);
            } catch (e) { depthContent.innerHTML = `<p style="color:var(--error)">${e.message}</p>`; }
        };

        document.getElementById('prev-card').onclick = () => { if(current > 0) { current--; render(); } };
        document.getElementById('next-card').onclick = () => { if(current < deck.cards.length - 1) { current++; render(); } };
    };

    render();
};

window.createRoom = () => {
    const title = prompt("Enter room title:");
    if (!title) return;
    const rooms = AppState.rooms;
    rooms.push({ title, documents: [], flashcards: [], chatHistory: [] });
    saveState('rooms', rooms);
    window.navigate('dashboard');
};

window.signOutUser = () => {
    if (confirm('Clear all data and reset?')) {
        localStorage.clear();
        location.reload();
    }
};

window.setComplexity = (el, id) => {
    // Only update pills within the same container
    const container = el.closest('.complexity-pill-container');
    if (container) container.querySelectorAll('.complexity-pill').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const input = document.getElementById(id);
    if (input) input.value = el.dataset.value;
};

window.renameRoom = (idx) => {
    const room = AppState.rooms[idx];
    if (!room) return;
    const newTitle = prompt("Enter new room name:", room.title);
    if (!newTitle || newTitle === room.title) return;
    AppState.rooms[idx].title = newTitle;
    saveState('rooms', AppState.rooms);
    window.navigate('study-rooms');
    showToast("Room renamed!");
};

window.deleteRoom = (idx) => {
    if (!confirm(`Delete room "${AppState.rooms[idx].title}"? This will permanently erase all its data.`)) return;
    AppState.rooms.splice(idx, 1);
    if (AppState.currentRoomIndex === idx) {
        AppState.currentRoomIndex = AppState.rooms.length > 0 ? 0 : -1;
        localStorage.setItem('lumina_currentRoomIndex', JSON.stringify(AppState.currentRoomIndex));
    } else if (AppState.currentRoomIndex > idx) {
        AppState.currentRoomIndex--;
        localStorage.setItem('lumina_currentRoomIndex', JSON.stringify(AppState.currentRoomIndex));
    }
    saveState('rooms', AppState.rooms);
    window.navigate('study-rooms');
    showToast("Room deleted.");
};

window.clearMistakes = () => {
    if (!confirm("Clear all mistakes from your bank?")) return;
    saveState('wrongAnswers', []);
    window.navigate('review-mistakes');
    showToast("Mistake bank cleared!");
};

window.viewPathway = (idx) => {
    const pathway = AppState.pathways[idx];
    if (!pathway) return;
    const workspace = document.getElementById('pathway-workspace');
    if (!workspace) return;
    workspace.style.display = 'block';
    workspace.innerHTML = `<div class="glass-panel" style="background:rgba(255,255,255,0.02);">${marked.parse(pathway.content)}</div>`;
    workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.viewQuiz = (idx) => {
    const quiz = AppState.quizzes[idx];
    if (!quiz) return;
    const contentArea = document.getElementById('content-area');
    let current = 0;
    let score = 0;
    let answered = false;
    let fractalMode = false;
    let mainQuizState = { current, score };

    const render = () => {
        const q = (fractalMode && quiz.fractalQuiz) ? quiz.fractalQuiz.questions[current] : quiz.questions[current];
        const total = (fractalMode && quiz.fractalQuiz) ? quiz.fractalQuiz.questions.length : quiz.questions.length;
        
        contentArea.innerHTML = `
        <div class="view-section active">
        <div class="glass-panel" style="max-width:800px; margin:0 auto;">
            ${fractalMode ? `<div style="background:rgba(239,68,68,0.1); padding:0.5rem 1rem; border-radius:1rem; color:var(--error); font-weight:700; font-size:0.8rem; margin-bottom:1rem; text-align:center; border:1px solid rgba(239,68,68,0.2)">DIAGNOSTIC LOOP: Mastering "${quiz.questions[mainQuizState.current].q.substring(0, 30)}..."</div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                <button class="btn btn-secondary btn-sm" onclick="window.navigate('quizzes')" style="border-radius:2rem;">← Exit</button>
                <span style="color:var(--text-muted); font-size:0.9rem;">Question ${current + 1} of ${total}</span>
                <span style="font-weight:700; color:var(--accent);">Score: ${score}/${total}</span>
            </div>
            <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2rem; margin-bottom:2rem; overflow:hidden;">
                <div style="height:100%; width:${((current)/total)*100}%; background:linear-gradient(90deg, ${fractalMode ? '#ef4444' : 'var(--accent)'}, #8b5cf6); border-radius:2rem; transition:width 0.4s ease;"></div>
            </div>
            <h3 style="font-size:1.25rem; margin-bottom:2rem; line-height:1.6;">${q.q}</h3>
            <div id="quiz-options" style="display:flex; flex-direction:column; gap:0.75rem;">
                ${q.options.map((opt, i) => `
                    <button class="quiz-option-btn" onclick="window.selectAnswer(${i})" data-idx="${i}"
                        style="text-align:left; padding:1rem 1.5rem; border-radius:1rem; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-main); cursor:pointer; transition:all 0.2s; font-size:0.95rem; width:100%;">
                        <span style="font-weight:700; color:var(--accent); margin-right:0.75rem;">${String.fromCharCode(65+i)}.</span>${opt}
                    </button>
                `).join('')}
            </div>
            <div id="why-trap-area" style="display:none; margin-top:2rem; padding:1.5rem; background:rgba(59,130,246,0.1); border-radius:1.5rem; border:1px solid var(--accent)">
                <h4 style="color:var(--accent); margin-bottom:0.5rem">🧠 THE "WHY" TRAP</h4>
                <p style="font-size:0.9rem; margin-bottom:1rem">Explain why you chose this answer. Prove you aren't guessing!</p>
                <textarea id="why-trap-input" class="form-control" style="background:rgba(0,0,0,0.4); margin-bottom:1rem" placeholder="Explain your reasoning..."></textarea>
                <button class="btn btn-primary btn-sm" id="btn-submit-why">Verify My Reasoning</button>
            </div>
            <div id="quiz-feedback" style="display:none; margin-top:1.5rem; padding:1.25rem; border-radius:1rem;"></div>
        </div>
        </div>`;

        window.selectAnswer = async (chosenIdx) => {
            if (answered) return;
            
            // Randomly trigger "Why Trap" (20% chance or if it's the first question to set the tone)
            const triggerWhyTrap = !fractalMode && (Math.random() < 0.3 || current === 0);
            
            if (triggerWhyTrap) {
                answered = true;
                const trapArea = document.getElementById('why-trap-area');
                trapArea.style.display = 'block';
                document.querySelectorAll('.quiz-option-btn').forEach(b => b.style.opacity = '0.5');
                document.querySelectorAll('.quiz-option-btn')[chosenIdx].style.opacity = '1';
                document.querySelectorAll('.quiz-option-btn')[chosenIdx].style.borderColor = 'var(--accent)';
                
                document.getElementById('btn-submit-why').onclick = async () => {
                    const reasoning = document.getElementById('why-trap-input').value;
                    if (!reasoning) return showToast("Please explain your reasoning!", "error");
                    
                    const statusEl = document.getElementById('quiz-feedback');
                    statusEl.style.display = 'block';
                    statusEl.innerHTML = '<p style="color:var(--accent)">Gemini is analyzing your logic...</p>';
                    
                    try {
                        const checkRes = await callGemini([
                            { text: `QUESTION: ${q.q}\nUSER SELECTED: ${q.options[chosenIdx]}\nUSER REASONING: ${reasoning}\n\nCORRECT ANSWER INDEX: ${q.correct}\nCORRECT ANSWER TEXT: ${q.options[q.correct]}\n\nIs the user's reasoning correct and sufficient? Return JSON: {"valid": true/false, "feedback": "brief feedback"}` }
                        ], "You are a Socratic examiner. Be strict. If the reasoning is vague or wrong, valid is false.", null, "application/json");
                        
                        const checkData = parseJsonSafe(checkRes);
                        if (!checkData.valid) {
                            statusEl.style.background = 'rgba(239,68,68,0.1)';
                            statusEl.style.borderLeft = '4px solid #ef4444';
                            statusEl.innerHTML = `<strong>Reasoning Rejected:</strong> ${checkData.feedback}<br>Even if you picked the right choice, you must understand WHY.`;
                            // Force wrong answer if reasoning is bad
                            processFinalAnswer(99); // Invalid index
                        } else {
                            statusEl.style.background = 'rgba(16,185,129,0.1)';
                            statusEl.style.borderLeft = '4px solid #10b981';
                            statusEl.innerHTML = `<strong>Reasoning Validated:</strong> ${checkData.feedback}`;
                            processFinalAnswer(chosenIdx);
                        }
                    } catch (e) { statusEl.innerHTML = e.message; }
                };
            } else {
                processFinalAnswer(chosenIdx);
            }
        };

        const processFinalAnswer = async (chosenIdx) => {
            answered = true;
            const correct = q.correct;
            const btns = document.querySelectorAll('.quiz-option-btn');
            btns.forEach((btn, i) => {
                btn.style.pointerEvents = 'none';
                if (i === correct) { btn.style.background = 'rgba(16,185,129,0.2)'; btn.style.borderColor = '#10b981'; }
                if (i === chosenIdx && chosenIdx !== correct) { btn.style.background = 'rgba(239,68,68,0.2)'; btn.style.borderColor = '#ef4444'; }
            });

            const isCorrect = chosenIdx === correct;
            if (isCorrect) { score++; }
            else {
                // Track the wrong answer
                AppState.wrongAnswers = AppState.wrongAnswers || [];
                AppState.wrongAnswers.push({
                    question: q.q,
                    yourAnswer: chosenIdx === 99 ? "Invalid Reasoning" : q.options[chosenIdx],
                    correctAnswer: q.options[correct],
                    date: new Date().toISOString()
                });
                saveState('wrongAnswers', AppState.wrongAnswers);
                
                // Trigger Fractal Error Loop if not already in one
                if (!fractalMode) {
                    const feedback = document.getElementById('quiz-feedback');
                    feedback.style.display = 'block';
                    feedback.style.background = 'rgba(239,68,68,0.1)';
                    feedback.style.borderLeft = '4px solid #ef4444';
                    feedback.innerHTML = `❌ Incorrect. <strong>FRACTAL ERROR LOOP:</strong> Generating a targeted mini-quiz on this concept...`;
                    
                    try {
                        // Use generic context if no active sources (fractal can work without sources)
                        const fractalParts = AppState.activeSourceIndices.length > 0 ? getActiveContextParts() : [];
                        fractalParts.push({ text: `The user failed this question: "${q.q}". The correct answer was "${q.options[correct]}". Generate exactly 3 follow-up questions to test understanding of this specific concept. Return ONLY JSON (no markdown): {"questions":[{"q":"string","options":["A","B","C","D"],"correct":0}]}` });
                        const fractalRes = await callGemini(fractalParts, "You are a diagnostic educator. Return ONLY raw valid JSON.", null, "application/json");
                        quiz.fractalQuiz = parseJsonSafe(fractalRes);
                        
                        setTimeout(() => {
                            mainQuizState = { current, score };
                            fractalMode = true;
                            current = 0;
                            score = 0;
                            answered = false;
                            render();
                        }, 2500);
                        return; // Stop here, render will be called in timeout
                    } catch (e) {
                        // If fractal generation fails, just continue normally
                        showToast("Fractal loop unavailable, continuing quiz.", "error");
                    }
                }
            }

            const feedback = document.getElementById('quiz-feedback');
            feedback.style.display = 'block';
            feedback.style.background = isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
            feedback.style.borderLeft = `4px solid ${isCorrect ? '#10b981' : '#ef4444'}`;
            feedback.innerHTML = isCorrect ? '✅ Correct!' : `❌ Incorrect. The correct answer was: <strong>${q.options[correct]}</strong>`;

            setTimeout(() => {
                answered = false;
                if (current < total - 1) {
                    current++;
                    render();
                } else {
                    if (fractalMode) {
                        // Fractal complete, return to main quiz
                        showToast("Sub-module mastered! Returning to main quiz.", "success");
                        fractalMode = false;
                        current = mainQuizState.current + 1;
                        score = mainQuizState.score;
                        if (current >= quiz.questions.length) {
                             finalizeQuiz();
                        } else {
                             render();
                        }
                    } else {
                        finalizeQuiz();
                    }
                }
            }, 1500);
        };
        
        const finalizeQuiz = () => {
            const finalScore = fractalMode ? mainQuizState.score : score;
            const pct = quiz.questions.length > 0 ? Math.round((finalScore / quiz.questions.length) * 100) : 0;
            quiz.score = pct;
            saveState('quizzes', AppState.quizzes);
            contentArea.innerHTML = `
            <div class="view-section active">
            <div class="glass-panel" style="max-width:600px; margin:0 auto; text-align:center;">
                <div style="font-size:5rem; margin-bottom:1rem;">${pct >= 70 ? '🎉' : pct >= 40 ? '📚' : '💪'}</div>
                <h2 style="font-size:2rem; margin-bottom:0.5rem;">Quiz Complete!</h2>
                <p style="color:var(--text-muted); margin-bottom:2rem;">${quiz.title}</p>
                <div style="font-size:4rem; font-weight:900; color:${pct>=70?'var(--success)':pct>=40?'#f59e0b':'#ef4444'}; margin-bottom:2rem;">${pct}%</div>
                <p style="color:var(--text-muted);">${fractalMode ? mainQuizState.score : score} out of ${quiz.questions.length} correct</p>
                <div style="display:flex; gap:1rem; justify-content:center; margin-top:2rem;">
                    <button class="btn btn-primary" onclick="window.navigate('quizzes')">Back to Quizzes</button>
                    <button class="btn btn-secondary" onclick="window.navigate('review-mistakes')">Review Mistakes</button>
                </div>
            </div>
            </div>`;
        };
    };
    render();
};



// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadLocalData();
    updateApiStatus();
    
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => {
            const route = li.dataset.route;
            if (route) window.navigate(route);
        };
    });
    
    window.navigate('dashboard');
});
