const fs = require('fs');
const logPath = 'C:\\Users\\durrm\\.gemini\\antigravity\\brain\\71706f8a-762b-4900-aadc-45d945f42fa7\\.system_generated\\logs\\overview.txt';
const firstLine = fs.readFileSync(logPath, 'utf8').split('\n')[0];
const data = JSON.parse(firstLine);
fs.writeFileSync('full_spec.md', data.content);
console.log('Extracted full_spec.md');
