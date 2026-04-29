// ============================================================
// LUMINA — PODCAST ENGINE UPGRADE (Phase 8)
// Multi-voice TTS, pause/resume/seek, transcript view
// ============================================================

window._podcastPlayer = {
    segments: [],
    currentIdx: 0,
    paused: false,
    transcript: [],
};

// Override the podcast play logic to use enhanced multi-voice player
window.playPodcastEnhanced = (segments, title) => {
    if (!segments || segments.length === 0) return window.showToast("No podcast content to play.", "error");

    const state = window._podcastPlayer;
    state.segments = segments;
    state.currentIdx = 0;
    state.paused = false;
    state.transcript = segments.map(s => ({ speaker: s.speaker || 'Host', text: s.text }));

    window.speechSynthesis.cancel();
    _buildPodcastPlayer(title, segments);
    _playPodcastSegment(0);
};

function _buildPodcastPlayer(title, segments) {
    const existing = document.getElementById('podcast-player-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'podcast-player-overlay';
    overlay.innerHTML = `
        <div id="podcast-player-panel">
            <div id="podcast-player-header">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="width:42px; height:42px; border-radius:0.75rem; background:linear-gradient(135deg,#3b82f6,#8b5cf6); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;">🎙️</div>
                    <div>
                        <div style="font-weight:700; font-size:0.95rem; color:white;">${title || 'AI Podcast'}</div>
                        <div style="font-size:0.7rem; color:rgba(255,255,255,0.5);" id="podcast-seg-label">Segment 1 of ${segments.length}</div>
                    </div>
                </div>
                <button class="cinema-btn cinema-btn-close" onclick="window._closePodcastPlayer()" style="width:32px; height:32px; font-size:0.8rem;">✕</button>
            </div>

            <!-- Waveform animation -->
            <div id="podcast-waveform">
                ${Array.from({length: 28}, (_, i) =>
                    `<div class="wave-bar" style="animation-delay:${(i * 0.07).toFixed(2)}s; height:${8 + Math.sin(i) * 10}px;"></div>`
                ).join('')}
            </div>

            <!-- Progress bar -->
            <div id="podcast-progress-track" onclick="window._podcastSeek(event)">
                <div id="podcast-progress-fill"></div>
            </div>

            <!-- Speaker label -->
            <div id="podcast-speaker-tag">
                <span id="podcast-speaker-name">Loading...</span>
            </div>

            <!-- Controls -->
            <div id="podcast-controls">
                <button class="cinema-btn" onclick="window._podcastPrev()">⏮</button>
                <button class="cinema-btn cinema-btn-primary" id="podcast-play-btn" onclick="window._podcastToggle()" style="width:52px; height:52px; font-size:1.3rem;">⏸</button>
                <button class="cinema-btn" onclick="window._podcastNext()">⏭</button>
            </div>

            <!-- Tabs: Transcript / Info -->
            <div id="podcast-tabs" style="display:flex; border-bottom:1px solid rgba(255,255,255,0.07); margin-top:0.5rem;">
                <button class="podcast-tab active" onclick="window._switchPodcastTab('transcript', this)">Transcript</button>
                <button class="podcast-tab" onclick="window._switchPodcastTab('save', this)">Save</button>
            </div>
            <div id="podcast-transcript-panel" style="max-height:180px; overflow-y:auto; padding:0.75rem;">
                ${segments.map((s, i) => `
                    <div class="transcript-line" id="transcript-line-${i}" onclick="window._podcastSeekToSegment(${i})" style="padding:0.5rem 0.6rem; border-radius:0.5rem; cursor:pointer; margin-bottom:0.25rem; transition:background 0.2s;">
                        <span style="font-size:0.65rem; font-weight:700; color:${s.speaker === 'Host B' ? '#8b5cf6' : '#3b82f6'}; text-transform:uppercase; margin-right:0.5rem;">${s.speaker || 'Host'}</span>
                        <span style="font-size:0.8rem; color:rgba(255,255,255,0.7);">${s.text?.substring(0, 120) || ''}${(s.text?.length || 0) > 120 ? '...' : ''}</span>
                    </div>
                `).join('')}
            </div>
            <div id="podcast-save-panel" style="display:none; padding:0.75rem; text-align:center;">
                <p style="color:rgba(255,255,255,0.6); font-size:0.8rem; margin-bottom:0.75rem;">Save this podcast to your notebook notes.</p>
                <button class="btn btn-primary" style="width:100%;" onclick="window._savePodcastToNotes()">💾 Save to Notes</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '1');
}

function _playPodcastSegment(idx) {
    const state = window._podcastPlayer;
    if (idx < 0 || idx >= state.segments.length) return;
    state.currentIdx = idx;

    const seg = state.segments[idx];
    window.speechSynthesis.cancel();

    // Update UI
    const segLabel = document.getElementById('podcast-seg-label');
    const speakerName = document.getElementById('podcast-speaker-name');
    const progressFill = document.getElementById('podcast-progress-fill');
    const transcriptLines = document.querySelectorAll('.transcript-line');

    if (segLabel) segLabel.textContent = `Segment ${idx + 1} of ${state.segments.length}`;
    if (speakerName) speakerName.textContent = seg.speaker || 'Host';
    if (progressFill) progressFill.style.width = ((idx + 1) / state.segments.length * 100) + '%';

    transcriptLines.forEach((el, i) => {
        el.style.background = i === idx ? 'rgba(59,130,246,0.15)' : '';
        el.style.color = i === idx ? 'white' : '';
    });
    if (transcriptLines[idx]) {
        transcriptLines[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (state.paused) return;

    const utter = new SpeechSynthesisUtterance(seg.text || '');
    utter.rate = 0.94;
    utter.pitch = seg.speaker === 'Host B' ? 0.85 : 1.1;

    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (enVoices.length > 1) {
        utter.voice = seg.speaker === 'Host B' ? enVoices[1] : enVoices[0];
    }

    utter.onend = () => {
        if (!state.paused && state.currentIdx === idx) {
            setTimeout(() => _playPodcastSegment(idx + 1), 400);
        }
    };

    window.speechSynthesis.speak(utter);

    // Activate waveform
    const waveform = document.getElementById('podcast-waveform');
    if (waveform) waveform.classList.add('playing');
}

window._podcastToggle = () => {
    const state = window._podcastPlayer;
    const btn = document.getElementById('podcast-play-btn');
    const waveform = document.getElementById('podcast-waveform');
    if (state.paused) {
        state.paused = false;
        window.speechSynthesis.resume();
        if (!window.speechSynthesis.speaking) _playPodcastSegment(state.currentIdx);
        if (btn) btn.textContent = '⏸';
        if (waveform) waveform.classList.add('playing');
    } else {
        state.paused = true;
        window.speechSynthesis.pause();
        if (btn) btn.textContent = '▶';
        if (waveform) waveform.classList.remove('playing');
    }
};

window._podcastPrev = () => {
    window.speechSynthesis.cancel();
    _playPodcastSegment(window._podcastPlayer.currentIdx - 1);
};
window._podcastNext = () => {
    window.speechSynthesis.cancel();
    _playPodcastSegment(window._podcastPlayer.currentIdx + 1);
};
window._podcastSeekToSegment = (idx) => {
    window.speechSynthesis.cancel();
    window._podcastPlayer.paused = false;
    _playPodcastSegment(idx);
};
window._podcastSeek = (e) => {
    const track = e.currentTarget;
    const pct = e.offsetX / track.offsetWidth;
    const idx = Math.floor(pct * window._podcastPlayer.segments.length);
    window._podcastSeekToSegment(Math.max(0, Math.min(idx, window._podcastPlayer.segments.length - 1)));
};
window._closePodcastPlayer = () => {
    window.speechSynthesis.cancel();
    const el = document.getElementById('podcast-player-overlay');
    if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }
};
window._switchPodcastTab = (tab, btn) => {
    document.querySelectorAll('.podcast-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('podcast-transcript-panel').style.display = tab === 'transcript' ? 'block' : 'none';
    document.getElementById('podcast-save-panel').style.display = tab === 'save' ? 'block' : 'none';
};
window._savePodcastToNotes = () => {
    const state = window._podcastPlayer;
    const nbId = window.AppState.activeNotebookId;
    if (!nbId) return window.showToast("Open a notebook first.", "error");
    const nb = window.AppState.notebooks.find(n => n.id === nbId);
    if (!nb) return;
    if (!nb.notes) nb.notes = [];
    nb.notes.push({
        id: Math.random().toString(36).substring(2,9),
        type: 'podcast',
        title: 'AI Podcast Transcript',
        content: state.transcript.map(s => `**${s.speaker}:** ${s.text}`).join('\n\n'),
        date: new Date().toISOString()
    });
    window.saveState('notebooks', window.AppState.notebooks);
    window.showToast("Podcast saved to notes!", "success");
};

// Hook into existing podcast patch if present
document.addEventListener('DOMContentLoaded', () => {
    // Override the old play function if podcast_patch defines one
    const origPlay = window.playPodcast;
    window.playPodcast = (segments, title) => {
        if (segments && Array.isArray(segments)) {
            window.playPodcastEnhanced(segments, title);
        } else if (origPlay) {
            origPlay(segments, title);
        }
    };
});

// Inject podcast player CSS
(function() {
    if (document.getElementById('podcast-player-style')) return;
    const s = document.createElement('style');
    s.id = 'podcast-player-style';
    s.textContent = `
        #podcast-player-overlay {
            position: fixed;
            bottom: 0; right: 0;
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s;
            padding: 1.5rem;
        }
        #podcast-player-panel {
            width: 360px;
            background: rgba(13,17,30,0.97);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 1.25rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6);
            overflow: hidden;
            backdrop-filter: blur(20px);
        }
        #podcast-player-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        #podcast-waveform {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            height: 48px;
            padding: 0 1.25rem;
            margin: 0.5rem 0;
        }
        .wave-bar {
            width: 3px;
            border-radius: 3px;
            background: #3b82f6;
            opacity: 0.3;
            transition: height 0.2s;
        }
        #podcast-waveform.playing .wave-bar {
            opacity: 0.9;
            animation: waveAnim 0.8s ease-in-out infinite alternate;
        }
        @keyframes waveAnim {
            from { transform: scaleY(0.4); }
            to   { transform: scaleY(1.6); }
        }
        #podcast-progress-track {
            height: 4px;
            background: rgba(255,255,255,0.08);
            margin: 0 1.25rem;
            border-radius: 2px;
            cursor: pointer;
            position: relative;
        }
        #podcast-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            border-radius: 2px;
            transition: width 0.4s ease;
            pointer-events: none;
        }
        #podcast-speaker-tag {
            text-align: center;
            padding: 0.5rem;
            font-size: 0.7rem;
            color: rgba(255,255,255,0.45);
        }
        #podcast-speaker-name {
            background: rgba(59,130,246,0.12);
            border: 1px solid rgba(59,130,246,0.25);
            color: #3b82f6;
            padding: 0.2em 0.7em;
            border-radius: 1rem;
            font-weight: 700;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        #podcast-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 0.75rem 1.25rem 1rem;
        }
        .podcast-tab {
            flex: 1;
            padding: 0.6rem;
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            font-size: 0.78rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        .podcast-tab.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
        }
        .transcript-line:hover { background: rgba(255,255,255,0.04) !important; }
    `;
    document.head.appendChild(s);
})();
