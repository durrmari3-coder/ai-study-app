// Studio Patch for NotebookLM Parity (Phase 4)
// Re-binds Studio generations to the new right-sidebar Studio Panel
// Saves outputs to AppState.activeNotebook.notes

const originalGenerateStudio = window.generateStudio;

window.generateStudio = async (type) => {
    if(!window.AppState.activeNotebookId) {
        return window.showToast("Please open a Notebook first.", "error");
    }
    
    // Check if we have active sources, if not, use all notebook sources
    let activeIndices = window.AppState.activeSourceIndices;
    if (!activeIndices || activeIndices.length === 0) {
        // Auto-select all sources in the notebook for the generation
        const docCount = window.AppState.documents.length;
        if (docCount === 0) return window.showToast("Add sources to your notebook first", "error");
        activeIndices = Array.from({length: docCount}, (_, i) => i);
        window.AppState.activeSourceIndices = activeIndices;
    }

    const focus = prompt(\`What should the \${type} focus on?\`, "General Overview");
    if (focus === null) return; // User cancelled
    
    const complexity = "medium";
    const count = 5;
    
    // Show loading in the right panel
    const resultPanel = document.getElementById('studio-quick-result');
    const resultType = document.getElementById('studio-quick-type');
    const resultContent = document.getElementById('studio-quick-content');
    
    if (resultPanel) resultPanel.style.display = 'block';
    if (resultType) resultType.textContent = \`Generating \${type}...\`;
    if (resultContent) resultContent.innerHTML = \`<div style="text-align:center; padding: 2rem;"><ion-icon name="hourglass-outline" class="spin" style="font-size:2rem; color:var(--accent);"></ion-icon><p>Analyzing sources...</p></div>\`;
    
    try {
        const parts = window.getActiveContextParts ? window.getActiveContextParts() : [{text:"No context"}];
        const complexityInstruction = "[MEDIUM: Standard academic level.]\\n";
        const focusInstruction = focus ? \`\\nUSER FOCUS INSTRUCTION: \${focus}\\n\` : '';
        
        let outputHtml = "";
        let rawContent = null;
        
        if (type === 'presentation') {
            parts.push({ text: `${complexityInstruction}${focusInstruction}Create exactly ${count} academic presentation slides based on the context. Return ONLY valid JSON matching this exact structure, no markdown, no extra text: {"slides":[{"title":"string","subtitle":"string","content":"2-3 sentence detailed explanation for this slide","bullets":["key point 1","key point 2","key point 3"]}]}` });
            const res = await window.callGemini(parts, "You are a JSON generator. Return ONLY raw valid JSON, no markdown fences, no explanation.", null, "application/json");
            const deck = window.parseJsonSafe ? window.parseJsonSafe(res) : JSON.parse(res);
            deck.date = new Date().toISOString();
            
            // Format presentation HTML
            outputHtml = `<div class="presentation-slides">`;
            deck.slides.forEach((s, idx) => {
                outputHtml += `
                <div class="glass-panel" style="margin-bottom:1rem; padding:1.5rem; position:relative;">
                    <button class="panel-icon-btn" style="position:absolute; top:1rem; right:1rem;" onclick="window.narrateSlide(this)" data-text="${s.title}. ${s.subtitle}. ${s.content}. ${s.bullets.join('. ')}">
                        <ion-icon name="volume-high-outline"></ion-icon>
                    </button>
                    <h3 style="color:var(--accent);margin-bottom:0.2rem;max-width:90%;">Slide ${idx+1}: ${s.title}</h3>
                    <h4 style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">${s.subtitle}</h4>
                    <p style="font-size:0.9rem;margin-bottom:1rem;">${s.content}</p>
                    <ul style="padding-left:1.5rem;font-size:0.85rem;">
                        ${s.bullets.map(b => `<li style="margin-bottom:0.25rem;">${b}</li>`).join('')}
                    </ul>
                </div>`;
            });
            outputHtml += `</div>`;
            
            // Add narration script support
            if (!window.narrateSlide) {
                window.narrateSlide = (btn) => {
                    window.speechSynthesis.cancel();
                    const text = btn.getAttribute('data-text');
                    const u = new SpeechSynthesisUtterance(text);
                    u.rate = 0.95;
                    window.speechSynthesis.speak(u);
                };
            }
            rawContent = deck;
            
        } else if (type === 'knowledgemap') {
            parts.push({ text: `${complexityInstruction}${focusInstruction}Extract the 8-15 most important concepts from the source and their relationships. Return ONLY raw JSON: {"nodes":[{"id":"n1","label":"Main Concept","importance":5,"description":"brief description"}],"edges":[{"from":"n1","to":"n2","label":"contains","type":"hierarchy"}]}` });
            const res = await window.callGemini(parts, "You are a knowledge graph expert. Return ONLY raw valid JSON.", null, "application/json");
            const graph = window.parseJsonSafe ? window.parseJsonSafe(res) : JSON.parse(res);
            
            // Create a container for the KM
            outputHtml = \`<div id="temp-km-container" style="width:100%; height:300px; background:rgba(0,0,0,0.2); border-radius:1rem;"></div>\`;
            rawContent = graph;
            
        } else {
            // Default Mindmap (Mermaid)
            parts.push({ text: \`\${complexityInstruction}\${focusInstruction}Create a Mermaid graph TD representing a Neural Map / Mind Map of the key concepts in the context. Output raw syntax ONLY. Do NOT use markdown code blocks.\` });
            const res = await window.callGemini(parts, "Mermaid expert.");
            outputHtml = \`<div class="mermaid">\${res}</div>\`;
            rawContent = res;
        }
        
        // Save to Active Notebook Notes
        const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
        if (nb) {
            if (!nb.notes) nb.notes = [];
            nb.notes.push({
                id: Math.random().toString(36).substring(2, 9),
                type: type,
                title: \`\${type.charAt(0).toUpperCase() + type.slice(1)}: \${focus}\`,
                content: rawContent,
                html: outputHtml,
                date: new Date().toISOString()
            });
            window.saveState('notebooks', window.AppState.notebooks);
        }
        
        // Render
        if (resultType) resultType.textContent = \`\${type.charAt(0).toUpperCase() + type.slice(1)} Ready\`;
        if (resultContent) {
            resultContent.innerHTML = outputHtml;
            // Post-render init
            if (type === 'knowledgemap' && window.renderKnowledgeMap) {
                const container = document.getElementById('temp-km-container');
                if (container) window.renderKnowledgeMap(container, rawContent);
            }
            if (type !== 'knowledgemap' && type !== 'presentation' && window.mermaid) {
                mermaid.init(undefined, resultContent.querySelectorAll('.mermaid'));
            }
        }
        
        window.showToast(\`\${type} generated and saved to notes!\`, "success");
        
    } catch (e) {
        if (resultContent) resultContent.innerHTML = \`<div style="color:var(--error); padding:1rem;">Error: \${e.message}</div>\`;
        if (resultType) resultType.textContent = "Error";
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
