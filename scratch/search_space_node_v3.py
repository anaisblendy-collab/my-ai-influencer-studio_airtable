
import os

def search_in_file(file_path, pattern, start_index=0):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    index = content.find(pattern, start_index)
    if index >= 0:
        print(f"--- Found '{pattern}' at index {index} ---")
        print(content[index-100:index+100])

assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
path = os.path.join(assets_dir, 'Board.CHdZV-Hu.v2.js')
search_in_file(path, 'space-node-', start_index=800000)
