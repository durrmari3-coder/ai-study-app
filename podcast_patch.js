
// ==========================================
// PODCAST ENGINE — INJECTED PATCH
// ==========================================

// Inject podcast view into Views after DOM is ready
(function injectPodcastView() {
    const originalNavigate = window.navigate;

    // Add podcast to Views dynamically
    Views['podcast'] = () => {
        return `
        <div class="glass-panel">
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem">&#127897; Podcast Engine</h2>
            <p style="color:var(--text-muted); margin-bottom: 2rem;">Generate an AI-hosted dual-voice study podcast from your sources. Use <strong style="color:#ef4444">The Third Mic</strong> to interrupt and ask questions.</p>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color)">
                ${customFocusInput('input-podcast-focus')}
                <div class="form-group" style="margin:0">
                    <label style="font-weight:600; font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem; display:block;">Show Format</label>
                    <select id="podcast-format" class="form-control">
                        <option value="deep_dive">🔬 The Deep Dive</option>
                        <option value="rapid_fire">⚡ Rapid Fire</option>
                        <option value="debate">⚔️ The Debate</option>
                        <option value="storyteller">📖 The Storyteller</option>
                        <option value="oral_exam">🎓 The Oral Exam</option>
                    </select>
                </div>
            </div>

            <button class="btn btn-primary" id="btn-gen-podcast" style="width:100%; margin-bottom:1.5rem;">
                &#127897; Generate Podcast Script
            </button>
            <div id="podcast-status" style="text-align:center; font-weight:600; color:var(--accent); margin-bottom:1rem;"></div>

            <div id="podcast-player" style="display:none; padding:1.5rem; background:rgba(255,255,255,0.02); border-radius:1.5rem; border:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem;">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;" id="host-a-avatar">A</div>
                        <div><div style="font-weight:700;font-size:0.9rem;">Host Alex</div><div style="font-size:0.7rem;color:var(--text-muted);" id="host-a-label">Waiting...</div></div>
                    </div>
                    <div id="podcast-waveform" style="display:flex;gap:3px;align-items:center;height:30px;">
                        <span style="display:inline-block;width:3px;border-radius:2px;background:var(--accent);height:8px;"></span>
                        <span style="display:inline-block;width:3px;border-radius:2px;background:var(--accent);height:16px;"></span>
                        <span style="display:inline-block;width:3px;border-radius:2px;background:var(--accent);height:24px;"></span>
                        <span style="display:inline-block;width:3px;border-radius:2px;background:var(--accent);height:16px;"></span>
                        <span style="display:inline-block;width:3px;border-radius:2px;background:var(--accent);height:8px;"></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="text-align:right;"><div style="font-weight:700;font-size:0.9rem;">Host Blake</div><div style="font-size:0.7rem;color:var(--text-muted);" id="host-b-label">Waiting...</div></div>
                        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#10b981,#06b6d4);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;" id="host-b-avatar">B</div>
                    </div>
                </div>

                <div id="podcast-now-playing" style="text-align:center; padding:1.25rem; background:rgba(0,0,0,0.2); border-radius:1rem; margin-bottom:1.25rem; font-size:1rem; line-height:1.7; min-height:80px; font-style:italic; color:var(--text-main);">Press Play to begin...</div>

                <div style="display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-sm" id="btn-podcast-prev" title="Previous line">&#8676; Prev</button>
                    <button class="btn btn-primary" id="btn-podcast-play" style="padding:0.85rem 2.5rem;min-width:120px;">&#9654; Play</button>
                    <button class="btn btn-secondary btn-sm" id="btn-podcast-next" title="Next line">Next &#8677;</button>
                    <button class="btn" id="btn-third-mic" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:2rem;padding:0.7rem 1.25rem;font-size:0.85rem;cursor:pointer;">&#127908; Third Mic</button>
                </div>

                <div style="margin-top:1.25rem;">
                    <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.4rem;">
                        <span id="podcast-progress-label">Line 0 / 0</span>
                        <span>Dual-voice synthesis active</span>
                    </div>
                    <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:2rem;overflow:hidden;">
                        <div id="podcast-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),#8b5cf6);border-radius:2rem;transition:width 0.3s;"></div>
                    </div>
                </div>
            </div>

            <div id="third-mic-panel" style="display:none; margin-top:1.5rem; padding:1.5rem; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:1.5rem;">
                <h3 style="color:#ef4444; margin-bottom:0.75rem;">&#127908; You have interrupted the hosts!</h3>
                <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">Ask your question — the AI hosts will improvise an answer before resuming.</p>
                <textarea id="third-mic-input" class="blurt-textarea" style="min-height:80px;" placeholder="What didn't land? Ask away..."></textarea>
                <div style="display:flex;gap:1rem;margin-top:1rem;">
                    <button class="btn btn-primary btn-sm" id="btn-third-mic-submit">Ask the Hosts</button>
                    <button class="btn btn-secondary btn-sm" id="btn-third-mic-cancel">Resume Podcast</button>
                </div>
                <div id="third-mic-response" style="margin-top:1rem;display:none;padding:1rem;background:rgba(255,255,255,0.03);border-radius:0.75rem;font-style:italic;line-height:1.7;"></div>
            </div>

            <div id="podcast-script-preview" style="margin-top:2rem;display:none;">
                <details style="background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:1rem;padding:1rem;">
                    <summary style="cursor:pointer;font-weight:600;color:var(--text-muted);user-select:none;">&#128196; View Full Script</summary>
                    <div id="podcast-script-text" style="margin-top:1rem;font-size:0.85rem;line-height:1.9;color:var(--text-muted);white-space:pre-wrap;max-height:400px;overflow-y:auto;"></div>
                </details>
            </div>
        </div>`;
    };
})();

