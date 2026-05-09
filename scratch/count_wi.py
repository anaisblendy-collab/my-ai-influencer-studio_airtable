
import os

def count_in_file(file_path, pattern):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    count = content.count(pattern)
    print(f"Count of '{pattern}': {count}")
    
    index = content.find(pattern)
    if index >= 0:
        print(f"First index: {index}")

assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
path = os.path.join(assets_dir, 'Board.CHdZV-Hu.v2.js')
count_in_file(path, 'wi')
count_in_file(path, 'xe(')
