import os

path = r'c:\Users\Pret\Documents\influen_extension\frontend\components\WorkflowTabV2.tsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Fix common powershell encoding issues if any, and ensure UTF-8
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Encoding fixed.")
