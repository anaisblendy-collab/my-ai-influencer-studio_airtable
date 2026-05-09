
import os
import sys

# Set stdout to utf-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def find_context(file_path, pattern):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    index = content.find(pattern)
    if index >= 0:
        print(f"--- Found '{pattern}' at index {index} ---")
        print(content[max(0, index-100):index+500])
    else:
        print(f"'{pattern}' not found")

path = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets\useBoard.BIYDnM-b.v2.js'
find_context(path, 'ATTACHMENTS')
