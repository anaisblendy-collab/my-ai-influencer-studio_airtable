
import os
import sys

# Set stdout to utf-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def find_all_assignments(file_path, var_name):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = var_name + '='
    index = content.find(pattern)
    while index >= 0:
        print(f"--- Found '{pattern}' at index {index} ---")
        print(content[max(0, index-20):index+200])
        index = content.find(pattern, index + 1)

path = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets\useBoard.BIYDnM-b.v2.js'
find_all_assignments(path, 'ze')
find_all_assignments(path, 'ut')
find_all_assignments(path, 'bt')
find_all_assignments(path, 'ot')
