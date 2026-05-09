
import os

def search_in_file(file_path, pattern, context_before=500, context_after=2000):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    index = content.find(pattern)
    while index >= 0:
        start = max(0, index - context_before)
        end = min(len(content), index + context_after)
        print(f"--- Found '{pattern}' in {os.path.basename(file_path)} at index {index} ---")
        print(content[start:end])
        index = content.find(pattern, index + 1)

assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
path = os.path.join(assets_dir, 'Board.CHdZV-Hu.v2.js')
search_in_file(path, 'yR')
