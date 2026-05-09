const fs = require('fs');
const logPath = 'C:\\Users\\durrm\\.gemini\\antigravity\\brain\\43674595-b288-4bfb-943e-12014cfb990a\\.system_generated\\logs\\overview.txt';
const stream = fs.createReadStream(logPath, { encoding: 'utf8' });
let buffer = '';
let found = false;

stream.on('data', (chunk) => {
    if (found) return;
    buffer += chunk;
    // Look for the first JSON object which contains the spec
    // It's likely the first line or one of the first lines
    let lineEnd = buffer.indexOf('\n');
    while (lineEnd !== -1) {
        const line = buffer.substring(0, lineEnd);
        buffer = buffer.substring(lineEnd + 1);
        try {
            const data = JSON.parse(line);
            if (data.content && data.content.includes('ULTRA COMPREHENSIVE NOTEBOOKLM REPLICATION SPECIFICATION')) {
                fs.writeFileSync('full_spec_actual.md', data.content);
                console.log('Successfully extracted full_spec_actual.md');
                found = true;
                stream.destroy();
                break;
            }
        } catch (e) {
            // Ignore parse errors for non-JSON lines
        }
        lineEnd = buffer.indexOf('\n');
    }
});

stream.on('end', () => {
    if (!found) console.log('Spec not found in log.');
});
