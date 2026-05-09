
import os
import sys

# Set stdout to utf-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def search_in_file(file_path, pattern, context_before=5000, context_after=5000, start_index=0):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    index = content.find(pattern, start_index)
    if index >= 0:
        start = max(0, index - context_before)
        end = min(len(content), index + context_after)
        print(f"--- Around '{pattern}' in {os.path.basename(file_path)} at index {index} ---")
        print(content[start:end])
        return True
    return False

assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
path = os.path.join(assets_dir, 'Board.CHdZV-Hu.v2.js')
search_in_file(path, 'wi', start_index=1000000)
