const fs = require('fs');
const logPath = 'C:\\Users\\durrm\\.gemini\\antigravity\\brain\\71706f8a-762b-4900-aadc-45d945f42fa7\\.system_generated\\logs\\overview.txt';
// Use streams to handle large file
const stream = fs.createReadStream(logPath, { encoding: 'utf8' });
let buffer = '';
stream.on('data', (chunk) => {
    buffer += chunk;
    const lineEnd = buffer.indexOf('\n');
    if (lineEnd !== -1) {
        const line = buffer.substring(0, lineEnd);
        try {
            const data = JSON.parse(line);
            fs.writeFileSync('full_spec.md', data.content);
            console.log('Successfully extracted full_spec.md');
            process.exit(0);
        } catch (e) {
            console.error('JSON parse error', e);
            process.exit(1);
        }
    }
});
stream.on('end', () => {
    console.log('Stream ended without finding newline');
});
