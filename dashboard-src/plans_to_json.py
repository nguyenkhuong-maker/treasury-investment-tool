"""Chuyển các bản kế hoạch đã duyệt (plans/YYYY-MM/{company,personal}.html) thành
data/monthly-plans/archive/YYYY-MM-{company,personal}.json để dashboard hiển thị trực tiếp."""
import json, re, sys, pathlib
from bs4 import BeautifulSoup, NavigableString, Tag

NUM = re.compile(r'^[\(\-−+]?[\d.,]+\)?(\s*(VND|tỷ|%|USD|ngày))?$')

def text(el):
    for br in el.find_all('br'):
        br.replace_with('\n')
    return re.sub(r'[ \t\r\f\v]+', ' ', el.get_text()).strip()

def cell(td):
    t = text(td)
    bold = bool(td.find(['strong', 'b'])) or td.name == 'th'
    num = ('n' in (td.get('class') or [])) or bool(NUM.match(t.replace('\n', ' ')))
    return {'t': t, 'b': bold, 'n': num}

def parse_table(tb):
    rows = tb.find_all('tr')
    head, body = [], []
    for i, r in enumerate(rows):
        cells = r.find_all(['th', 'td'])
        if not cells: continue
        if i == 0 and all(c.name == 'th' for c in cells):
            head = [text(c) for c in cells]
        else:
            body.append([cell(c) for c in cells])
    return {'type': 'table', 'head': head, 'rows': body}

def parse(path):
    soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
    for s in soup(['style', 'script']): s.decompose()
    root = soup.body or soup
    out = {'title': '', 'meta': '', 'blocks': []}
    def walk(node):
        for el in node.children:
            if isinstance(el, NavigableString):
                continue
            if not isinstance(el, Tag): continue
            n = el.name
            if n == 'h1':
                if not out['title']: out['title'] = text(el)
                else: out['blocks'].append({'type': 'h', 'level': 1, 'text': text(el)})
            elif n in ('h2', 'h3', 'h4'):
                out['blocks'].append({'type': 'h', 'level': int(n[1]), 'text': text(el)})
            elif n == 'table':
                out['blocks'].append(parse_table(el))
            elif n in ('ul', 'ol'):
                items = [text(li) for li in el.find_all('li', recursive=False)]
                if items: out['blocks'].append({'type': 'ul', 'items': items})
            elif n == 'p':
                t = text(el)
                if not t: continue
                if not out['meta'] and not out['blocks'] and ('Kỳ kế hoạch' in t or 'Version' in t):
                    out['meta'] = t
                else:
                    out['blocks'].append({'type': 'p', 'text': t})
            elif n in ('div', 'section', 'main', 'article', 'header', 'footer'):
                walk(el)
            else:
                t = text(el)
                if t and n not in ('button', 'nav'): out['blocks'].append({'type': 'p', 'text': t})
    walk(root)
    return out

def main(repo, out_dir):
    repo, out_dir = pathlib.Path(repo), pathlib.Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    months = []
    for d in sorted((repo / 'plans').iterdir()):
        if not re.match(r'^\d{4}-\d{2}$', d.name): continue
        for kind in ('company', 'personal'):
            f = d / f'{kind}.html'
            if not f.exists(): continue
            data = parse(f)
            data['month'] = d.name; data['planType'] = kind; data['source'] = f'plans/{d.name}/{kind}.html'
            (out_dir / f'{d.name}-{kind}.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
            print(d.name, kind, len(data['blocks']), 'blocks', sum(1 for b in data['blocks'] if b['type'] == 'table'), 'tables')
        months.append(d.name)
    (out_dir / 'index.json').write_text(json.dumps({'months': months}, indent=1), encoding='utf-8')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
