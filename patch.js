const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Add 'knowledgemap' case to generateStudio
const oldElse = `                } else {\n                    parts.push({ text: \`\${complexityInstruction}\${focusInstruction}Create a Mermaid graph TD representing a Neural Map / Mind Map of the key concepts in the context. Output raw syntax ONLY. Do NOT use markdown code blocks.\` });\n                    const res = await callGemini(parts, "Mermaid expert.");\n                    workspace.innerHTML = \`<div class="mermaid">\${res}</div>\`;\n                    if (window.mermaid) mermaid.init(undefined, workspace.querySelectorAll('.mermaid'));\n                }`;

const newElse = `                } else if (type === 'knowledgemap') {\n                    parts.push({ text: \`\${complexityInstruction}\${focusInstruction}Extract the 8-15 most important concepts from the source and their relationships. Return ONLY raw JSON: {"nodes":[{"id":"n1","label":"Main Concept","importance":5,"description":"brief description"},{"id":"n2","label":"Sub Concept","importance":3,"description":"brief description"}],"edges":[{"from":"n1","to":"n2","label":"contains","type":"hierarchy"}]}\` });\n                    const res = await callGemini(parts, "You are a knowledge graph expert. Return ONLY raw valid JSON.", null, "application/json");\n                    const graph = parseJsonSafe(res);\n                    window.renderKnowledgeMap(workspace, graph);\n                } else {\n                    parts.push({ text: \`\${complexityInstruction}\${focusInstruction}Create a Mermaid graph TD representing a Neural Map / Mind Map of the key concepts in the context. Output raw syntax ONLY. Do NOT use markdown code blocks.\` });\n                    const res = await callGemini(parts, "Mermaid expert.");\n                    workspace.innerHTML = \`<div class="mermaid">\${res}</div>\`;\n                    if (window.mermaid) mermaid.init(undefined, workspace.querySelectorAll('.mermaid'));\n                }`;

if (content.includes(oldElse)) {
    content = content.replace(oldElse, newElse);
    console.log('Knowledge Map generation case added');
} else {
    console.log('Pattern not found for studio else block');
    // Try with \r\n
    const oldCRLF = oldElse.replace(/\n/g, '\r\n');
    if (content.includes(oldCRLF)) {
        content = content.replace(oldCRLF, newElse);
        console.log('Knowledge Map generation case added (CRLF)');
    } else {
        console.log('Still not found. Checking partial...');
        const idx = content.indexOf('Mermaid graph TD');
        if (idx > -1) console.log('Found Mermaid at:', idx, '| context:', JSON.stringify(content.substring(idx-50, idx+100)));
    }
}

fs.writeFileSync('app.js', content, 'utf8');
console.log('Saved');
