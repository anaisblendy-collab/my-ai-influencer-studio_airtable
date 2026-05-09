import json

# Read Weavy nodes
with open(r'C:\Users\Pret\Documents\app.weavy.ai\api.weavy.ai\api\v1\node-definitions\public.html', 'r', encoding='utf-8') as f:
    data = json.load(f)

color_map = {
    'Yambo_Black': '#333333',
    'Yambo_Purple': '#9B5FFF', 
    'Yambo_Blue': '#6C8EF5',
    'Yambo_Green': '#4ECDC4',
    'Yambo_Red': '#FF6B6B',
    'Yambo_Yellow': '#FFD93D',
    'Yambo_White': '#FFFFFF'
}

output = []
for node in data:
    node_data = node.get('data', {})
    handles = node_data.get('handles') or {}
    inputs = handles.get('input', []) or []
    outputs = handles.get('output', []) or []
    
    schema = {
        'inputs': {k: {'type': 'text', 'label': k} for k in inputs},
        'outputs': {k: {'type': 'text', 'label': k} for k in outputs},
        'parameters': []
    }
    
    schema_params = node_data.get('schema') or {}
    for p_key, p_val in schema_params.items():
        param = {
            'id': p_key,
            'type': p_val.get('type', 'string'),
            'label': p_val.get('title', p_key),
        }
        if 'default' in p_val:
            param['default'] = p_val['default']
        if 'options' in p_val:
            param['options'] = p_val['options']
        schema['parameters'].append(param)
    
    output.append({
        'id': node.get('type'),
        'name': node_data.get('name', node.get('type')),
        'type': node.get('type'),
        'category': 'Weavy',
        'color': color_map.get(node_data.get('color', ''), '#6C8EF5'),
        'description': node_data.get('description', ''),
        'schema': schema,
        'isModel': node.get('isModel', False)
    })

with open('C:/Users/Pret/Documents/influen_extension/weavy_nodes.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f'Exported {len(output)} nodes to weavy_nodes.json')