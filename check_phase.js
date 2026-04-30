const fs = require('fs');
const logPath = 'C:\\Users\\durrm\\.gemini\\antigravity\\brain\\71706f8a-762b-4900-aadc-45d945f42fa7\\.system_generated\\logs\\overview.txt';
const content = fs.readFileSync(logPath, 'utf8');
const firstLine = content.split('\n')[0];
console.log('Line 1 length:', firstLine.length);
if (firstLine.includes('Phase 10')) {
    console.log('Found Phase 10');
} else {
    console.log('Phase 10 NOT found in first line');
}
