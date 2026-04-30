/**
 * Lumina Vector & Security Utils (Phases 16 & 17)
 */

// --- Phase 16: Performance Optimization ---

window.fastCosineSimilarity = (vecA, vecB) => {
    // Highly optimized loop
    let dot = 0, mA = 0, mB = 0;
    for (let i = 0, len = vecA.length; i < len; i++) {
        const a = vecA[i], b = vecB[i];
        dot += a * b;
        mA += a * a;
        mB += b * b;
    }
    return dot / (Math.sqrt(mA) * Math.sqrt(mB));
};

// Background Indexing Queue
window._indexQueue = [];
window._isIndexing = false;

window.enqueueIndexing = (task) => {
    window._indexQueue.push(task);
    if (!window._isIndexing) window._processIndexQueue();
};

window._processIndexQueue = async () => {
    if (window._indexQueue.length === 0) {
        window._isIndexing = false;
        return;
    }
    window._isIndexing = true;
    const task = window._indexQueue.shift();
    try {
        await task();
    } catch (e) {
        console.error("Index task failed", e);
    }
    // Yield to main thread
    setTimeout(window._processIndexQueue, 100);
};


// --- Phase 17: Security & Privacy (PII Scrubbing) ---

window.scrubPII = (text) => {
    if (!text) return text;
    let scrubbed = text;
    
    // Emails
    scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
    
    // Phone numbers (US style)
    scrubbed = scrubbed.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REDACTED]');
    
    // Credit cards (very basic)
    scrubbed = scrubbed.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[FINANCIAL DATA REDACTED]');
    
    return scrubbed;
};

// Intercept window.callGemini to scrub PII automatically
const originalCallGemini = window.callGemini;
window.callGemini = async (parts, sys, hist, mime, model) => {
    // Scrub parts
    const scrubbedParts = parts.map(p => {
        if (p.text) return { ...p, text: window.scrubPII(p.text) };
        return p;
    });
    
    // Scrub history
    const scrubbedHist = hist ? hist.map(h => ({ ...h, content: window.scrubPII(h.content) })) : null;
    
    return originalCallGemini(scrubbedParts, window.scrubPII(sys), scrubbedHist, mime, model);
};
