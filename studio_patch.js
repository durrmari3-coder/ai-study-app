// Studio Patch for NotebookLM Parity (Phase 4)
// Re-binds Studio generations to the new right-sidebar Studio Panel
// Saves outputs to AppState.activeNotebook.notes

const originalGenerateStudio = window.generateStudio;

window.generateStudio = async (type) => {
    if(!window.AppState.activeNotebookId) {
        return window.showToast("Please open a Notebook first.", "error");
    }
    
    // Check if we have active sources, if not, use all notebook sources
    let activeIndices = window.AppState.activeSourceIndices || [];
    if (activeIndices.length === 0) {
        if (!window.AppState.documents || window.AppState.documents.length === 0) return window.showToast("No sources to generate from", "error");
        const docCount = window.AppState.documents.length;
        if (docCount === 0) return window.showToast("Add sources to your notebook first", "error");
        activeIndices = Array.from({length: docCount}, (_, i) => i);
        window.AppState.activeSourceIndices = activeIndices;
    }

    if (window.showModal) {
        window.showModal(`Generate ${type.replace(/_/g,' ')}`, `
            <div style="display:flex; flex-direction:column; gap:1rem;">
                <label style="font-size:0.85rem; color:var(--text-muted);">What should the focus be?</label>
                <input type="text" id="studio-focus-input" class="form-control" value="General Overview">
                <button class="btn btn-primary" onclick="window.executeStudioGeneration('${type}')">Generate</button>
            </div>
        `);
    } else {
        const focus = prompt(`What should the ${type} focus on?`, "General Overview");
        if (focus !== null) {
            document.body.insertAdjacentHTML('beforeend', `<input type="hidden" id="studio-focus-input" value="${focus}">`);
            window.executeStudioGeneration(type);
        }
    }
};

