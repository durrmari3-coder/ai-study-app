/**
 * Lumina Export Engine (Phase 12)
 * Handles PDF generation for presentations and SVG/JSON exports for Knowledge Maps.
 */

window.exportPresentationPDF = (notebookId) => {
    const nb = window.AppState.notebooks.find(n => n.id === notebookId) || 
               window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
    if (!nb || !window.AppState.presentations || window.AppState.presentations.length === 0) {
        return window.showToast("No presentation found to export.", "warning");
    }

    const deck = window.AppState.presentations[0]; // Export most recent
    const printWindow = window.open('', '_blank');
    
    let slidesHtml = deck.slides.map((s, i) => `
        <div class="slide" style="page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 4rem; box-sizing: border-box; background: white; color: black; font-family: 'Inter', sans-serif;">
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2rem;">Lumina Research &bull; Slide ${i+1}</div>
            <h1 style="font-size: 3rem; margin-bottom: 1.5rem; color: #1a365d;">${s.title}</h1>
            <h3 style="font-size: 1.5rem; margin-bottom: 2rem; color: #4a5568;">${s.subtitle}</h3>
            <div style="font-size: 1.2rem; line-height: 1.6; margin-bottom: 2rem;">${s.content}</div>
            <ul style="font-size: 1.1rem; line-height: 1.8;">
                ${s.bullets.map(b => `<li>${b}</li>`).join('')}
            </ul>
        </div>
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>${nb.title} - Presentation</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body { margin: 0; }
                    @media print {
                        .slide { border: none !important; }
                    }
                </style>
            </head>
            <body>${slidesHtml}</body>
            <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 500);
            </script>
        </html>
    `);
    printWindow.document.close();
};

window.exportKnowledgeMapSVG = () => {
    const container = document.getElementById('temp-km-container') || document.getElementById('mindmap-outputs');
    if (!container) return window.showToast("Knowledge Map not found.", "warning");
    
    const svg = container.querySelector('svg');
    if (!svg) return window.showToast("SVG not found in container.", "warning");

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+xmlns\:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Lumina_Knowledge_Map_${new Date().getTime()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.showToast("Knowledge Map exported as SVG!", "success");
};

window.exportNotebookJSON = () => {
    const nb = window.AppState.notebooks.find(n => n.id === window.AppState.activeNotebookId);
    if (!nb) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nb, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${nb.title.replace(/\s+/g, '_')}_Backup.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    window.showToast("Notebook exported as JSON!", "success");
};
