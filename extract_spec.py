import json
import os

log_path = r'C:\Users\durrm\.gemini\antigravity\brain\71706f8a-762b-4900-aadc-45d945f42fa7\.system_generated\logs\overview.txt'
with open(log_path, 'r', encoding='utf-8') as f:
    first_line = f.readline()
    data = json.loads(first_line)
    content = data.get('content', '')
    with open('full_spec.md', 'w', encoding='utf-8') as out:
        out.write(content)