window.executeStudioGeneration = async (type) => {
    const focusEl = document.getElementById('studio-focus-input');
    if (!focusEl) return;
    const focus = focusEl.value.trim() || "General Overview";
    if (window.closeModal) window.closeModal();
    
    const complexity = "medium";
    const count = 5;
    
    // Use the integrated studio workspace in the notebook view
    const resultContent = document.getElementById('studio-workspace');
    if (window.toggleStudioWorkspace) window.toggleStudioWorkspace(true);

    if (resultContent) {
        resultContent.innerHTML = `<div style="text-align:center; padding: 2.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem;">
            <ion-icon name="sync-outline" class="spin" style="font-size:2rem; color:var(--accent);"></ion-icon>
            <p style="font-size:0.9rem; color:var(--text-muted);">Architecting ${type.replace(/_/g,' ')}...</p>
        </div>`;
    }
    
    try {
        const parts = window.getActiveContextParts ? window.getActiveContextParts() : [{text:"No context"}];
        const complexityInstruction = "[MEDIUM: Standard academic level.]\n";
        const focusInstruction = focus ? `\nUSER FOCUS INSTRUCTION: ${focus}\n` : '';
        
        let outputHtml = "";
        let rawContent = null;
        
        if (type === 'presentation') {
            parts.push({ text: `${complexityInstruction}${focusInstruction}Create exactly ${count} academic presentation slides based on the context. Return ONLY valid JSON matching this exact structure, no markdown, no extra text: {"slides":[{"title":"string","subtitle":"string","content":"2-3 sentence detailed explanation for this slide","bullets":["key point 1","key point 2","key point 3"]}]}` });
            const res = await window.callGemini(parts, "You are a JSON generator. Return ONLY raw valid JSON, no markdown fences, no explanation.", null, "application/json");
            const deck = window.parseJsonSafe ? window.parseJsonSafe(res) : JSON.parse(res);
            deck.date = new Date().toISOString();
            
            outputHtml = `
            <div style="margin-bottom:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                <button class="btn btn-primary" onclick="window.playCinematicVideo(0)" style="padding:0.75rem; border-radius:1rem; font-size:0.8rem; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                    <ion-icon name="play-circle-outline" style="font-size:1.2rem;"></ion-icon> Watch
                </button>
                <button class="btn btn-secondary" onclick="window.exportPresentationPDF()" style="padding:0.75rem; border-radius:1rem; font-size:0.8rem; display:flex; align-items:center; justify-content:center; gap:0.5rem; background:rgba(255,255,255,0.05);">
                    <ion-icon name="download-outline" style="font-size:1.2rem;"></ion-icon> PDF
                </button>
            </div>
            <div class="presentation-slides">`;
            deck.slides.forEach((s, idx) => {
                outputHtml += `
                <div class="glass-panel" style="margin-bottom:0.75rem; padding:1.25rem; position:relative; background:rgba(255,255,255,0.03);">
                    <button class="panel-icon-btn" style="position:absolute; top:0.75rem; right:0.75rem;" onclick="window.narrateSlide(this)" data-text="${s.title}. ${s.subtitle}. ${s.content}. ${s.bullets.join('. ')}">
                        <ion-icon name="volume-high-outline"></ion-icon>
                    </button>
                    <h4 style="color:var(--accent);margin-bottom:0.2rem;max-width:85%;font-size:0.95rem;">${idx+1}. ${s.title}</h4>
                    <p style="font-size:0.82rem;margin-bottom:0.75rem;line-height:1.4;">${s.content}</p>
                    <ul style="padding-left:1.25rem;font-size:0.78rem;color:var(--text-muted);">
                        ${s.bullets.map(b => `<li style="margin-bottom:0.2rem;">${b}</li>`).join('')}
                    </ul>
                </div>`;
            });
            outputHtml += `</div>`;
            rawContent = deck;
            
        } else if (type === 'knowledgemap') {
            parts.push({ text: `${complexityInstruction}${focusInstruction}Extract the 8-15 most important concepts from the source and their relationships. Return ONLY raw JSON: {"nodes":[{"id":"n1","label":"Main Concept","importance":5,"description":"brief description"}],"edges":[{"from":"n1","to":"n2","label":"contains","type":"hierarchy"}]}` });
            const res = await window.callGemini(parts, "You are a knowledge graph expert. Return ONLY raw valid JSON.", null, "application/json");
            const graph = window.parseJsonSafe ? window.parseJsonSafe(res) : JSON.parse(res);
            
            outputHtml = `
                <div style="margin-bottom:1rem; display:flex; justify-content:flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick="window.exportKnowledgeMapSVG()" style="background:rgba(255,255,255,0.05); font-size:0.7rem; border-radius:0.5rem; display:flex; align-items:center; gap:0.4rem;">
                        <ion-icon name="download-outline"></ion-icon> Export SVG
                    </button>
                </div>
                <div id="temp-km-container" style="width:100%; height:400px; background:rgba(0,0,0,0.2); border-radius:1rem; border:1px solid var(--border-color);"></div>`;
            rawContent = graph;
            
        } else if (type === 'summary' || type === 'datatable' || type === 'timeline') {
            const systemPrompt = type === 'timeline' ? "Chronological expert." : "Academic report expert.";
            const userPrompt = type === 'timeline' ? "Extract a chronological timeline of key events. Format as markdown." : (type === 'datatable' ? "Extract key facts, data points, and figures into a markdown table." : "Create a detailed study summary of the key concepts.");
            
            parts.push({ text: `${complexityInstruction}${focusInstruction}${userPrompt}` });
            const res = await window.callGemini(parts, systemPrompt);
            outputHtml = `<div class="studio-report-content" style="font-size:0.85rem; line-height:1.6; color:var(--text-main);">${marked.parse(res)}</div>`;
            rawContent = res;
        } else {
            parts.push({ text: `${complexityInstruction}${focusInstruction}Create a detailed study insight about the key concepts in the context. Output formatted Markdown.` });
            const res = await window.callGemini(parts, "Academic report expert.");
            outputHtml = `<div class="studio-report-content" style="font-size:0.85rem; line-height:1.6; color:var(--text-main);">${marked.parse(res)}</div>`;
            rawContent = res;
        }
        
        // Save to Active Notebook Notes & Global State
        const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
        if (nb) {
            if (type === 'presentation') {
                if (!window.AppState.presentations) window.AppState.presentations = [];
                window.AppState.presentations.unshift(rawContent);
                window.saveState('presentations', window.AppState.presentations);
            }
            
            if (!nb.notes) nb.notes = [];
            nb.notes.unshift({
                id: Math.random().toString(36).substring(2, 9),
                type: type,
                title: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g,' ')}: ${focus}`,
                content: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
                html: outputHtml,
                date: new Date().toISOString()
            });
            window.saveState('notebooks', window.AppState.notebooks);
        }
        
        // Render
        if (resultContent) {
            resultContent.innerHTML = outputHtml;
            if (type === 'knowledgemap' && window.renderKnowledgeMap) {
                const container = document.getElementById('temp-km-container');
                if (container) window.renderKnowledgeMap(container, rawContent);
            }
        }
        
        window.showToast(`${type.replace(/_/g,' ')} ready!`, "success");
        
    } catch (e) {
        if (resultContent) resultContent.innerHTML = `<div style="color:var(--error); padding:2.5rem; font-size:0.85rem; text-align:center;">
            <ion-icon name="alert-circle-outline" style="font-size:2rem; margin-bottom:1rem;"></ion-icon>
            <p>Generation failed: ${e.message}</p>
            <button class="btn btn-secondary btn-sm" onclick="window.closeStudioWorkspace()" style="margin-top:1rem;">Back to Studio</button>
        </div>`;
        window.showToast("Generation failed", "error");
    }
};

// Bind UI buttons in right panel
document.addEventListener('DOMContentLoaded', () => {
    // Port Audio Overview to Podcast Engine
    window.openAudioOverviewModal = () => {
        window.navigate('podcast');
    };
    
    // Port Video Overview to Presentation Generator
    window.generateVideoOverview = () => {
        window.generateStudio('presentation');
    };

});
