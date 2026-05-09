import re
import sys

with open('C:/Users/Pret/Documents/influen_extension/frontend/components/StorageTab.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def repl(m):
    return m.group(0)[0] + ' ' * (len(m.group(0))-2) + m.group(0)[-1]

# blank out strings
t2 = re.sub(r'\"(?:\\.|[^\"])*\"', repl, text)
t2 = re.sub(r'\'(?:\\.|[^\'])*\'', repl, t2)
t2 = re.sub(r'`(?:\\.|[^`])*`', repl, t2)

# blank out comments
t2 = re.sub(r'//.*', lambda m: ' ' * len(m.group(0)), t2)
t2 = re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), t2, flags=re.DOTALL)

st = []
for i, c in enumerate(t2):
    if c == '(':
        st.append(i)
    elif c == ')':
        if not st:
            line = text[:i].count('\n') + 1
            print('Unmatched ) at line', line)
        else:
            st.pop()

for i in st:
    line = text[:i].count('\n') + 1
    print('Unmatched ( at line', line)
