/* Danh sách lớp theo năm học (Khối → Lớp). Chỉ quản trị viên tải lên/sửa; giáo viên đọc khi mở tiết học.
   Dữ liệu: classes/{năm học}/{mã lớp} = { ten, khoi, hs: [họ và tên…], n, at, by }.
   Khi dạy: mã học sinh S01… theo thứ tự danh sách; tên hiển thị = tên (từ cuối của họ tên),
   trùng tên thì thêm A, B, C… theo thứ tự trong danh sách. Phòng học chỉ chứa tên hiển thị, không chứa họ tên đầy đủ. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = () => L360.store;
  const MAX_HS = 60;

  const nfc = (s) => String(s == null ? "" : s).normalize("NFC");
  const plain = (s) =>
    nfc(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, " ")
      .trim();
  const cap = (w) => (w ? w.charAt(0).toLocaleUpperCase("vi") + w.slice(1).toLocaleLowerCase("vi") : "");
  // Họ tên: bỏ khoảng trắng thừa; viết hoa toàn bộ (VD "NGUYỄN VĂN AN") thì đổi về dạng thường.
  const cleanName = (s) => {
    let t = nfc(s).replace(/[ \t]+/g, " ").replace(/\s+/g, " ").trim();
    if (t && t === t.toLocaleUpperCase("vi") && /[A-ZÀ-Ỹ]/.test(t)) t = t.split(" ").map(cap).join(" ");
    return t;
  };
  const given = (full) => cap(cleanName(full).split(" ").slice(-1)[0] || "");
  // Tên hiển thị cho cả lớp: tên; trùng tên thì A, B, C… theo thứ tự xuất hiện.
  function shortNames(list) {
    const base = list.map(given);
    const count = {};
    base.forEach((b) => (count[b.toLocaleLowerCase("vi")] = (count[b.toLocaleLowerCase("vi")] || 0) + 1));
    const seen = {};
    return base.map((b) => {
      const k = b.toLocaleLowerCase("vi");
      if (count[k] < 2) return b.slice(0, 20);
      const i = (seen[k] = (seen[k] || 0) + 1) - 1;
      const suf = i < 26 ? String.fromCharCode(65 + i) : String(i + 1);
      return `${b.slice(0, 17)} ${suf}`;
    });
  }
  const code = (i) => "S" + u.pad(i + 1);

  // Tên lớp chuẩn: "10A1", "6A", "12C2"…
  function className(raw) {
    const t = nfc(raw).replace(/\s+/g, " ").trim();
    const m = t.match(/^(?:l[ớơo]p\s*:?\s*)?(\d{1,2})\s*([A-Za-zĐđ][A-Za-z0-9Đđ]{0,5})(?:\s*[-–(].*)?$/i);
    if (!m) return "";
    return (m[1] + m[2]).toUpperCase().replace(/Đ/g, "Đ");
  }
  const khoiOf = (ten) => {
    const m = String(ten || "").match(/^(\d{1,2})/);
    const k = m ? Number(m[1]) : 0;
    return k >= 1 && k <= 12 ? k : 0;
  };
  const idOf = (ten) => u.slug(ten).replace(/-/g, "") || "lop";

  /* ---------- Đọc danh sách từ bảng (Excel/CSV) hoặc văn bản dán ---------- */
  const looksName = (v) => {
    const t = cleanName(v);
    if (t.length < 4 || t.length > 60 || /\d|@|:/.test(t)) return false;
    const w = t.split(" ");
    if (w.length < 2 || w.length > 7) return false;
    return w.every((x) => /^[A-Za-zÀ-ỹĐđ'.-]+$/.test(x));
  };
  const SKIP = /^(tong|cong|nguoi lap|giao vien chu nhiem|gvcn|hieu truong|danh sach|ghi chu|ngay|xac nhan|ky ten)/;
  function headerOf(rows) {
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const cells = rows[r].map(plain);
      const full = cells.findIndex((c) => /^ho\s*(va\s*)?ten(\s*hoc\s*sinh)?$|^ho va ten hs$|^ten hoc sinh$/.test(c));
      const ho = cells.findIndex((c) => /^ho\s*(va\s*)?(dem|lot)$|^ho$/.test(c));
      const ten = cells.findIndex((c, i) => /^ten$/.test(c) && i !== full);
      const lop = cells.findIndex((c) => /^lop$/.test(c));
      if (full >= 0) return { r, full, lop };
      if (ho >= 0 && ten >= 0) return { r, ho, ten, lop };
    }
    return null;
  }
  // Một hàng không có tiêu đề: ghép "Họ đệm" + "Tên" nếu đứng liền nhau, nếu không lấy ô giống họ tên nhất.
  // Ô một chữ "Nam"/"Nữ" sau một họ tên đủ (≥ 3 chữ) là cột giới tính, không ghép.
  const GENDER = /^(nam|nu|nữ)$/i;
  function nameFromCells(cells) {
    const c = cells.map((x) => cleanName(x));
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i], b = c[i + 1];
      if (!a || !b || !/^[A-Za-zÀ-ỹĐđ]+$/.test(b) || !/^[A-Za-zÀ-ỹĐđ ]+$/.test(a)) continue;
      const wa = a.split(" ").length;
      if (wa > 4) continue;
      if (GENDER.test(b) && wa >= 3) continue;
      if (looksName(a + " " + b)) return a + " " + b;
    }
    const cand = c.filter(looksName).sort((x, y) => y.split(" ").length - x.split(" ").length);
    return cand[0] || "";
  }
  // rows: mảng các hàng (mảng ô). Trả về [{ten, hs:[]}]; tên lớp lấy từ cột "Lớp", tên trang tính, dòng tiêu đề hoặc tên tệp.
  function parseRows(rows, sheetName, fileName) {
    rows = (rows || []).map((r) => (Array.isArray(r) ? r : [r]).map((x) => (x == null ? "" : String(x))));
    const h = headerOf(rows);
    const byClass = {};
    let guess = className(sheetName || "");
    if (!guess)
      for (const r of rows.slice(0, 12)) {
        const m = r.join(" ").match(/l[ớơo]p\s*:?\s*(\d{1,2}\s*[A-Za-zĐđ][A-Za-z0-9]{0,5})\b/i);
        if (m) {
          guess = className(m[1]);
          break;
        }
      }
    if (!guess) guess = className(String(fileName || "").replace(/\.[^.]+$/, "").replace(/^.*?(\d{1,2}\s*[A-Za-z]\w*)$/, "$1"));
    let empty = 0;
    const start = h ? h.r + 1 : 0;
    for (let r = start; r < rows.length; r++) {
      const cells = rows[r];
      const line = plain(cells.join(" "));
      if (!line) {
        if (++empty >= 6 && Object.keys(byClass).length) break;
        continue;
      }
      empty = 0;
      if (SKIP.test(line) || SKIP.test(plain(cells.find((x) => String(x).trim()) || ""))) continue;
      let nm = "";
      if (h && h.full >= 0) nm = cleanName(cells[h.full]);
      else if (h && h.ho >= 0) nm = cleanName(`${cells[h.ho] || ""} ${cells[h.ten] || ""}`);
      else nm = nameFromCells(cells);
      if (!nm || !looksName(nm)) continue;
      const cl = h && h.lop >= 0 ? className(cells[h.lop]) || guess : guess;
      (byClass[cl] = byClass[cl] || []).push(nm);
    }
    return Object.entries(byClass).map(([ten, hs]) => ({ ten, khoi: khoiOf(ten), hs }));
  }
  // Văn bản dán: mỗi dòng một em (có thể kèm STT, cột tách bằng Tab).
  function readPaste(text, ten) {
    const rows = String(text || "")
      .split(/\r?\n/)
      .map((l) => l.split("\t").map((x) => x.replace(/^\s*\d+\s*[.)\-–]?\s*/, "").trim()));
    const out = parseRows(rows, ten || "", "");
    if (out.length) return out;
    return [];
  }
  async function readFile(file) {
    const name = file.name || "";
    if (/\.(txt)$/i.test(name)) return readPaste(await file.text(), "");
    await u.loadScript("js/vendor/xlsx.full.min.js");
    const X = window.XLSX;
    const wb = X.read(await file.arrayBuffer(), { type: "array" });
    const out = [];
    wb.SheetNames.forEach((sn) => {
      const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "" });
      parseRows(rows, sn, wb.SheetNames.length === 1 ? name : "").forEach((c) => {
        const same = out.find((x) => x.ten && x.ten === c.ten);
        if (same) same.hs = same.hs.concat(c.hs);
        else out.push(c);
      });
    });
    return out.filter((c) => c.hs.length);
  }
  // Mẫu Excel: mỗi lớp một trang tính, tên trang tính là tên lớp; cột STT | Họ và tên.
  async function template() {
    await u.loadScript("js/vendor/xlsx.full.min.js");
    const X = window.XLSX;
    const wb = X.utils.book_new();
    const guide = [
      ["HƯỚNG DẪN TẢI DANH SÁCH LỚP LÊN LESSON 360° STUDIO"],
      [""],
      ["1. Mỗi lớp một trang tính; đặt tên trang tính đúng tên lớp, ví dụ 10A1, 11B2, 6A."],
      ["2. Cột A: STT; cột B: Họ và tên (đủ họ, đệm, tên). Có thể tách hai cột Họ đệm | Tên."],
      ["3. Giữ đúng thứ tự trong sổ: học sinh dòng 1 là mã S01, dòng 2 là S02…"],
      ["4. Cũng có thể dùng một trang tính có thêm cột Lớp cho nhiều lớp."],
      ["5. Tệp xuất từ phần mềm quản lí trường (có dòng tiêu đề, tên trường…) vẫn đọc được: hệ thống tự tìm cột Họ và tên."]
    ];
    const g = X.utils.aoa_to_sheet(guide);
    g["!cols"] = [{ wch: 110 }];
    X.utils.book_append_sheet(wb, g, "Hướng dẫn");
    ["10A1", "10A2"].forEach((t) => {
      const sh = X.utils.aoa_to_sheet([["STT", "Họ và tên"], [1, ""], [2, ""], [3, ""]]);
      sh["!cols"] = [{ wch: 6 }, { wch: 36 }];
      X.utils.book_append_sheet(wb, sh, t);
    });
    X.writeFile(wb, "Mau_danh_sach_lop_Lesson360.xlsx");
  }

  /* ---------- Lưu trữ ---------- */
  const natural = (a, b) => (a.khoi || 0) - (b.khoi || 0) || String(a.ten).localeCompare(String(b.ten), "vi", { numeric: true });
  const toList = (v) => (Array.isArray(v) ? v : Object.keys(v || {}).sort((a, b) => a - b).map((k) => v[k])).filter((x) => x != null && x !== "");
  const Lop = {
    MAX_HS,
    cleanName,
    given,
    shortNames,
    className,
    khoiOf,
    idOf,
    code,
    parseRows,
    readPaste,
    readFile,
    template,
    // Năm học đã có danh sách (kèm năm hiện tại và năm kế tiếp để quản trị tạo mới).
    async years() {
      const now = L360.Ppct ? L360.Ppct.yearNow() : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      const y0 = Number(now.slice(0, 4));
      const set = new Set([now, `${y0 + 1}-${y0 + 2}`]);
      try {
        const v = await S().get("classes");
        Object.keys(v || {}).forEach((k) => /^\d{4}-\d{4}$/.test(k) && set.add(k));
      } catch (e) {}
      return [...set].sort().reverse();
    },
    // Các lớp của một năm học, xếp theo khối rồi tên lớp.
    async list(nam) {
      let v = null;
      try {
        v = await S().get(`classes/${nam}`);
      } catch (e) {}
      return Object.entries(v || {})
        .filter(([, c]) => c && c.ten)
        .map(([id, c]) => Object.assign({ id, nam }, c, { hs: toList(c.hs), khoi: c.khoi || khoiOf(c.ten) }))
        .sort(natural);
    },
    async get(nam, id) {
      const c = await S().get(`classes/${nam}/${id}`).catch(() => null);
      return c ? Object.assign({ id, nam }, c, { hs: toList(c.hs), khoi: c.khoi || khoiOf(c.ten) }) : null;
    },
    // Nhóm theo khối: [{khoi, lop:[…]}]
    byKhoi(list) {
      const g = {};
      list.forEach((c) => (g[c.khoi || 0] = g[c.khoi || 0] || []).push(c));
      return Object.keys(g)
        .map(Number)
        .sort((a, b) => a - b)
        .map((k) => ({ khoi: k, lop: g[k].sort(natural) }));
    },
    async save(nam, c, by) {
      const ten = className(c.ten) || String(c.ten || "").trim().toUpperCase();
      if (!ten) throw new Error("Thiếu tên lớp.");
      const hs = (c.hs || []).map(cleanName).filter(Boolean).slice(0, MAX_HS);
      if (!hs.length) throw new Error(`Lớp ${ten} chưa có học sinh.`);
      const id = c.id || idOf(ten);
      await S().set(`classes/${nam}/${id}`, { ten, khoi: Number(c.khoi) || khoiOf(ten), hs, n: hs.length, at: Date.now(), by: by || "" });
      return id;
    },
    remove(nam, id) {
      return S().remove(`classes/${nam}/${id}`);
    },
    // Ghi danh sẵn cho phòng học: mã → tên hiển thị (không gồm họ tên đầy đủ).
    roster(c) {
      const sn = shortNames(c.hs || []);
      return sn.map((name, i) => ({ code: code(i), name }));
    }
  };
  L360.Lop = Lop;
})();
