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
            
            content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }
        
        const newDoc = { title, type: actualType, items: [{ title: 'Main Content', type: actualType, mimeType, content }] };
        const docs = AppState.documents;
        docs.push(newDoc);
        saveState('documents', docs);
        
        document.getElementById('modal-container').classList.add('hidden');
        window.renderSourcesSidebar();
        showToast("Source added successfully!");
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
            <div class="complexity-pill active" onclick="window.setComplexity(this, '${id}')" style="flex:1; text-align:center; padding: 0.5rem; border-radius: 0.4rem; cursor:pointer; font-weight: 600; font-size: 0.8rem;" data-value="medium">Standard</div>
            <div class="complexity-pill" onclick="window.setComplexity(this, '${id}')" style="flex:1; text-align:center; padding: 0.5rem; border-radius: 0.4rem; cursor:pointer; font-weight: 600; font-size: 0.8rem;" data-value="hard">Advanced</div>
        </div>
        <input type="hidden" id="${id}" value="medium">
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
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                ${complexitySelector('studio-complexity')}
                ${customFocusInput('input-studio-focus')}
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
            <div style="display:flex; gap: 1rem; align-items:center; margin-bottom: 2rem; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 0.5rem;">
                <div class="form-group" style="max-width: 150px; margin:0"><label>Deck Size</label><input type="number" id="input-card-count" class="form-control" value="10" min="5" max="50"></div>
                <button class="btn btn-primary" id="btn-gen-flashcards" style="margin-left: auto"><ion-icon name="sparkles"></ion-icon> Generate New Deck</button>
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
            <div style="display:flex; gap: 1rem; align-items:center; margin-bottom: 2rem; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 0.5rem;">
                <button class="btn btn-primary" id="btn-gen-quiz"><ion-icon name="sparkles"></ion-icon> Start New Quiz</button>
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
    overviews: () => `<div class="glass-panel"><h2 style="font-size: 2rem; margin-bottom: 0.5rem">Media Overviews</h2><p style="color:var(--text-muted)">Generate comprehensive summaries of your documents.</p></div>`,
    pathways: () => `<div class="glass-panel"><h2 style="font-size: 2rem; margin-bottom: 0.5rem">Mastery Pathways</h2><p style="color:var(--text-muted)">Your personalized curriculum and learning path.</p></div>`,
    'study-rooms': () => `<div class="glass-panel"><h2 style="font-size: 2rem; margin-bottom: 0.5rem">Study Rooms</h2><p style="color:var(--text-muted)">Collaborate with AI peers or real classmates.</p></div>`,
    'blur-study': () => `<div class="glass-panel"><h2 style="font-size: 2rem; margin-bottom: 0.5rem">Blur Study</h2><p style="color:var(--text-muted)">Active recall by blurring out key terms in your notes.</p></div>`,
    'review-mistakes': () => `<div class="glass-panel"><h2 style="font-size: 2rem; margin-bottom: 0.5rem">Review Mistakes</h2><p style="color:var(--text-muted)">Analyze and learn from your previous incorrect answers.</p></div>`,
    mastery: () => `<div class="glass-panel"><h2 style="font-size: 2rem; margin-bottom: 0.5rem">Mastery Analytics</h2><p style="color:var(--text-muted)">Track your progress, retention, and weak areas over time.</p></div>`
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
                
                if (type === 'presentation') {
                    parts.push({ text: `Create a 5-slide academic presentation. Return ONLY valid JSON matching this exact structure, no markdown, no extra text: {"slides":[{"title":"string","subtitle":"string","bullets":["string"]}]}` });
                    const res = await callGemini(parts, "You are a JSON generator. Return ONLY raw valid JSON, no markdown fences, no explanation.", null, "application/json");
                    const deck = parseJsonSafe(res);
                    deck.date = new Date().toISOString();
                    AppState.presentations.push(deck);
                    saveState('presentations', AppState.presentations);
                    window.navigate('studio');
                    document.getElementById('studio-workspace').style.display = 'block';
                    window.renderPresentation(deck);
                } else {
                    parts.push({ text: `Create a Mermaid graph TD. Output raw syntax.` });
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
            showToast("Gemini is curating your mastery deck...");
            try {
                const parts = getActiveContextParts();
                parts.push({ text: `Create exactly ${count} flashcards from the source material. Return ONLY raw valid JSON, no markdown: {"cards":[{"term":"string","definition":"string"}]}` });
                const res = await callGemini(parts, "You are a JSON generator. Return ONLY raw valid JSON, no markdown fences, no explanation.", null, "application/json");
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
            showToast("Gemini is drafting an assessment...");
            try {
                const parts = getActiveContextParts();
                parts.push({ text: `Create a 5-question multiple choice quiz from the source material. Return ONLY raw valid JSON, no markdown: {"title":"Quiz Title","questions":[{"q":"Question text","options":["A","B","C","D"],"correct":0}]}` });
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
};


window.viewPresentation = (idx) => {
    const deck = AppState.presentations[idx];
    if (!deck) return;
    document.getElementById('studio-workspace').style.display = 'block';
    window.renderPresentation(deck);
    window.scrollTo({ top: document.getElementById('studio-workspace').offsetTop - 100, behavior: 'smooth' });
};

window.renderPresentation = (deck) => {
    const workspace = document.getElementById('studio-workspace');
    let currentSlide = 0;

    const render = () => {
        workspace.innerHTML = `
            <div class="slide-carousel">
                ${deck.slides.map((s, i) => `
                    <div class="slide ${i === currentSlide ? 'active' : (i < currentSlide ? 'prev' : '')}">
                        <h2 class="slide-title">${s.title}</h2>
                        ${s.subtitle ? `<h3 class="slide-subtitle">${s.subtitle}</h3>` : ''}
                        <div class="slide-content">
                            <ul>
                                ${s.bullets.map(b => `<li>${b}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
                <div class="slide-controls">
                    <button id="prev-slide" ${currentSlide === 0 ? 'style="opacity:0.5; pointer-events:none"' : ''}><ion-icon name="chevron-back-outline"></ion-icon></button>
                    <div style="color:white; font-weight:800; display:flex; align-items:center; padding: 0 1rem;">${currentSlide + 1} / ${deck.slides.length}</div>
                    <button id="next-slide" ${currentSlide === deck.slides.length - 1 ? 'style="opacity:0.5; pointer-events:none"' : ''}><ion-icon name="chevron-forward-outline"></ion-icon></button>
                </div>
            </div>
        `;

        document.getElementById('prev-slide').onclick = () => {
            if (currentSlide > 0) {
                currentSlide--;
                render();
            }
        };
        document.getElementById('next-slide').onclick = () => {
            if (currentSlide < deck.slides.length - 1) {
                currentSlide++;
                render();
            }
        };
    };

    render();
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
    let current = 0;
    const render = () => {
        const card = deck.cards[current];
        workspace.innerHTML = `
            <div class="glass-panel" style="text-align:center; padding: 3rem; background: rgba(255,255,255,0.05)">
                <h3>${card.term}</h3>
                <hr style="margin: 2rem 0; opacity: 0.1">
                <div id="card-back" style="display:none">
                    <p style="font-size: 1.2rem">${card.definition}</p>
                </div>
                <button class="btn btn-secondary" onclick="document.getElementById('card-back').style.display='block'">Show Answer</button>
                <div style="display:flex; justify-content:space-between; margin-top: 3rem">
                    <button class="btn btn-sm" onclick="window.navigate('flashcards')">Exit</button>
                    <div>
                        <button class="btn btn-sm" ${current === 0 ? 'disabled' : ''} id="prev-card">Prev</button>
                        <button class="btn btn-sm" ${current === deck.cards.length - 1 ? 'disabled' : ''} id="next-card">Next</button>
                    </div>
                </div>
            </div>`;
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
    document.querySelectorAll('.complexity-pill').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const input = document.getElementById(id);
    if (input) input.value = el.dataset.value;
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
