import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Knowledge Map to studio generator grid
old_neural = '                    <h3>Neural Map</h3>\r\n                    <p>Visual relationship graph.</p>\r\n                </div>\r\n            </div>'
new_neural = '''                    <h3>Neural Map</h3>\r\n                    <p>Visual relationship graph.</p>\r\n                </div>\r\n                <div class="studio-gen-card glass-panel" onclick="window.generateStudio(\'knowledgemap\')" style="cursor:pointer; padding: 1.5rem; background: rgba(255,255,255,0.03)">\r\n                    <ion-icon name="planet-outline" style="font-size:1.5rem; color:#8b5cf6"></ion-icon>\r\n                    <h3>Knowledge Map</h3>\r\n                    <p>Force-directed concept graph with clickable drill-down.</p>\r\n                </div>\r\n            </div>'''

if old_neural in content:
    content = content.replace(old_neural, new_neural)
    print('Knowledge Map card added')
else:
    # Try with \n only
    old_n = old_neural.replace('\r\n', '\n')
    new_n = new_neural.replace('\r\n', '\n')
    if old_n in content:
        content = content.replace(old_n, new_n)
        print('Knowledge Map card added (LF)')
    else:
        print('WARN: Neural Map pattern not found')

# 2. Change studio generator grid from 2 cols to 3 cols
content = content.replace(
    '"studio-generator-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;"',
    '"studio-generator-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;"'
)

# 3. Also handle the knowledgemap case in generateStudio
old_studio_else = "                    parts.push({ text: `${complexityInstruction}${focusInstruction}Create a Mermaid graph TD representing a Neural Map / Mind Map of the key concepts in the context. Output raw syntax ONLY. Do NOT use markdown code blocks.` });\n                    const res = await callGemini(parts, \"Mermaid expert.\");\n                    workspace.innerHTML = `<div class=\"mermaid\">${res}</div>`;\n                    if (window.mermaid) mermaid.init(undefined, workspace.querySelectorAll('.mermaid'));"
# We'll handle knowledgemap by appending logic via the patch file instead

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
