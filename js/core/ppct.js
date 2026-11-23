/* Phân phối chương trình (PPCT) theo năm học – đọc Phụ lục I (kế hoạch dạy học của tổ) từ Word/Excel/bảng dán,
   chuẩn hoá thành: môn → lớp → bài → tiết (số tiết PPCT, tuần, nội dung tiết, thiết bị, mã năng lực số),
   khớp với bài trong SGK, lưu theo năm học (mỗi năm một bộ), làm "xương sống" cho Studio, giáo án và màn mở tiết. */
(function () {
  const L360 = window.L360;
  const u = L360.u;

  /* ---------- Tiện ích chữ ---------- */
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const first = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean)[0] || "";
  const flat = (s) => String(s || "").replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
  const slug = (s) => norm(s).replace(/\s+/g, "-").slice(0, 48) || "x";
  const STOP = new Set("va cua cac mot so trong voi the nhung ve tu den cho la co duoc tai thoi ky ki bai chu de".split(" "));
  const words = (s) => norm(s).split(" ").filter((w) => w && !STOP.has(w));
  function sim(a, b) {
    const A = words(a), B = words(b);
    if (!A.length || !B.length) return 0;
    const SB = new Set(B);
    const hit = A.filter((w) => SB.has(w)).length;
    return (2 * hit) / (A.length + B.length);
  }

  function yearNow(d) {
    d = d || new Date();
    const y = d.getFullYear();
    return d.getMonth() + 1 >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }
  const yearLabel = (nam) => String(nam || "").replace("-", "–");

  /* ---------- Môn, lớp, năm học từ tiêu đề / tên tệp ---------- */
  const SUBJ = [
    [/phan mon lich su/, "lich-su"],
    [/phan mon dia li/, "dia-li"],
    [/dia phuong/, "gddp"],
    [/kinh te va phap luat|gd ?ktpl/, "gdktpl"],
    [/cong dan|gdcd/, "gdcd"],
    [/ngu van/, "ngu-van"],
    [/lich su/, "lich-su"],
    [/dia li/, "dia-li"]
  ];
  const FILE_SUBJ = [
    [/LISU|LICHSU|LICH_SU/i, "lich-su"],
    [/DILI|DIALI|DIA_LI/i, "dia-li"],
    [/NVAN|NGUVAN/i, "ngu-van"],
    [/GDKTPL|KTPL/i, "gdktpl"],
    [/GDCD/i, "gdcd"],
    [/NDGD|GD_?P|GDDP/i, "gddp"]
  ];
  function detectMeta(paras, fileName) {
    const text = (paras || []).slice(0, 30).join("\n");
    const title = (paras || []).find((p) => /KẾ HOẠCH DẠY HỌC|KẾ HOẠCH GIÁO DỤC|PHÂN PHỐI CHƯƠNG TRÌNH/i.test(p)) || "";
    const t = norm(title.split("\n")[0]);
    let mon = "";
    for (const [re, id] of SUBJ) if (re.test(t)) { mon = id; break; }
    if (!mon) for (const [re, id] of FILE_SUBJ) if (re.test(fileName || "")) { mon = id; break; }
    let lop = Number((title.match(/LỚP\s*(\d{1,2})/i) || [])[1] || 0);
    if (!lop) lop = Number((String(fileName || "").replace(/20\d\d/g, "").match(/(\d{1,2})(?!.*\d)/) || [])[1] || 0);
    const ny = text.match(/Năm học\s*(\d{4})\s*[-–]\s*(\d{4})/i);
    const nam = ny ? `${ny[1]}-${ny[2]}` : yearNow();
    const hk1 = Number((text.match(/hết học kì I dạy hết tiết\s*(\d+)/i) || [])[1] || 0);
    const tuan = Number((text.match(/(\d+)\s*tuần/i) || [])[1] || 35);
    const fl = Number((String(fileName || "").replace(/20\d\d/g, "").match(/(\d{1,2})(?!.*\d)/) || [])[1] || 0);
    return { mon, lop: lop >= 1 && lop <= 12 ? lop : 0, lopAlt: fl && fl !== lop && fl >= 6 && fl <= 12 ? fl : 0, nam, hk1Den: hk1 || 0, soTuan: tuan, tieuDe: flat(title.split("\n")[0]) };
  }

  /* ---------- Cột của bảng ---------- */
  const COLS = [
    ["ten", /^tên tiết|^tên bài|tên tiết dạy|^tên tiết\/ ?bài/],
    ["tiet", /tiết dạy theo|^tiết thứ|^mã tiết|^tiết ppct|^tiết theo ppct/],
    ["chuDe", /^(bài học|chủ đề|tên chuyên đề|bài kiểm tra|tên bài học|chuyên đề)/],
    ["soTiet", /^số tiết/],
    ["tuan", /thời điểm|^tuần/],
    ["noiDung", /nội dung|yêu cầu cần đạt/],
    ["thietBi", /thiết bị/],
    ["ai", /năng lực ai|trí tuệ nhân tạo/],
    ["nls", /năng lực số/],
    ["ghiChu", /ghi chú/],
    ["thoiGian", /^thời gian/],
    ["hinhThuc", /hình thức/]
  ];
  function colMap(row) {
    const m = {};
    row.forEach((c, i) => {
      const h = flat(c).toLowerCase();
      if (!h) return;
      for (const [f, re] of COLS) {
        if (re.test(h)) {
          if (m[f] == null) m[f] = i;
          break;
        }
      }
    });
    return m;
  }
  const isHeader = (m) => m.chuDe != null && (m.tiet != null || m.soTiet != null || m.tuan != null || m.thoiGian != null);

  function nums(s) {
    s = String(s || "");
    if (!/\d/.test(s)) return [];
    if (/[,;]/.test(s)) s = s.replace(/(\d) (?=\d)/g, "$1"); // "2 7" do PDF ngắt dòng → 27
    const r = s.match(/^\D*?(\d+)\s*[-–]\s*(\d+)\D*$/);
    if (r) {
      const a = +r[1], b = +r[2];
      if (b > a && b - a < 60) return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    }
    return (s.match(/\d+/g) || []).map(Number);
  }
  function nlsCodes(s) {
    const out = [];
    String(s || "").replace(/(\d)\s*\.\s*(\d)\s*\.?\s*(CB|TC|NC)\s*(\d)\s*([a-d]?)/gi, (_, a, b, l, n, x) => {
      const c = `${a}.${b}.${l.toUpperCase()}${n}${x.toLowerCase()}`;
      if (!out.includes(c)) out.push(c);
    });
    return out;
  }
  function aiCodes(s) {
    const out = [];
    String(s || "").replace(/\bNL\s*([a-d])\b/gi, (_, x) => {
      const c = "NL" + x.toLowerCase();
      if (!out.includes(c)) out.push(c);
    });
    return out;
  }
  const KT_RE = /kiểm tra|đánh giá (giữa|cuối)|KTGHK|KTCHK|KTCK|trả bài|\bKT\s*(giữa|cuối|GHK|CHK)/i;
  const ON_RE = /^ôn tập/i;
  const GENERIC = /^(thực hành|ôn tập|luyện tập|dự án|trải nghiệm|tham quan|ngoại khoá|ngoại khóa)\s*[.:]?\s*$/i;
  const SUFFIX = [
    /\(\s*(tiếp|tiếp theo|t\s*\d+|tiết\s*\d+[^)]*)\s*\)\s*$/i,
    /\s*[-–:,]\s*tiết\s*\d+.*$/i,
    /\s+tiết\s*\d+\s*$/i,
    /\s*\(\s*tiếp\s*\)/i
  ];
  function baseName(s) {
    let t = flat(s).replace(/\s*\((?:T|Tiết)\s*\d+\)\s*(\([^)]*\)?)?/i, "");
    for (let k = 0; k < 3; k++) SUFFIX.forEach((re) => (t = t.replace(re, "").trim()));
    return t.replace(/[.:;,]+$/, "").trim();
  }
  const looksLikeBai = (s) => /^(bài|bai)\s*\d+|^bài mở đầu|^chuyên đề\s*\d|^chủ đề\s*\d/i.test(flat(s));

  // Chia "Nội dung chủ yếu" theo các mốc "Tiết 1. … Tiết 2. …".
  function splitByTiet(text, ppctNums) {
    const n = ppctNums.length;
    const res = Array(n).fill("");
    const lines = String(text || "").split("\n");
    const parts = [];
    let pre = [];
    let cur = null;
    lines.forEach((l) => {
      const m = l.match(/^\s*[-•*]?\s*tiết\s*(\d+(?:\s*[,–-]\s*\d+)*)\s*[.:)]?\s*(.*)$/i);
      if (m) {
        cur = { idx: nums(m[1]), lines: m[2] ? [m[2]] : [] };
        parts.push(cur);
      } else if (cur) cur.lines.push(l);
      else pre.push(l);
    });
    if (!parts.length) return { list: Array(n).fill(flat(text)), shared: n > 1 };
    parts.forEach((p) => {
      const body = flat(p.lines.join("\n"));
      p.idx.forEach((k) => {
        let pos = k - 1;
        if (pos >= n || pos < 0) pos = ppctNums.indexOf(k);
        if (pos >= 0 && pos < n) res[pos] = res[pos] ? res[pos] + " " + body : body;
      });
    });
    const head = flat(pre.join("\n"));
    if (head) for (let i = 0; i < n; i++) res[i] = res[i] ? res[i] : head;
    return { list: res, shared: false };
  }

  /* ---------- Đọc bảng → mô hình PPCT ---------- */
  function cellOf(row, m, f) {
    return m[f] != null ? String(row[m[f]] || "").trim() : "";
  }
  function parse(src) {
    const paras = src.paras || [];
    const meta = Object.assign(detectMeta(paras, src.file), src.meta || {});
    const warn = [];
    const core = [];
    const cd = [];
    const kt = [];
    let section2 = false;
    (src.tables || []).forEach((tb) => {
      const ctx = (tb.ctx || []).join(" ");
      if (/lồng ghép/i.test(ctx)) section2 = true;
      if (section2) return;
      const rows = tb.rows || [];
      let hi = -1, m = null;
      for (let i = 0; i < Math.min(rows.length, 12); i++) {
        const mm = colMap(rows[i]);
        if (isHeader(mm)) { hi = i; m = mm; break; }
      }
      if (hi < 0) return;
      const head = rows[hi].map((c) => flat(c).toLowerCase());
      const hNoi = m.noiDung != null ? head[m.noiDung] : "";
      const hTiet = m.tiet != null ? head[m.tiet] : "";
      const hChu = head[m.chuDe] || "";
      let kind = "core";
      if (m.ten == null && (/ôn tập/.test(hNoi) || /^tiết thứ|^mã tiết/.test(hTiet) || /kiểm tra/.test(hChu) || m.thoiGian != null)) kind = "kt";
      else if (/chuyên đề/.test(hChu) || /chuyên đề học tập\s*-\s*áp dụng|^1\.2\./i.test(ctx)) kind = "cd";
      const sig = rows[hi].map(flat).join("|");
      rows.slice(hi + 1).forEach((r) => {
        const cells = r.map((c) => String(c || "").trim());
        if (cells.map(flat).join("|") === sig) return;
        const ne = cells.filter(Boolean);
        if (!ne.length) return;
        if (ne.length > 2 && ne.every((c) => c === ne[0])) return; // dòng "HỌC KÌ I" trải ngang
        const rec = {};
        COLS.forEach(([f]) => (rec[f] = cellOf(cells, m, f)));
        if (kind === "kt") kt.push(rec);
        else (kind === "cd" ? cd : core).push(rec);
      });
    });
    const docs = [];
    const coreDoc = build(core, meta, false, warn);
    if (coreDoc) docs.push(coreDoc);
    const cdDoc = build(cd, meta, true, warn);
    if (cdDoc) docs.push(cdDoc);
    const ktList = kt
      .map((r) => {
        const ten = first(r.chuDe) || first(r.ten);
        const tuan = nums(r.tuan)[0] || 0;
        if (!ten || (!tuan && !r.noiDung && !r.soTiet) || /^ôn tập\s*\.{2,}|^\.{2,}/i.test(ten)) return null;
        return { ten: flat(ten), ma: /[A-Z]{3,}/.test(r.tiet) ? flat(r.tiet) : "", tuan, soTiet: nums(r.soTiet)[0] || 1, noiDung: flat(r.noiDung).slice(0, 400), hinhThuc: flat(r.hinhThuc), thoiGian: flat(r.thoiGian) };
      })
      .filter(Boolean);
    if (coreDoc) {
      const seen = new Set(coreDoc.kt.map((k) => norm(k.ten) + k.tuan));
      ktList.forEach((k) => {
        const id = norm(k.ten) + k.tuan;
        const same = coreDoc.kt.find((x) => norm(x.ten) === norm(k.ten) && (!x.tuan || x.tuan === k.tuan));
        if (same) Object.assign(same, { ma: same.ma || k.ma, tuan: same.tuan || k.tuan, noiDung: same.noiDung || k.noiDung, hinhThuc: k.hinhThuc, soTiet: k.soTiet });
        else if (!seen.has(id)) coreDoc.kt.push(k), seen.add(id);
      });
      coreDoc.kt.sort((a, b) => (a.tuan || 99) - (b.tuan || 99));
    }
    if (!docs.length) warn.push("Không tìm thấy bảng phân phối chương trình (cần cột “Bài học/chủ đề” và “Tiết dạy theo PPCT”).");
    if (!meta.mon) warn.push("Chưa nhận ra môn học – hãy chọn môn.");
    if (!meta.lop) warn.push("Chưa nhận ra lớp – hãy chọn lớp.");
    return { meta, docs, warn };
  }

  function build(rows, meta, isCd, warn) {
    if (!rows.length) return null;
    const bai = [];
    const kt = [];
    let chuDe = "";
    let last = 0;
    let guessed = 0;
    const isNV = meta.mon === "ngu-van";
    rows.forEach((r) => {
      const cd = flat(r.chuDe);
      const cdIsKt = KT_RE.test(cd) || ON_RE.test(cd);
      if (cd && !cdIsKt) chuDe = cd.replace(/\s*\(\s*\d+\s*tiết\s*\)\s*$/i, "");
      const tenFull = flat(r.ten);
      const tenAll = tenFull || cd;
      const raw = String(r.tiet || "");
      let so = nums(raw);
      if (/[A-Z]{3,}/.test(raw) && !/^\s*\d/.test(raw)) so = [];
      if (/tuần/i.test(raw)) so = [];
      const ktLike = KT_RE.test(tenAll) || ON_RE.test(tenAll) || (!tenFull && cdIsKt);
      if ((ktLike && !so.length) || KT_RE.test(tenAll.slice(0, 40)) || /^(KT|OT|TB)/.test(raw.trim())) {
        const ten = tenAll.replace(/\s*\/\s*/g, " ");
        if (!kt.some((k) => k.ten === ten && k.tuan === (nums(r.tuan)[0] || 0)))
          kt.push({ ten, ma: /[A-Z]{3,}/.test(raw) ? flat(raw) : "", tuan: nums(r.tuan)[0] || 0, soTiet: 1, noiDung: flat(r.noiDung).slice(0, 300), on: ON_RE.test(tenAll) && !KT_RE.test(tenAll) });
        return;
      }
      if (!tenAll) return;
      // Dòng bị ngắt sang trang (PDF): không số tiết, không tuần → nối vào dòng trước.
      const pb0 = bai[bai.length - 1];
      if (pb0 && !so.length && !nums(r.tuan).length && !r.soTiet) {
        const lt = pb0.tiet[pb0.tiet.length - 1];
        if (tenFull && /^[a-zà-ỹđ(]/.test(tenFull) && !/[.!?]$/.test(pb0.ten)) pb0.ten = `${pb0.ten} ${tenFull}`;
        const extra = flat(r.noiDung);
        if (extra && lt) lt.noiDung = (lt.noiDung + " " + extra).trim();
        return;
      }
      // Dòng nối tiếp của cùng một tiết (cùng số tiết, tên trống hoặc trùng): ghép nội dung.
      const pb = bai[bai.length - 1];
      if (pb && so.length && so.every((n) => pb.tiet.some((t) => t.so === n)) && (!tenFull || baseName(tenFull) === pb.ten || norm(tenFull) === norm(pb.tiet[0].ten || ""))) {
        const extra = flat(r.noiDung);
        so.forEach((n) => {
          const t = pb.tiet.find((x) => x.so === n);
          if (extra && t && !t.noiDung.includes(extra)) t.noiDung = (t.noiDung + " " + extra).trim();
        });
        return;
      }
      if (!so.length) {
        if (!r.noiDung && !r.thietBi && !tenFull) return; // dòng mẫu trống
        so = [last + 1];
        guessed++;
      }
      last = Math.max(last, so[so.length - 1]);
      // Gom theo tên bài (nếu là "Bài N…") hoặc theo cột Bài học/chủ đề (Ngữ văn, chủ đề GDĐP…).
      let groupBy;
      const shortCd = chuDe.replace(/^(chủ đề|phần|chương)\s*[\dIVX]*\s*[.:\-–]?\s*/i, "");
      if (isCd) groupBy = chuDe || tenFull;
      else if (isNV && chuDe) groupBy = chuDe;
      else if (GENERIC.test(tenFull)) groupBy = `${tenFull.replace(/[.:]\s*$/, "")}: ${shortCd || chuDe}`;
      else if (looksLikeBai(tenFull) && !/^chủ đề\s*\d/i.test(tenFull)) groupBy = baseName(tenFull);
      else if (/^bài\s*\d+/i.test(chuDe)) groupBy = chuDe;
      else groupBy = baseName(tenFull) || chuDe;
      const key = norm(groupBy);
      const tuanN = nums(r.tuan);
      const split = splitByTiet(r.noiDung, so);
      const nls = nlsCodes(r.nls);
      const ai = aiCodes(r.ai || r.nls);
      const items = so.map((n, i) => ({
        so: n,
        tuan: tuanN.length === so.length ? tuanN[i] : tuanN[Math.min(i, tuanN.length - 1)] || 0,
        ten: groupBy === baseName(tenFull) ? "" : tenFull,
        noiDung: split.list[i] || "",
        thietBi: flat(r.thietBi).slice(0, 400),
        nls,
        ai,
        ghiChu: flat(r.ghiChu).slice(0, 300)
      }));
      const prev = bai[bai.length - 1];
      const match = prev && prev._k === key ? prev : bai.find((b) => b._k === key && b === bai[bai.length - 1]);
      if (match) match.tiet.push(...items);
      else
        bai.push({
          _k: key,
          id: "",
          ten: groupBy,
          chuong: isCd ? "" : chuDe && chuDe !== groupBy ? chuDe : "",
          key: null,
          on: ON_RE.test(groupBy),
          tiet: items
        });
    });
    // Bài bị ngắt bởi tiết kiểm tra rồi dạy tiếp (vd Bài 4: tiết 7, 8 – KT giữa kì – tiết 9): gộp lại.
    const merged = [];
    bai.forEach((b) => {
      const p = merged[merged.length - 1];
      if (p && p._k === b._k) p.tiet.push(...b.tiet);
      else merged.push(b);
    });
    const ids = {};
    merged.forEach((b) => {
      let id = slug(b.ten);
      if (ids[id]) id += "-" + ++ids[id];
      else ids[id] = 1;
      b.id = id;
      b.tiet.sort((a, c) => a.so - c.so);
      delete b._k;
    });
    if (guessed) warn.push(`${guessed} dòng không ghi số tiết – đã đánh số nối tiếp, cần kiểm tra.`);
    const all = merged.flatMap((b) => b.tiet.map((t) => t.so));
    const dup = all.filter((x, i) => all.indexOf(x) !== i);
    if (dup.length) warn.push(`Số tiết bị trùng: ${[...new Set(dup)].slice(0, 8).join(", ")}.`);
    const mon = meta.mon || "";
    const lop = meta.lop || 0;
    return {
      v: 1,
      id: docId(mon, lop, isCd),
      nam: meta.nam,
      mon,
      lop,
      cd: isCd,
      tieuDe: meta.tieuDe || "",
      hk1Den: isCd ? 0 : meta.hk1Den || 0,
      soTuan: meta.soTuan || 35,
      tongTiet: all.length ? Math.max(...all) : 0,
      lopAlt: meta.lopAlt || 0,
      bai: merged,
      kt: isCd ? [] : kt
    };
  }
  const docId = (mon, lop, cd) => `${cd ? "cd-" : ""}${mon || "mon"}-${lop || 0}`;

  /* ---------- Khớp với bài trong SGK ---------- */
  // Tiết thực hành, ôn tập, dự án… của tổ: không cần gắn với một bài SGK.
  const isExtra = (b) => !!b.on || /^(thực hành|ôn tập|luyện tập|dự án|trải nghiệm|tham quan|ngoại kho)[^:]*:/i.test(b.ten || "");
  function sgkLessons(doc) {
    const C = L360.Curr;
    if (!C || !doc.mon || !doc.lop) return [];
    return C.lessons(doc.mon, doc.lop)
      .filter((x) => !!x.book.cd === !!doc.cd)
      .flatMap((x) => x.lessons.map((l) => Object.assign({ bookTitle: x.book.title }, l)));
  }
  function match(doc) {
    if (doc.lopAlt) {
      const alt = Object.assign({}, doc, { lop: doc.lopAlt, lopAlt: 0, bai: JSON.parse(JSON.stringify(doc.bai)) });
      const a = matchOne(alt), b = matchOne(doc);
      if (a.khop.co > b.khop.co) {
        Object.assign(doc, alt, { id: docId(doc.mon, doc.lopAlt, doc.cd), canhBao: `Tiêu đề tệp ghi lớp ${b.lop} nhưng nội dung khớp SGK lớp ${alt.lop} – đã chọn lớp ${alt.lop}.` });
      }
      delete doc.lopAlt;
      return doc;
    }
    return matchOne(doc);
  }
  function matchOne(doc) {
    const L = sgkLessons(doc);
    let hit = 0;
    (doc.bai || []).forEach((b) => {
      if (isExtra(b)) return (b.key = b.keyFixed ? b.key : null);
      if (b.keyFixed) return b.key && hit++;
      const nb = (b.ten.match(/^(?:bài|chuyên đề)\s*(\d+(?:\.\d+)?)/i) || [])[1];
      const nm = b.ten.replace(/^(?:bài|chuyên đề|chủ đề)\s*[\d.]+\s*[.:\-–]?\s*/i, "");
      let best = null, bs = 0;
      L.forEach((l) => {
        let s = Math.max(sim(nm, l.ten), sim(b.ten, l.label) * 0.95);
        const so = String(l.so).replace(/^(ls|dl)-/, "").replace(/^CĐ\s*/, "");
        if (nb && so === nb && s >= 0.25) s += 0.35;
        const bt = norm(l.bookTitle);
        if (/bac ninh/.test(norm(b.ten)) && /bac ninh/.test(bt)) s += 0.08;
        if (/bac giang/.test(norm(b.ten)) && /bac giang/.test(bt)) s += 0.08;
        if (s > bs) (bs = s), (best = l);
      });
      b.key = best && bs >= 0.5 ? best.key : null;
      if (b.key) hit++;
    });
    doc.khop = { co: hit, tong: (doc.bai || []).filter((b) => !isExtra(b)).length };
    return doc;
  }

  /* ---------- Đọc tệp: Word (.docx), Excel (.xlsx/.xls), bảng dán ---------- */
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  function wText(node) {
    let s = "";
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType !== 1) continue;
        const ln = c.localName;
        if (ln === "t") s += c.textContent;
        else if (ln === "tab") s += " ";
        else if (ln === "br" || ln === "cr") s += "\n";
        else if (ln === "p") {
          walk(c);
          s += "\n";
        } else if (ln !== "tbl" && ln !== "rPr" && ln !== "pPr") walk(c);
      }
    };
    if (node.localName === "p") {
      walk(node);
    } else walk(node);
    return s.replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n+/g, "\n").trim();
  }
  async function readDocx(file) {
    await u.loadScript("js/vendor/jszip.min.js");
    const zip = await window.JSZip.loadAsync(file);
    const f = zip.file("word/document.xml");
    if (!f) throw new Error("Tệp Word không hợp lệ.");
    const dom = new DOMParser().parseFromString(await f.async("string"), "application/xml");
    const body = dom.getElementsByTagNameNS(W, "body")[0];
    const paras = [];
    const tables = [];
    let ctx = [];
    const visit = (parent) => {
      for (const el of parent.childNodes) {
        if (el.nodeType !== 1) continue;
        if (el.localName === "sdt") {
          const c = el.getElementsByTagNameNS(W, "sdtContent")[0];
          if (c) visit(c);
        } else if (el.localName === "p") {
          const t = wText(el).replace(/\n/g, " ").trim();
          if (t) paras.push(t), ctx.push(t);
        } else if (el.localName === "tbl") {
          tables.push({ ctx: ctx.slice(-4), rows: readTbl(el) });
          ctx = [];
        }
      }
    };
    visit(body);
    return { file: file.name, paras, tables };
  }
  function readTbl(tbl) {
    const rows = [];
    const above = [];
    const trs = [...tbl.childNodes].filter((n) => n.nodeType === 1 && n.localName === "tr");
    trs.forEach((tr) => {
      const row = [];
      let col = 0;
      const tcs = [];
      [...tr.childNodes].forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.localName === "tc") tcs.push(n);
        else if (n.localName === "sdt") tcs.push(...n.getElementsByTagNameNS(W, "tc"));
      });
      tcs.forEach((tc) => {
        const pr = tc.getElementsByTagNameNS(W, "tcPr")[0];
        const gs = pr && pr.getElementsByTagNameNS(W, "gridSpan")[0];
        const span = gs ? Number(gs.getAttributeNS(W, "val") || gs.getAttribute("w:val") || 1) : 1;
        const vm = pr && pr.getElementsByTagNameNS(W, "vMerge")[0];
        const vmv = vm ? vm.getAttributeNS(W, "val") || vm.getAttribute("w:val") || "" : null;
        let text;
        if (vm && vmv !== "restart") text = above[col] || "";
        else {
          const ps = [...tc.childNodes].filter((n) => n.nodeType === 1 && (n.localName === "p" || n.localName === "sdt"));
          text = ps.map((p) => wText(p)).filter(Boolean).join("\n");
        }
        for (let k = 0; k < span; k++) {
          row.push(text);
          above[col + k] = text;
        }
        col += span;
      });
      rows.push(row);
    });
    return rows;
  }
  async function readXlsx(file) {
    await u.loadScript("js/vendor/xlsx.full.min.js");
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
    const paras = [];
    const tables = [];
    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      (ws["!merges"] || []).forEach((mg) => {
        const v = ws[window.XLSX.utils.encode_cell(mg.s)];
        for (let r = mg.s.r; r <= mg.e.r; r++)
          for (let c = mg.s.c; c <= mg.e.c; c++) {
            const a = window.XLSX.utils.encode_cell({ r, c });
            if (!ws[a] && v) ws[a] = { t: "s", v: v.v, w: v.w };
          }
      });
      const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }).map((r) => r.map((c) => String(c || "").trim()));
      let hi = rows.findIndex((r) => isHeader(colMap(r)));
      if (hi < 0) return;
      rows.slice(0, hi).forEach((r) => {
        const t = r.filter(Boolean).join(" ").trim();
        if (t) paras.push(t);
      });
      tables.push({ ctx: [name], rows: rows.slice(hi) });
    });
    return { file: file.name, paras, tables };
  }
  function readPaste(html, text) {
    const paras = [];
    const tables = [];
    if (html && /<table/i.test(html)) {
      const dom = new DOMParser().parseFromString(html, "text/html");
      [...dom.body.childNodes].forEach((n) => {
        if (n.nodeType === 1 && n.tagName !== "TABLE" && !n.querySelector("table")) {
          const t = n.textContent.replace(/\s+/g, " ").trim();
          if (t) paras.push(t);
        }
      });
      dom.querySelectorAll("table").forEach((tb) => {
        const grid = [];
        [...tb.rows].forEach((tr, ri) => {
          grid[ri] = grid[ri] || [];
          let c = 0;
          [...tr.cells].forEach((td) => {
            while (grid[ri][c] != null) c++;
            const t = td.innerText != null && td.innerText !== "" ? td.innerText : td.textContent;
            const val = String(t || "").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").trim();
            const cs = td.colSpan || 1, rs = td.rowSpan || 1;
            for (let a = 0; a < rs; a++) {
              grid[ri + a] = grid[ri + a] || [];
              for (let b = 0; b < cs; b++) grid[ri + a][c + b] = val;
            }
            c += cs;
          });
        });
        tables.push({ ctx: paras.slice(-3), rows: grid.map((r) => [...r].map((x) => x || "")) });
      });
    } else if (text) {
      const rows = text.split(/\r?\n/).map((l) => l.split("\t"));
      tables.push({ ctx: [], rows });
    }
    return { file: "Bảng dán", paras, tables };
  }
  async function readFile(file) {
    const n = (file.name || "").toLowerCase();
    if (n.endsWith(".docx")) return readDocx(file);
    if (/\.(xlsx|xlsm|xls|csv)$/.test(n)) return readXlsx(file);
    if (n.endsWith(".pdf")) throw new Error("Chưa đọc trực tiếp được PDF. Mở tệp PDF bằng Word (Word tự chuyển thành .docx) rồi tải lên, hoặc copy bảng trong PDF và dán vào ô “Dán bảng”.");
    if (n.endsWith(".doc")) throw new Error("Tệp .doc đời cũ: mở bằng Word, chọn Lưu thành .docx rồi tải lên.");
    throw new Error("Chỉ nhận tệp Word (.docx) hoặc Excel (.xlsx, .xls).");
  }

  /* ---------- Lưu trữ theo năm học ---------- */
  // Firebase: l360/ppct/{nam}/index/{id} (tóm tắt), l360/ppct/{nam}/docs/{id} (đầy đủ).
  // Bộ nạp sẵn (tệp tĩnh): data/ppct/{nam}/index.json + {id}.json – dùng khi trên máy chủ chưa có.
  const cache = {};
  const S = () => L360.store;
  const online = () => !!(L360.store && !L360.isLocal);
  async function staticIndex(nam) {
    const k = "si:" + nam;
    if (cache[k] !== undefined) return cache[k];
    try {
      const r = await fetch(`data/ppct/${nam}/index.json`, { cache: "no-cache" });
      cache[k] = r.ok ? await r.json() : null;
    } catch (e) {
      cache[k] = null;
    }
    return cache[k];
  }
  async function staticYears() {
    if (cache.sy !== undefined) return cache.sy;
    try {
      const r = await fetch("data/ppct/years.json", { cache: "no-cache" });
      cache.sy = r.ok ? await r.json() : [];
    } catch (e) {
      cache.sy = [];
    }
    return cache.sy;
  }
  const arr = (x) => (Array.isArray(x) ? x : x && typeof x === "object" ? Object.keys(x).sort((a, b) => a - b).map((k) => x[k]) : []);
  function fixDoc(d) {
    if (!d) return null;
    d.bai = arr(d.bai).map((b) => Object.assign(b, { tiet: arr(b.tiet).map((t) => Object.assign(t, { nls: arr(t.nls), ai: arr(t.ai) })) }));
    d.kt = arr(d.kt);
    return d;
  }
  const summary = (d) => ({
    id: d.id,
    mon: d.mon,
    lop: d.lop,
    cd: !!d.cd,
    tongTiet: d.tongTiet || 0,
    soBai: (d.bai || []).length,
    khop: d.khop || null,
    tieuDe: d.tieuDe || "",
    nguon: d.nguon || null
  });

  const Ppct = {
    norm,
    sim,
    yearNow,
    yearLabel,
    parse,
    match,
    isExtra,
    readFile,
    readPaste,
    docId,
    summary,
    async years() {
      const set = new Set([...(await staticYears()), yearNow()]);
      try {
        const y = S() && (await S().get("ppct/_years"));
        if (y) Object.keys(y).forEach((k) => set.add(k));
      } catch (e) {}
      return [...set].sort().reverse();
    },
    async list(nam) {
      nam = nam || yearNow();
      const out = {};
      const si = await staticIndex(nam);
      (si || []).forEach((x) => (out[x.id] = Object.assign({ nguon: { kieu: "nap-san" } }, x)));
      try {
        const fb = S() && (await S().get(`ppct/${nam}/index`));
        if (fb) Object.keys(fb).forEach((id) => (fb[id] && fb[id].xoa ? delete out[id] : (out[id] = fb[id])));
      } catch (e) {}
      return Object.values(out).sort((a, b) => a.lop - b.lop || String(a.mon).localeCompare(b.mon) || (a.cd ? 1 : 0) - (b.cd ? 1 : 0));
    },
    async get(id, nam) {
      nam = nam || (await Ppct.activeYear());
      const k = `d:${nam}:${id}`;
      if (cache[k] !== undefined) return cache[k];
      let d = null;
      try {
        d = S() && (await S().get(`ppct/${nam}/docs/${id}`));
      } catch (e) {}
      if (!d) {
        const si = await staticIndex(nam);
        if (si && si.some((x) => x.id === id)) {
          try {
            const r = await fetch(`data/ppct/${nam}/${id}.json`, { cache: "no-cache" });
            d = r.ok ? await r.json() : null;
          } catch (e) {}
        }
      }
      return (cache[k] = fixDoc(d));
    },
    // Năm học đang dùng: năm hiện hành nếu đã có PPCT, nếu chưa thì năm gần nhất có dữ liệu.
    async activeYear() {
      if (cache.ay) return cache.ay;
      const ys = await Ppct.years();
      for (const y of [yearNow()].concat(ys)) {
        if ((await Ppct.list(y)).length) return (cache.ay = y);
      }
      return (cache.ay = yearNow());
    },
    async forSubject(mon, lop, opt) {
      opt = opt || {};
      return Ppct.get(docId(mon, lop, !!opt.cd), opt.nam || (await Ppct.activeYear()));
    },
    // Thông tin PPCT gắn vào tiết học (lưu trong gói bài học).
    infoFor(doc, b, thu) {
      const ti = Math.max(0, Math.min(b.tiet.length - 1, (thu || 1) - 1));
      const t = b.tiet[ti];
      // Tiết học kế tiếp (để giao nhiệm vụ chuẩn bị bài): tiết sau của cùng bài, hoặc bài kế tiếp trong Phụ lục 1.
      let sau = null;
      if (ti < b.tiet.length - 1) sau = { cungBai: true, ten: b.ten, noiDung: b.tiet[ti + 1].noiDung || "" };
      else {
        const nb = (doc.bai || [])[(doc.bai || []).indexOf(b) + 1];
        if (nb) sau = { cungBai: false, ten: nb.ten, noiDung: ((nb.tiet || [])[0] || {}).noiDung || "" };
      }
      return {
        sau,
        nam: doc.nam,
        doc: doc.id,
        bai: b.id,
        tong: b.tiet.length,
        cacTiet: b.tiet.map((x) => x.so),
        so: t.so,
        tuan: t.tuan || 0,
        tuanBai: [...new Set(b.tiet.map((x) => x.tuan).filter(Boolean))],
        noiDung: t.noiDung || "",
        khac: b.tiet.map((x, i) => (i === (thu || 1) - 1 ? null : { thu: i + 1, so: x.so, noiDung: x.noiDung })).filter(Boolean)
      };
    },
    // Tìm bài trong PPCT theo khoá bài SGK hoặc khoá PPCT ("ppct:{docId}:{baiId}").
    async forLesson(key, opt) {
      opt = opt || {};
      if (!key) return null;
      let doc = null, bai = null;
      const m = String(key).match(/^ppct:([^:]+):(.+)$/);
      if (m) {
        doc = await Ppct.get(m[1], opt.nam);
        bai = doc && doc.bai.find((b) => b.id === m[2]);
      } else {
        const l = L360.Curr && L360.Curr.lesson(key);
        const mon = opt.mon || (l && l.subject);
        const lop = opt.lop || (l && l.grade);
        if (!mon || !lop) return null;
        const cdBook = l && L360.Curr.books[l.bookId] && L360.Curr.books[l.bookId].cd;
        doc = await Ppct.forSubject(mon, lop, { cd: !!cdBook, nam: opt.nam });
        bai = doc && doc.bai.find((b) => b.key === key);
      }
      return doc && bai ? { doc, bai } : null;
    },
    baiKey: (doc, b) => b.key || `ppct:${doc.id}:${b.id}`,
    async save(doc, by) {
      const d = JSON.parse(JSON.stringify(doc));
      d.nguon = Object.assign({}, d.nguon || {}, { luc: Date.now(), boi: by || "" });
      const nam = d.nam;
      await S().set(`ppct/${nam}/docs/${d.id}`, d);
      await S().set(`ppct/${nam}/index/${d.id}`, summary(d));
      await S().set(`ppct/_years/${nam}`, true);
      cache[`d:${nam}:${d.id}`] = fixDoc(d);
      return d;
    },
    async remove(id, nam) {
      await S().set(`ppct/${nam}/docs/${id}`, null);
      await S().set(`ppct/${nam}/index/${id}`, { id, xoa: true });
      delete cache[`d:${nam}:${id}`];
    },
    // Tạo năm học mới bằng cách chép mọi bảng của năm trước (rồi nạp tệp mới hoặc sửa các dòng thay đổi).
    async copyYear(from, to, by, onProgress) {
      const list = await Ppct.list(from);
      let n = 0;
      for (const x of list) {
        const d = await Ppct.get(x.id, from);
        if (!d) continue;
        const c = JSON.parse(JSON.stringify(d));
        c.nam = to;
        c.nguon = { kieu: "chep-nam", tu: from };
        await Ppct.save(c, by);
        n++;
        onProgress && onProgress(n, list.length);
      }
      return n;
    },
    // Nhãn số tiết PPCT của một bài, vd "3 tiết · tiết 7–9" hoặc "tiết 7, 8, 12".
    tietText(b) {
      const s = (b.tiet || []).map((t) => t.so);
      if (!s.length) return "";
      const run = s.every((x, i) => !i || x === s[i - 1] + 1);
      return `${s.length} tiết · tiết ${run && s.length > 1 ? `${s[0]}–${s[s.length - 1]}` : s.join(", ")}`;
    },
    // Tuần của một bài (để xếp tiết kiểm tra xen giữa).
    tuanOf: (b) => ((b.tiet || []).find((t) => t.tuan) || {}).tuan || 0,
    // Gợi ý chia nội dung bài cho các tiết: KĐ ở tiết đầu, LT + VD ở tiết cuối.
    plan(b) {
      const n = (b.tiet || []).length;
      return (b.tiet || []).map((t, i) => ({
        so: t.so,
        thu: i + 1,
        tong: n,
        tuan: t.tuan,
        ten: t.ten,
        noiDung: t.noiDung,
        thietBi: t.thietBi,
        nls: t.nls,
        ai: t.ai,
        phases: n === 1 ? ["khoi-dong", "hinh-thanh", "luyen-tap", "van-dung"] : i === 0 ? ["khoi-dong", "hinh-thanh"] : i === n - 1 ? ["hinh-thanh", "luyen-tap", "van-dung"] : ["hinh-thanh"]
      }));
    }
  };
  L360.Ppct = Ppct;
})();
