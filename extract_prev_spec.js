const fs = require('fs');
const logPath = 'C:\\Users\\durrm\\.gemini\\antigravity\\brain\\47c22da0-efa1-46cb-8d54-925c8a0382b3\\.system_generated\\logs\\overview.txt';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');
// Search for the line that has "REPLICATE"
const targetLine = lines.find(l => l.includes('REPLICATE'));
if (targetLine) {
    const data = JSON.parse(targetLine);
    fs.writeFileSync('prev_spec.md', data.content);
    console.log('Extracted prev_spec.md');
} else {
    console.log('REPLICATE prompt not found in prev log');
}
