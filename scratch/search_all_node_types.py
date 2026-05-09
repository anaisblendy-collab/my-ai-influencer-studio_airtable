
import os

def search_all_in_file(file_path, pattern):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    index = content.find(pattern)
    while index >= 0:
        print(f"--- Found '{pattern}' at index {index} ---")
        print(content[index-100:index+100])
        index = content.find(pattern, index + 1)

assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
path = os.path.join(assets_dir, 'Board.CHdZV-Hu.v2.js')
search_all_in_file(path, 'nodeTypes')
