/**
 * Lumina RAG Engine (Phase 1)
 * Handles document chunking, embeddings, and vector search for large notebooks.
 */

const RAG_CONFIG = {
    chunkSize: 1000, // characters
    chunkOverlap: 200,
    embeddingModel: 'text-embedding-004'
};

/**
 * Splits text into semantic chunks with overlap.
 */
window.chunkText = (text, size = RAG_CONFIG.chunkSize, overlap = RAG_CONFIG.chunkOverlap) => {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = start + size;
        chunks.push(text.substring(start, end));
        start += (size - overlap);
    }
    return chunks;
};

/**
 * Generates embeddings for a given text using Gemini.
 */
window.generateEmbedding = async (text) => {
    const key = window.AppState.apiKey;
    if (!key) throw new Error("API Key Missing");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${RAG_CONFIG.embeddingModel}:embedContent?key=${key}`;
    const body = {
        model: `models/${RAG_CONFIG.embeddingModel}`,
        content: { parts: [{ text }] }
    };

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message || "Embedding generation failed");
    }

    const data = await resp.json();
    return data.embedding.values;
};

/**
 * Calculates cosine similarity between two vectors.
 */
window.cosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Performs a vector search over the notebook's documents.
 * Returns the top K most relevant chunks.
 */
window.vectorSearch = async (query, topK = 5) => {
    const queryEmbedding = await window.generateEmbedding(query);
    const activeNotebookId = window.AppState.activeNotebookId;
    
    // We expect chunks to be stored in IndexedDB for the active notebook
    // Key: lumina_chunks_{notebookId}
    const allChunks = await idbKeyval.get(`lumina_chunks_${activeNotebookId}`) || [];
    
    const results = allChunks.map(chunk => ({
        ...chunk,
        score: window.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by score descending and take top K
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
};

window.findRelevantChunks = window.vectorSearch;

/**
 * Processes a document for RAG: chunks it, generates embeddings, and saves to IndexedDB.
 */
window.indexDocument = async (docTitle, text, sourceIdx) => {
    const chunks = window.chunkText(text);
    const activeNotebookId = window.AppState.activeNotebookId;
    if (!activeNotebookId) return;

    const indexedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
        try {
            const embedding = await window.generateEmbedding(chunks[i]);
            indexedChunks.push({
                id: `${docTitle}_${i}`,
                source: docTitle,
                sourceIndex: sourceIdx,
                text: chunks[i],
                embedding
            });
        } catch (e) {
            console.warn(`Failed to embed chunk ${i} of ${docTitle}:`, e);
        }
    }

    // Append to existing chunks for this notebook
    const existing = await idbKeyval.get(`lumina_chunks_${activeNotebookId}`) || [];
    await idbKeyval.set(`lumina_chunks_${activeNotebookId}`, [...existing, ...indexedChunks]);
    console.log(`[RAG] Indexed ${chunks.length} chunks for ${docTitle}`);
};

