
import os

def search_in_all_assets(pattern):
    assets_dir = r'D:\www.freepik.com\static.cdnpk.net\pikaso\assets'
    for filename in os.listdir(assets_dir):
        if filename.endswith('.js'):
            path = os.path.join(assets_dir, filename)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if pattern in content:
                print(f"Found '{pattern}' in {filename}")

search_in_all_assets('node-types')
