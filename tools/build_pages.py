#!/usr/bin/env python3
"""Sinh các trang HTML với cùng một danh sách thư viện (chạy lại khi thêm tệp JS hoặc bài mẫu)."""
import os, glob, hashlib
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORE = ["js/config.js", "js/vendor/qrcode.js", "js/vendor/firebase/firebase-app-compat.js", "js/vendor/firebase/firebase-auth-compat.js", "js/vendor/firebase/firebase-database-compat.js",
        "js/core/util.js", "js/core/store.js", "js/core/design.js", "js/core/sound.js", "js/core/ui.js", "js/core/blocks.js",
        "js/data/sgk.js", "js/data/eduhistory.js", "js/core/curriculum.js", "js/core/pack.js", "js/core/room.js", "js/core/shell.js", "js/core/help.js", "js/core/auth.js", "js/core/library.js", "js/core/ppct.js",
        "js/data/heritage-sites.js", "js/activities/basic.js", "js/activities/game.js", "js/activities/interactive.js", "js/activities/group.js", "js/activities/explore.js", "js/activities/web.js"]
PACKS = sorted(os.path.relpath(p, root) for p in glob.glob(os.path.join(root, "packs/*.js")))
STUDIO = ["js/core/architect.js", "js/core/images.js", "js/core/khbd.js", "js/core/pptx.js"]
PAGES = {
    "index.html": ("Lesson 360° Studio – Xưởng AI kiến tạo bài học số từ giáo án", [], True, "js/pages/portal.js", ""),
    "thuvien.html": ("Thư viện bài học – Lesson 360°", [], True, "js/pages/library.js", ""),
    "studio.html": ("Soạn bài – Lesson 360° Studio", STUDIO, True, "js/pages/studio.js", ""),
    "giaovien.html": ("Dạy học – Lesson 360°", ["js/core/nhanxet.js", "js/core/lophoc.js"], True, "js/pages/host.js", ""),
    "manchieu.html": ("Màn chiếu – Lesson 360°", [], True, "js/pages/screen.js", "screen"),
    "hocsinh.html": ("Vào lớp – Lesson 360°", ["js/core/lock.js"], True, "js/pages/student.js", ""),
    "insight.html": ("Dữ liệu 360 – Lesson 360°", ["js/core/architect.js"], True, "js/pages/insight.js", ""),
    "ppct.html": ("Phụ lục 1 – Kế hoạch dạy học môn – Lesson 360°", [], False, "js/pages/ppct.js", ""),
    "taikhoan.html": ("Tài khoản & quản trị – Lesson 360°", [], False, "js/pages/account.js", ""),
    "giaoan.html": ("Soạn giáo án (Phụ lục 4) – Lesson 360°", STUDIO, False, "js/pages/giaoan.js", ""),
    "baogiang.html": ("Báo giảng CSDL – Lesson 360°", ["js/core/baogiang.js"], False, "js/pages/baogiang.js", ""),
    "tiendo.html": ("Tiến độ của tổ – Lesson 360°", [], False, "js/pages/tiendo.js", ""),
    "lophoc.html": ("Danh sách lớp – Lesson 360°", ["js/core/lophoc.js"], False, "js/pages/lophoc.js", ""),
    "tronde.html": ("Trộn đề kiểm tra – Lesson 360°", ["js/core/tronde.js"], False, "js/pages/tronde.js", ""),
}
# ?v=<mã nội dung>: trình duyệt luôn tải bản mới sau mỗi lần cập nhật, không trộn mã cũ – mới.
def V(path):
    try:
        return path + "?v=" + hashlib.md5(open(os.path.join(root, path), "rb").read()).hexdigest()[:8]
    except OSError:
        return path
for name, (title, extra, packs, page, kind) in PAGES.items():
    scripts = CORE + (PACKS if packs else []) + extra + [page]
    css = f'<link rel="stylesheet" href="{V("assets/css/l360.css")}">' + (f'\n<link rel="stylesheet" href="{V("assets/css/screen.css")}">' if kind == "screen" else "")
    body = '<div class="stage" id="stage"></div>' if kind == "screen" else '<div id="app"></div>'
    html = f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="Lesson 360° Studio – Xưởng AI kiến tạo bài học số từ giáo án. Trường TH, THCS & THPT FPT Bắc Giang.">
<meta name="theme-color" content="#0F2742">
<link rel="icon" href="assets/img/logo-l360.svg" type="image/svg+xml">
<link rel="icon" href="assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preload" href="assets/fonts/be-vietnam-pro-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/be-vietnam-pro-700-normal.woff2" as="font" type="font/woff2" crossorigin>
{css}
</head>
<body>
{body}
<div id="toast"></div>
''' + "\n".join(f'<script src="{V(s)}"></script>' for s in scripts) + "\n</body>\n</html>\n"
    open(os.path.join(root, name), "w", encoding="utf-8").write(html)
print("Đã sinh", len(PAGES), "trang;", len(PACKS), "bài mẫu")
