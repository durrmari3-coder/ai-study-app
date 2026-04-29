// ============================================================
// LUMINA — CINEMATIC VIDEO EXPLAINER ENGINE (Phase 5)
// CSS slide orchestration + Web Speech API narration
// ============================================================

window._cinemaState = {
    slides: [],
    currentIdx: 0,
    speaking: false,
    paused: false,
    overlay: null,
};

window.playCinematicVideo = (presentationIndex) => {
    const presentations = window.AppState.presentations || [];
    const deck = presentations[presentationIndex];
    if (!deck || !deck.slides || deck.slides.length === 0) {
        return window.showToast("No slides found for this presentation.", "error");
    }

    window._cinemaState.slides = deck.slides;
    window._cinemaState.currentIdx = 0;
    window._cinemaState.paused = false;
    window._cinemaState.speaking = false;
    window.speechSynthesis.cancel();

    _buildCinemaOverlay();
    _showCinemaSlide(0, true);
};

function _buildCinemaOverlay() {
    // Remove existing overlay if any
    const existing = document.getElementById('cinema-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cinema-overlay';
    overlay.innerHTML = `
        <div id="cinema-backdrop"></div>
        <div id="cinema-container">
            <div id="cinema-progress-bar"><div id="cinema-progress-fill"></div></div>
            <div id="cinema-slide-area">
                <div id="cinema-slide-number"></div>
                <div id="cinema-title"></div>
                <div id="cinema-subtitle"></div>
                <div id="cinema-bullets" class="cinema-bullets-list"></div>
            </div>
            <div id="cinema-controls">
                <button class="cinema-btn" id="cinema-prev" onclick="window._cinemaPrev()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>
                <button class="cinema-btn cinema-btn-primary" id="cinema-play-pause" onclick="window._cinemaTogglePause()">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" id="cinema-play-icon"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <button class="cinema-btn" id="cinema-next" onclick="window._cinemaNext()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
                <div id="cinema-slide-counter" style="color:rgba(255,255,255,0.6); font-size:0.8rem; margin-left:1rem;"></div>
                <button class="cinema-btn cinema-btn-close" id="cinema-close" onclick="window._cinemaClose()" style="margin-left:auto;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
            <div id="cinema-narration-bar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" style="flex-shrink:0"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zm5 9a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2z"/></svg>
                <span id="cinema-narration-text">Preparing narration...</span>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    window._cinemaState.overlay = overlay;

    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
    });
}

window._showCinemaSlide = function(idx, autoPlay = false) {
    const { slides } = window._cinemaState;
    if (idx < 0 || idx >= slides.length) return;

    window._cinemaState.currentIdx = idx;
    const slide = slides[idx];
    window.speechSynthesis.cancel();

    const titleEl = document.getElementById('cinema-title');
    const subtitleEl = document.getElementById('cinema-subtitle');
    const bulletsEl = document.getElementById('cinema-bullets');
    const slideNumEl = document.getElementById('cinema-slide-number');
    const counterEl = document.getElementById('cinema-slide-counter');
    const fillEl = document.getElementById('cinema-progress-fill');

    if (!titleEl) return;

    // Reset animations
    [titleEl, subtitleEl, bulletsEl].forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
    });

    slideNumEl.textContent = `SLIDE ${idx + 1}`;
    counterEl.textContent = `${idx + 1} / ${slides.length}`;

    const pct = ((idx + 1) / slides.length) * 100;
    if (fillEl) fillEl.style.width = pct + '%';

    // Stagger in
    setTimeout(() => {
        titleEl.textContent = slide.title || '';
        titleEl.style.opacity = '1';
        titleEl.style.transform = 'translateY(0)';
    }, 80);

    setTimeout(() => {
        subtitleEl.textContent = slide.subtitle || '';
        subtitleEl.style.opacity = '1';
        subtitleEl.style.transform = 'translateY(0)';
    }, 220);

    setTimeout(() => {
        const bullets = slide.bullets || [];
        bulletsEl.innerHTML = bullets.map((b, i) =>
            `<div class="cinema-bullet" style="animation-delay:${i * 0.12}s">${b}</div>`
        ).join('');
        bulletsEl.style.opacity = '1';
        bulletsEl.style.transform = 'translateY(0)';
    }, 380);

    // Auto-narrate
    if (autoPlay && !window._cinemaState.paused) {
        setTimeout(() => _narrateSlideAuto(slide, idx), 600);
    }
};

function _narrateSlideAuto(slide, idx) {
    if (window._cinemaState.paused) return;
    const { slides } = window._cinemaState;

    const narrationEl = document.getElementById('cinema-narration-text');
    const iconEl = document.getElementById('cinema-play-icon');

    const text = [
        slide.title,
        slide.subtitle,
        slide.content || '',
        ...(slide.bullets || [])
    ].filter(Boolean).join('. ');

    if (narrationEl) narrationEl.textContent = text.substring(0, 80) + '...';
    if (iconEl) iconEl.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; // pause icon

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1.05;

    // Try to pick a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Daniel') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onend = () => {
        if (window._cinemaState.paused) return;
        if (narrationEl) narrationEl.textContent = 'Slide complete.';
        if (iconEl) iconEl.innerHTML = '<path d="M8 5v14l11-7z"/>'; // play icon
        // Auto-advance after a brief pause
        setTimeout(() => {
            if (!window._cinemaState.paused && window._cinemaState.currentIdx === idx) {
                const nextIdx = idx + 1;
                if (nextIdx < slides.length) {
                    _showCinemaSlide(nextIdx, true);
                } else {
                    if (narrationEl) narrationEl.textContent = '✅ Presentation complete!';
                    if (iconEl) iconEl.innerHTML = '<path d="M8 5v14l11-7z"/>'; // play
                }
            }
        }, 900);
    };

    window.speechSynthesis.speak(utter);
}

window._cinemaTogglePause = function() {
    const state = window._cinemaState;
    const iconEl = document.getElementById('cinema-play-icon');

    if (state.paused) {
        state.paused = false;
        window.speechSynthesis.resume();
        if (iconEl) iconEl.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; // pause
        // Re-narrate current slide if synthesis was fully stopped
        if (!window.speechSynthesis.speaking) {
            _showCinemaSlide(state.currentIdx, true);
        }
    } else {
        state.paused = true;
        window.speechSynthesis.pause();
        if (iconEl) iconEl.innerHTML = '<path d="M8 5v14l11-7z"/>'; // play
    }
};

window._cinemaPrev = function() {
    window.speechSynthesis.cancel();
    const idx = window._cinemaState.currentIdx - 1;
    if (idx >= 0) _showCinemaSlide(idx, !window._cinemaState.paused);
};

window._cinemaNext = function() {
    window.speechSynthesis.cancel();
    const idx = window._cinemaState.currentIdx + 1;
    if (idx < window._cinemaState.slides.length) {
        _showCinemaSlide(idx, !window._cinemaState.paused);
    }
};

window._cinemaClose = function() {
    window.speechSynthesis.cancel();
    const overlay = document.getElementById('cinema-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 350);
    }
    window._cinemaState.paused = false;
};

// Inject cinema CSS
(function injectCinemaCSS() {
    if (document.getElementById('cinema-style')) return;
    const style = document.createElement('style');
    style.id = 'cinema-style';
    style.textContent = `
        #cinema-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.88);
            opacity: 0;
            transition: opacity 0.35s ease;
            backdrop-filter: blur(8px);
        }
        #cinema-backdrop {
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.15) 0%, transparent 65%),
                        radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.12) 0%, transparent 60%);
            pointer-events: none;
        }
        #cinema-container {
            position: relative;
            width: min(900px, 92vw);
            background: rgba(13,17,30,0.95);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 1.5rem;
            box-shadow: 0 30px 80px rgba(0,0,0,0.6);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        #cinema-progress-bar {
            height: 3px;
            background: rgba(255,255,255,0.08);
            width: 100%;
        }
        #cinema-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        #cinema-slide-area {
            padding: 3rem 3.5rem 2.5rem;
            min-height: 340px;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        #cinema-slide-number {
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.15em;
            color: #3b82f6;
            text-transform: uppercase;
        }
        #cinema-title {
            font-size: clamp(1.6rem, 3.5vw, 2.4rem);
            font-weight: 800;
            color: #f8fafc;
            line-height: 1.2;
            transition: opacity 0.4s ease, transform 0.4s ease;
        }
        #cinema-subtitle {
            font-size: 1rem;
            color: #94a3b8;
            font-weight: 500;
            transition: opacity 0.4s ease, transform 0.4s ease;
        }
        #cinema-bullets {
            margin-top: 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .cinema-bullet {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            font-size: 0.95rem;
            color: #e2e8f0;
            line-height: 1.6;
            animation: cinBulletIn 0.4s ease both;
        }
        .cinema-bullet::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #3b82f6;
            margin-top: 0.52em;
            flex-shrink: 0;
        }
        @keyframes cinBulletIn {
            from { opacity: 0; transform: translateX(-14px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        #cinema-controls {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.07);
            background: rgba(0,0,0,0.2);
        }
        .cinema-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.04);
            color: #fff;
            cursor: pointer;
            transition: background 0.2s, transform 0.15s;
        }
        .cinema-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
        .cinema-btn-primary { background: #3b82f6; border-color: #3b82f6; }
        .cinema-btn-primary:hover { background: #2563eb; }
        .cinema-btn-close { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444; }
        .cinema-btn-close:hover { background: rgba(239,68,68,0.2); }
        #cinema-narration-bar {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.6rem 1.5rem;
            background: rgba(59,130,246,0.06);
            border-top: 1px solid rgba(59,130,246,0.1);
            font-size: 0.72rem;
            color: #94a3b8;
            min-height: 36px;
        }
        #cinema-narration-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        /* Citation badge in chat */
        .citation-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(59,130,246,0.15);
            border: 1px solid rgba(59,130,246,0.4);
            color: #3b82f6;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.05em 0.4em;
            border-radius: 0.3em;
            cursor: pointer;
            transition: all 0.2s;
            vertical-align: super;
            line-height: 1;
            margin: 0 1px;
            user-select: none;
        }
        .citation-badge:hover {
            background: rgba(59,130,246,0.3);
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(style);
})();