// ==========================================
// PODCAST ENGINE — EVENT BINDING
// ==========================================

const bindPodcastEvents = () => {
    let podcastLines = [];   // Array of {host: 'A'|'B', text: string}
    let podcastIdx = 0;
    let isPlaying = false;
    let synth = window.speechSynthesis;
    let voiceA = null;
    let voiceB = null;
    let utteranceTimeout = null;

    const getVoices = () => {
        const voices = synth.getVoices();
        if (!voices.length) return;
        // Try to pick two distinct voices: one female-ish, one male-ish
        const enVoices = voices.filter(v => v.lang.startsWith('en'));
        voiceA = enVoices.find(v => /female|woman|girl|zira|susan|samantha|victoria|karen|moira/i.test(v.name)) || enVoices[0] || voices[0];
        voiceB = enVoices.find(v => v !== voiceA && /male|man|guy|david|daniel|mark|tom|alex|ryan/i.test(v.name)) || enVoices.find(v => v !== voiceA) || voices[0];
    };

    if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = getVoices;
    getVoices();

    const updateHostDisplay = (host) => {
        const aAvatar = document.getElementById('host-a-avatar');
        const bAvatar = document.getElementById('host-b-avatar');
        const aLabel  = document.getElementById('host-a-label');
        const bLabel  = document.getElementById('host-b-label');
        if (!aAvatar) return;
        if (host === 'A') {
            aAvatar.style.boxShadow = '0 0 0 3px #3b82f6, 0 0 20px rgba(59,130,246,0.5)';
            bAvatar.style.boxShadow = 'none';
            if (aLabel) aLabel.textContent = 'Speaking...';
            if (bLabel) bLabel.textContent = 'Listening';
        } else {
            bAvatar.style.boxShadow = '0 0 0 3px #10b981, 0 0 20px rgba(16,185,129,0.5)';
            aAvatar.style.boxShadow = 'none';
            if (bLabel) bLabel.textContent = 'Speaking...';
            if (aLabel) aLabel.textContent = 'Listening';
        }
        // Animate waveform
        const bars = document.querySelectorAll('#podcast-waveform span');
        bars.forEach((b, i) => {
            b.style.animation = isPlaying ? `waveBar ${0.4 + i * 0.1}s ease-in-out infinite alternate` : 'none';
            b.style.background = host === 'A' ? '#3b82f6' : '#10b981';
        });
    };

    const speakLine = (idx) => {
        if (idx >= podcastLines.length) { stopPlayback(); return; }
        const line = podcastLines[idx];
        const nowPlaying = document.getElementById('podcast-now-playing');
        const progressLabel = document.getElementById('podcast-progress-label');
        const progressBar = document.getElementById('podcast-progress-bar');

        if (nowPlaying) {
            const hostColor = line.host === 'A' ? '#3b82f6' : '#10b981';
            const hostName = line.host === 'A' ? 'Alex' : 'Blake';
            nowPlaying.innerHTML = `<span style="font-size:0.7rem;font-weight:800;color:${hostColor};text-transform:uppercase;letter-spacing:0.1rem;display:block;margin-bottom:0.5rem;">${hostName}</span>${line.text}`;
        }
        if (progressLabel) progressLabel.textContent = `Line ${idx + 1} / ${podcastLines.length}`;
        if (progressBar) progressBar.style.width = `${((idx + 1) / podcastLines.length) * 100}%`;

        updateHostDisplay(line.host);

        synth.cancel();
        const utt = new SpeechSynthesisUtterance(line.text);
        utt.voice = line.host === 'A' ? voiceA : voiceB;
        utt.rate = line.host === 'A' ? 0.95 : 1.0;
        utt.pitch = line.host === 'A' ? 1.1 : 0.9;
        utt.volume = 1;
        utt.onend = () => {
            if (isPlaying) {
                podcastIdx = idx + 1;
                speakLine(podcastIdx);
            }
        };
        synth.speak(utt);
    };

    const stopPlayback = () => {
        isPlaying = false;
        synth.cancel();
        if (utteranceTimeout) clearTimeout(utteranceTimeout);
        const playBtn = document.getElementById('btn-podcast-play');
        if (playBtn) playBtn.innerHTML = '&#9654; Play';
        const bars = document.querySelectorAll('#podcast-waveform span');
        bars.forEach(b => b.style.animation = 'none');
    };

    const startPlayback = () => {
        isPlaying = true;
        const playBtn = document.getElementById('btn-podcast-play');
        if (playBtn) playBtn.innerHTML = '&#9646;&#9646; Pause';
        getVoices();
        speakLine(podcastIdx);
    };

    // Generate podcast script
    const genBtn = document.getElementById('btn-gen-podcast');
    if (!genBtn) return;

    genBtn.onclick = async () => {
        if (AppState.activeSourceIndices.length === 0) return showToast('Select sources first', 'error');
        const statusEl = document.getElementById('podcast-status');
        statusEl.textContent = 'Gemini is writing your podcast script...';
        genBtn.disabled = true;

        const focus = document.getElementById('input-podcast-focus').value;
        const format = document.getElementById('podcast-format').value;
        const focusInstruction = focus ? `\nUSER FOCUS: ${focus}\n` : '';

        const formatInstructions = {
            deep_dive: 'Host Alex and Host Blake have a relaxed, intellectual conversation, going deep into key concepts. Alex explains, Blake asks clarifying questions and pushes back gently.',
            rapid_fire: 'Host Alex and Host Blake fire facts at each other quickly. Short punchy exchanges. Each line 10-20 words max.',
            debate: 'Host Alex argues FOR the main concept, Host Blake argues AGAINST or raises counter-points. They interrupt each other with "But wait—" style rebuttals.',
            storyteller: 'Host Alex narrates the content as a story with characters and plot, Host Blake adds commentary and asks "what happened next?"',
            oral_exam: 'Host Blake quizzes Host Alex like an oral exam. Blake asks tough questions, Alex must answer correctly from the material.'
        };

        try {
            const parts = getActiveContextParts();
            parts.push({ text: `${focusInstruction}Generate a 20-line study podcast script about the provided source material. Format: "${formatInstructions[format] || formatInstructions.deep_dive}"\n\nReturn ONLY raw JSON, no markdown:\n{"lines":[{"host":"A","text":"Host Alex dialogue here"},{"host":"B","text":"Host Blake dialogue here"}]}` });
            const res = await callGemini(parts, 'You are a podcast script writer. Use natural speech, filler words like "um" and "you know", and make it engaging. Return ONLY raw JSON.', null, 'application/json');
            const data = parseJsonSafe(res);
            podcastLines = data.lines || [];
            podcastIdx = 0;

            // Show UI
            document.getElementById('podcast-player').style.display = 'block';
            document.getElementById('podcast-script-preview').style.display = 'block';
            const scriptEl = document.getElementById('podcast-script-text');
            if (scriptEl) scriptEl.textContent = podcastLines.map(l => `[${l.host === 'A' ? 'Alex' : 'Blake'}]: ${l.text}`).join('\n\n');

            statusEl.textContent = '';
            genBtn.disabled = false;
            showToast(`Podcast ready! ${podcastLines.length} lines generated.`, 'success');
        } catch (e) {
            statusEl.textContent = e.message;
            genBtn.disabled = false;
        }
    };

    // Play/Pause button
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-podcast-play' || e.target.closest('#btn-podcast-play')) {
            if (podcastLines.length === 0) return showToast('Generate a podcast first!', 'error');
            if (isPlaying) stopPlayback();
            else startPlayback();
        }
        if (e.target.id === 'btn-podcast-prev' || e.target.closest('#btn-podcast-prev')) {
            if (podcastIdx > 0) { podcastIdx--; if (isPlaying) speakLine(podcastIdx); }
        }
        if (e.target.id === 'btn-podcast-next' || e.target.closest('#btn-podcast-next')) {
            if (podcastIdx < podcastLines.length - 1) { podcastIdx++; if (isPlaying) speakLine(podcastIdx); }
        }
        if (e.target.id === 'btn-third-mic' || e.target.closest('#btn-third-mic')) {
            if (podcastLines.length === 0) return showToast('Generate a podcast first!', 'error');
            stopPlayback();
            document.getElementById('third-mic-panel').style.display = 'block';
            document.getElementById('third-mic-panel').scrollIntoView({ behavior: 'smooth' });
        }
        if (e.target.id === 'btn-third-mic-cancel') {
            document.getElementById('third-mic-panel').style.display = 'none';
            document.getElementById('third-mic-response').style.display = 'none';
        }
        if (e.target.id === 'btn-third-mic-submit') {
            const question = document.getElementById('third-mic-input').value;
            if (!question) return showToast('Type your question first!', 'error');
            const responseDiv = document.getElementById('third-mic-response');
            responseDiv.style.display = 'block';
            responseDiv.textContent = 'Hosts are improvising a response...';
            const ctx = podcastLines.slice(Math.max(0, podcastIdx - 3), podcastIdx).map(l => `${l.host === 'A' ? 'Alex' : 'Blake'}: ${l.text}`).join('\n');
            callGemini([{ text: `The podcast was just discussing:\n${ctx}\n\nA listener interrupted and asked: "${question}"\n\nWrite a 3-line improvised response from Host Alex (A) and Host Blake (B) answering this question before returning to the topic. Return ONLY raw JSON:\n{"response":[{"host":"A","text":"..."},{"host":"B","text":"..."},{"host":"A","text":"Anyway, back to..."}]}` }], 'Podcast host improvising a live answer.', null, 'application/json')
            .then(res => {
                const data = parseJsonSafe(res);
                const insertLines = data.response || [];
                responseDiv.innerHTML = insertLines.map(l => `<div style="margin-bottom:0.5rem;"><strong style="color:${l.host==='A'?'#3b82f6':'#10b981'}">${l.host==='A'?'Alex':'Blake'}:</strong> ${l.text}</div>`).join('');
                // Insert the improvised lines at current position
                podcastLines.splice(podcastIdx, 0, ...insertLines);
                document.getElementById('third-mic-input').value = '';
                setTimeout(() => {
                    document.getElementById('third-mic-panel').style.display = 'none';
                    startPlayback();
                }, 2000);
            }).catch(err => { responseDiv.textContent = err.message; });
        }
    });
};

// Patch navigate to bind podcast events
const _origNavigate = window.navigate;
window.navigate = (route) => {
    _origNavigate(route);
    if (route === 'podcast') {
        // Small delay to let DOM render
        setTimeout(bindPodcastEvents, 100);
    }
};
