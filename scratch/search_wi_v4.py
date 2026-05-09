
import os
import sys

# Set stdout to utf-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def search_in_file(file_path, pattern, start_index=0):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    index = content.find(pattern, start_index)
    while index >= 0:
        print(f"--- Found '{pattern}' at index {index} ---")
        print(content[index-100:index+500])
        index = content.find(pattern, index + 1)
        if index > 0: break

assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
path = os.path.join(assets_dir, 'Board.CHdZV-Hu.v2.js')
search_in_file(path, 'wi', start_index=1100000)
