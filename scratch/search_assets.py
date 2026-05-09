
import os

def search_in_file(file_path, pattern, context=500):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    index = content.find(pattern)
    if index >= 0:
        start = max(0, index - context)
        end = min(len(content), index + context)
        print(f"--- Found '{pattern}' at index {index} ---")
        print(content[start:end])
    else:
        print(f"Pattern '{pattern}' not found")

path = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets\Board.CHdZV-Hu.v2.js'
search_in_file(path, 'ComposerNodeRenderer')
search_in_file(path, 'DND9zE17')
