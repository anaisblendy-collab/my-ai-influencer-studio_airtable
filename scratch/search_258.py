
import os

def search_in_file(file_path, pattern, context=500):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    index = content.find(pattern)
    if index >= 0:
        start = max(0, index - context)
        end = min(len(content), index + context)
        print(f"--- Found '{pattern}' in {os.path.basename(file_path)} at index {index} ---")
        print(content[start:end])
        return True
    return False

assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
path = os.path.join(assets_dir, 'Board.CHdZV-Hu.v2.js')
search_in_file(path, '258')
