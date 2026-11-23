#!/usr/bin/env python3
"""Gộp mục lục SGK (data-src/sgk/*.txt, chép từ trang mục lục của Bộ SGK thống nhất trên taphuan.nxbgd.vn)
thành js/data/sgk.js. Định dạng mỗi tệp:
  BOOK|id|lớp|môn|tên sách|đường dẫn đọc sách|độ lệch trang (chỉ số ảnh = trang in + độ lệch; để trống nếu chưa đo)
  C|tên chương/chủ đề|trang
  B|số bài|tên bài|trang
"""
import json, glob, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
books = []
for f in sorted(glob.glob(os.path.join(root, 'data-src/sgk/*.txt'))):
    book = None
    for ln in open(f, encoding='utf-8'):
        ln = ln.rstrip('\n')
        if not ln.strip():
            continue
        p = ln.split('|')
        if p[0] == 'BOOK':
            off = p[6].strip() if len(p) > 6 else ''
            book = {'id': p[1], 'grade': int(p[2]), 'subject': p[3], 'title': p[4], 'reader': p[5], 'off': int(off) if off not in ('', 'x') else None, 'items': []}
            books.append(book)
        elif p[0] == 'C':
            book['items'].append(['C', p[1], int(p[2]) if p[2].strip().isdigit() else None])
        elif p[0] == 'B':
            book['items'].append(['B', p[1], p[2], int(p[3]) if len(p) > 3 and p[3].strip().isdigit() else None])
out = '/* Mục lục Bộ SGK thống nhất (taphuan.nxbgd.vn) – sinh tự động bởi tools/build_sgk.py, không sửa tay. */\nwindow.L360_SGK=' + json.dumps(books, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(root, 'js/data/sgk.js'), 'w', encoding='utf-8').write(out)
print(len(books), 'sách,', sum(1 for b in books for i in b['items'] if i[0] == 'B'), 'bài')
