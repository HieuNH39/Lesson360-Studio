"""Sinh dữ liệu Syllabus (báo giảng CSDL) cho Lesson 360° Studio từ các tệp Syllabus_CSDL_K*.xlsx và Syllabus_HDTNHN_K*.xlsx."""
import openpyxl, glob, json, re, os, sys
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
def s(v):
    if v is None: return ""
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return str(v).strip()
styles = {}
for f in glob.glob(os.path.join(src, "*HDTNHN*.xlsx")):
    k = int(re.search(r"K(\d+)", f).group(1))
    ws = openpyxl.load_workbook(f, read_only=True).worksheets[0]
    st = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or r[5] is None: continue
        st[s(r[5])] = s(r[6])
    styles[k] = st
index = []
for f in sorted(glob.glob(os.path.join(src, "*CSDL*.xlsx"))):
    wb = openpyxl.load_workbook(f, read_only=True)
    ws = wb["Sheet1"]
    byk = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not r[2] or r[3] is None: continue
        m = re.search(r"(\d+)", s(r[1]))
        if not m: continue
        k = int(m.group(1))
        mon = s(r[2])
        tiet = s(r[3]); ten = s(r[4]); tt = int(float(s(r[5]) or 0)); hk = s(r[6])
        row = [tiet, ten, tt, int(hk) if hk.isdigit() else hk]
        if mon == "HĐTN" and styles.get(k, {}).get(tiet): row.append(styles[k][tiet])
        byk.setdefault(k, {}).setdefault(mon, []).append(row)
    for k, mons in byk.items():
        for mon in mons: mons[mon].sort(key=lambda x: x[2])
        doc = {"v": 1, "khoi": k, "nguon": os.path.basename(f).split("-", 1)[-1], "mon": mons}
        json.dump(doc, open(os.path.join(out, f"K{k}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        index.append({"khoi": k, "mon": sorted(mons.keys()), "rows": sum(len(v) for v in mons.values())})
index.sort(key=lambda x: x["khoi"])
json.dump({"v": 1, "khoi": index}, open(os.path.join(out, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
for i in index: print(i["khoi"], i["rows"], len(i["mon"]))
