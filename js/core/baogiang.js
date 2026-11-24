/* Báo giảng CSDL: điền cột "Tiết theo PPCT" vào template báo giảng tuần của giáo viên.
   - Nguồn: Syllabus CSDL của trường (quản trị viên tải lên mỗi năm; có sẵn bản năm 2026–2027),
     kèm Syllabus HĐTN-HN (kiểu tiết GVCN/GVBM).
   - Quy tắc: báo từ tiết 1, lần lượt theo từng tuần; mỗi tiết của một lớp chỉ báo một lần;
     Ngữ văn, Lịch sử, Địa lí, LS&ĐL, GDCD, GDKT&PL (kiểm tra chung) không báo tiết kiểm tra;
     GDĐP, HĐTN (kiểm tra/đánh giá tại lớp) báo tiết kiểm tra như tiết thường;
     HĐTN: GVCN chỉ báo tiết GVCN, GVBM chỉ báo tiết GVBM.
   - Kết quả: tệp Excel GIỮ NGUYÊN template (chỉ ghi vào các ô cần điền) để tải thẳng lên CSDL. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = () => L360.store;

  const norm = (s) =>
    String(s == null ? "" : s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const KT_SKIP = ["ngu van", "lich su", "dia li", "dia ly", "lich su va dia li", "lich su va dia ly", "lich su - dia li", "gdcd", "giao duc cong dan", "gdkt&pl", "gdktpl", "gdkt & pl", "giao duc kinh te va phap luat"];
  const skipKT = (mon) => KT_SKIP.includes(norm(mon).replace(/^chuyen de (hoc tap )?/, ""));
  const isKT = (row) => /^KT/i.test(row[0]) || /^(kiem tra|danh gia) (giua|cuoi)/.test(norm(row[1]));
  const isTH = (row) => /^TH\d/i.test(row[0]);
  const isHDTN = (mon) => /^(hdtn|hoat dong trai nghiem)/.test(norm(mon));
  const khoiOf = (lop) => {
    const m = String(lop || "").match(/^\s*(\d{1,2})/);
    return m ? Number(m[1]) : 0;
  };
  const fbKey = (s) => String(s).replace(/[.#$/[\]]/g, "_");
  const keyOf = (khoi, mon, lop) => `${khoi}|${mon}|${lop}`;
  const NGHI = ["nghi day", "nghi le"];

  const BG = {
    norm,
    skipKT,
    isKT,
    isTH,
    isHDTN,
    khoiOf,
    keyOf,
    cache: {},
    yearOf(d) {
      d = d || new Date();
      const y = d.getFullYear();
      return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    },

    /* ---------- Syllabus ---------- */
    // Đọc tệp Syllabus (định dạng CSDL hoặc HĐTN-HN) → { kind, docs: {khoi: {mon: rows}} | styles: {khoi: {tiet: style}} }.
    async parseSyllabus(file) {
      await u.loadScript("js/vendor/xlsx.full.min.js");
      const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sh = wb.Sheets["Sheet1"] || wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sh, { header: 1, raw: false, defval: "" });
      const head = (rows[0] || []).map(norm);
      const s = (v) => String(v == null ? "" : v).trim().replace(/\.0$/, "");
      if (head.includes("session") && head.includes("style")) {
        const ig = head.indexOf("grade"), is = head.indexOf("session"), it = head.indexOf("style");
        const styles = {};
        rows.slice(1).forEach((r) => {
          const k = Number(s(r[ig])) || 0;
          if (!k || !s(r[is])) return;
          (styles[k] = styles[k] || {})[s(r[is])] = s(r[it]).toUpperCase();
        });
        return { kind: "hdtn", styles, name: file.name };
      }
      const col = (re) => head.findIndex((h) => re.test(h));
      const iK = col(/^ten khoi|^khoi/), iM = col(/^ten mon/), iT = col(/^tiet theo ppct/), iN = col(/^ten bai/), iO = col(/^thu tu/), iH = col(/^hoc ky/);
      if (iM < 0 || iT < 0) throw new Error("Tệp không đúng mẫu Syllabus CSDL (cần các cột Tên khối, Tên môn học, Tiết theo PPCT, Tên bài dạy, Thứ tự, Học kỳ).");
      const docs = {};
      rows.slice(1).forEach((r) => {
        const k = khoiOf(String(r[iK]).replace(/[^\d]/g, "")) || Number(String(r[iK]).replace(/[^\d]/g, "")) || 0;
        const mon = s(r[iM]);
        const t = s(r[iT]);
        if (!k || !mon || !t) return;
        ((docs[k] = docs[k] || {})[mon] = docs[k][mon] || []).push([t, s(r[iN]), Number(s(r[iO])) || 0, Number(s(r[iH])) || s(r[iH])]);
      });
      Object.values(docs).forEach((m) => Object.values(m).forEach((list) => list.sort((a, b) => a[2] - b[2])));
      return { kind: "csdl", docs, name: file.name };
    },
    // Ghép kiểu tiết GVCN/GVBM của HĐTN vào Syllabus.
    mergeStyles(doc, styles) {
      Object.keys(doc.mon || {}).forEach((mon) => {
        if (!isHDTN(mon)) return;
        doc.mon[mon].forEach((r) => styles[r[0]] && (r[4] = styles[r[0]]));
      });
      return doc;
    },
    // Syllabus một khối: bản quản trị viên đã tải lên (máy chủ) → bản có sẵn của năm học.
    async syllabus(nam, khoi) {
      const ck = `${nam}/${khoi}`;
      if (BG.cache[ck] !== undefined) return BG.cache[ck];
      let doc = null;
      try {
        await S().ready;
        doc = await S().get(`baogiang/syllabus/${nam}/K${khoi}`);
      } catch (e) {}
      if (!doc)
        try {
          const r = await fetch(`data/baogiang/${nam}/K${khoi}.json`, { cache: "no-cache" });
          if (r.ok) doc = await r.json();
        } catch (e) {}
      if (doc && doc.mon) Object.keys(doc.mon).forEach((m) => (doc.mon[m] = Object.values(doc.mon[m] || {}).map((r) => (Array.isArray(r) ? r : Object.values(r)))));
      return (BG.cache[ck] = doc || null);
    },
    async saveSyllabus(nam, khoi, doc) {
      await S().set(`baogiang/syllabus/${nam}/K${khoi}`, doc);
      BG.cache[`${nam}/${khoi}`] = doc;
    },
    async syllabusIndex(nam) {
      const out = {};
      try {
        const r = await fetch(`data/baogiang/${nam}/index.json`, { cache: "no-cache" });
        if (r.ok) (await r.json()).khoi.forEach((k) => (out[k.khoi] = { khoi: k.khoi, rows: k.rows, mon: k.mon, nguon: "Bản có sẵn năm học" }));
      } catch (e) {}
      try {
        await S().ready;
        const v = await S().get(`baogiang/syllabus/${nam}`);
        u.entries(v || {}).forEach(([k, d]) => {
          const kk = Number(String(k).replace(/\D/g, ""));
          const mons = Object.keys(d.mon || {});
          out[kk] = { khoi: kk, rows: mons.reduce((a, m) => a + Object.keys(d.mon[m] || {}).length, 0), mon: mons, nguon: d.nguon || "Quản trị viên tải lên", up: d.up };
        });
      } catch (e) {}
      return Object.values(out).sort((a, b) => a.khoi - b.khoi);
    },
    // Tìm danh sách tiết của một môn trong Syllabus (tên môn trong template có thể khác chữ hoa/thường).
    monList(doc, mon) {
      if (!doc || !doc.mon) return null;
      if (doc.mon[mon]) return { name: mon, rows: doc.mon[mon] };
      const n = norm(mon);
      const k = Object.keys(doc.mon).find((m) => norm(m) === n) || Object.keys(doc.mon).find((m) => norm(m).replace(/&/g, " va ") === n.replace(/&/g, " va "));
      return k ? { name: k, rows: doc.mon[k] } : null;
    },

    /* ---------- Template tuần ---------- */
    async readTemplate(file) {
      await u.loadScript("js/vendor/xlsx.full.min.js");
      const X = window.XLSX;
      const buf = await file.arrayBuffer();
      const wb = X.read(buf, { type: "array" });
      // Trang tính có cột "Tiết theo PPCT" (template có thể kèm các trang danh mục).
      const val = (sh, r, c) => {
        const cell = sh[X.utils.encode_cell({ r, c })];
        return cell == null ? "" : String(cell.w != null ? cell.w : cell.v != null ? cell.v : "").trim();
      };
      let name = null, sh = null, rng = null, hr = -1;
      for (const n of wb.SheetNames) {
        const s0 = wb.Sheets[n];
        if (!s0 || !s0["!ref"]) continue;
        const g = X.utils.decode_range(s0["!ref"]);
        for (let r = g.s.r; r <= Math.min(g.e.r, g.s.r + 30) && hr < 0; r++)
          for (let c = g.s.c; c <= g.e.c; c++)
            if (/^tiết theo ppct$/i.test(val(s0, r, c).replace(/\s+/g, " "))) {
              (name = n), (sh = s0), (rng = g), (hr = r);
              break;
            }
        if (hr >= 0) break;
      }
      if (hr < 0) throw new Error("Không thấy cột \"Tiết theo PPCT\" – hãy tải đúng template báo giảng tuần xuất từ CSDL.");
      const col = {};
      for (let c = rng.s.c; c <= rng.e.c; c++) {
        const h = norm(val(sh, hr, c));
        const k = /^stt$/.test(h) ? "stt" : /^thu$/.test(h) ? "thu" : /^buoi/.test(h) ? "buoi" : /^tiet hoc tkb|^tiet tkb/.test(h) ? "tkb" : /^kieu giang day/.test(h) ? "kieu" : /^mon hoc/.test(h) ? "mon" : /^lop hoc|^lop$/.test(h) ? "lop" : /^tiet theo ppct/.test(h) ? "ppct" : /^ghi chu/.test(h) ? "note" : null;
        if (k && col[k] == null) col[k] = c;
      }
      const letter = (c) => X.utils.encode_col(c);
      const top = [];
      for (let r = rng.s.r; r < hr; r++) {
        const line = [];
        for (let c = rng.s.c; c <= rng.e.c; c++) val(sh, r, c) && line.push(val(sh, r, c));
        top.push(line.join(" "));
      }
      const head = top.join("\n");
      const wk = head.match(/Tuần\s*(\d+)\s*\((\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\)/i);
      const gv = head.match(/giáo viên:\s*([^\n(]+?)\s*(?:\((\w+)\))?\s*(?:\n|$)/i);
      const list = [];
      for (let r = hr + 1; r <= rng.e.r; r++) {
        const g = (k) => (col[k] != null ? val(sh, r, col[k]) : "");
        if (!g("thu") && !g("mon") && !g("stt")) continue;
        list.push({ r: r + 1, stt: g("stt"), thu: g("thu"), buoi: g("buoi"), tkb: g("tkb"), kieu: g("kieu"), mon: g("mon"), lop: g("lop"), ppct: g("ppct"), note: g("note") });
      }
      const from = wk ? new Date(Number(wk[4]), Number(wk[3]) - 1, Number(wk[2])) : null;
      return {
        name: file.name,
        buf,
        xls: !/^PK/.test(String.fromCharCode(...new Uint8Array(buf.slice(0, 2)))),
        sheet: name,
        cols: { ppct: letter(col.ppct), kieu: col.kieu != null ? letter(col.kieu) : null, note: col.note != null ? letter(col.note) : null },
        tuan: wk ? Number(wk[1]) : 0,
        from,
        to: wk ? new Date(Number(wk[7]), Number(wk[6]) - 1, Number(wk[5])) : null,
        gv: gv ? gv[1].trim() : "",
        maGv: gv && gv[2] ? gv[2] : "",
        nam: BG.yearOf(from || new Date()),
        rows: list
      };
    },
    // Ngày (dd/mm) của một "Thứ" trong tuần (Thứ 2 = ngày đầu tuần).
    dayOf(tpl, thu) {
      if (!tpl.from || !/^\d$/.test(String(thu))) return null;
      const d = new Date(tpl.from);
      d.setDate(d.getDate() + Number(thu) - 2);
      return d;
    },

    /* ---------- Điền ---------- */
    // opt: { syl: {khoi: doc}, last: {key: code}, roles: {key: "GVCN"|"GVBM"|"all"}, th: {key: bool}, off: {thu: note}, fix: {r: code} }
    fill(tpl, opt) {
      const pos = {};
      const out = [];
      const listOf = (k, mon, lop) => {
        const doc = opt.syl[k];
        const ml = BG.monList(doc, mon);
        if (!ml) return null;
        const key = keyOf(k, ml.name, lop);
        const role = (opt.roles || {})[key] || "all";
        // Tiết mã "TH…" là luồng tiết tăng cường riêng: mặc định không báo, trừ khi giáo viên chọn "Báo cả tiết TH" cho lớp đó.
        const th = !!(opt.th || {})[key];
        const ok = (row) => !(skipKT(ml.name) && isKT(row)) && (th || !isTH(row)) && (!isHDTN(ml.name) || role === "all" || !row[4] || row[4] === role);
        return { key, name: ml.name, rows: ml.rows, ok };
      };
      tpl.rows.forEach((row) => {
        const o = Object.assign({}, row, { out: row.ppct, kieuOut: row.kieu, noteOut: row.note, flag: "", ten: "" });
        out.push(o);
        if (!row.mon || !row.lop) return;
        const k = khoiOf(row.lop);
        const L = listOf(k, row.mon, row.lop);
        if (!L) return (o.flag = opt.syl[k] ? `Syllabus khối ${k} không có môn "${row.mon}"` : `Chưa có Syllabus khối ${k}`);
        o.key = L.key;
        if (pos[L.key] == null) {
          const last = (opt.last || {})[L.key];
          pos[L.key] = last ? L.rows.findIndex((x) => x[0] === String(last)) : -1;
        }
        const off = (opt.off || {})[row.thu];
        if (off != null && !row.ppct) {
          o.kieuOut = "Nghỉ lễ";
          o.noteOut = off || "Nghỉ lễ";
          o.out = "";
          o.flag = "Ngày nghỉ";
          return;
        }
        if (NGHI.includes(norm(row.kieu))) return (o.flag = row.kieu);
        const fix = (opt.fix || {})[row.r] || row.ppct;
        if (fix) {
          // Một ô có thể ghi nhiều tiết, cách nhau dấu phẩy.
          const codes = String(fix).split(",").map((x) => x.trim()).filter(Boolean);
          const idx = codes.map((c) => L.rows.findIndex((x) => x[0] === c));
          o.out = codes.join(",");
          o.fixed = true;
          o.ten = idx.map((i) => (L.rows[i] || [])[1] || "").filter(Boolean).join("; ");
          if (idx.some((i) => i < 0)) o.flag = "Mã tiết không có trong Syllabus";
          else if (idx.some((i) => i <= pos[L.key])) o.flag = "Tiết này đã báo trước đó";
          pos[L.key] = Math.max(pos[L.key], ...idx);
          return;
        }
        if (/^(day thay|lap gio)$/.test(norm(row.kieu))) return (o.flag = `${row.kieu}: thầy cô tự điền tiết của lớp`);
        let i = pos[L.key] + 1;
        while (i < L.rows.length && !L.ok(L.rows[i])) i++;
        if (i >= L.rows.length) return (o.flag = "Đã hết tiết trong Syllabus");
        o.out = L.rows[i][0];
        o.ten = L.rows[i][1];
        o.auto = true;
        pos[L.key] = i;
      });
      const last = {};
      Object.keys(pos).forEach((k) => {
        const [khoi, mon] = k.split("|");
        const doc = opt.syl[khoi];
        const ml = BG.monList(doc, mon);
        if (ml && pos[k] >= 0) last[k] = ml.rows[pos[k]][0];
      });
      return { rows: out, last };
    },
    // Tiết đã báo gần nhất của từng lớp – đọc từ các tệp báo giảng tuần trước.
    lastFrom(tpls, syl) {
      const last = {};
      const best = {};
      tpls.forEach((t) =>
        t.rows.forEach((r) => {
          if (!r.ppct || !r.mon || !r.lop) return;
          const k = khoiOf(r.lop);
          const ml = BG.monList(syl[k], r.mon);
          if (!ml) return;
          const key = keyOf(k, ml.name, r.lop);
          String(r.ppct)
            .split(",")
            .map((x) => x.trim())
            .forEach((c) => {
              const i = ml.rows.findIndex((x) => x[0] === c);
              if (i >= 0 && (best[key] == null || i > best[key])) (best[key] = i), (last[key] = c);
            });
        })
      );
      return last;
    },

    /* ---------- Xuất Excel: giữ nguyên template, chỉ ghi các ô thay đổi ---------- */
    // Ghi thẳng vào XML của template bằng trình phân tích XML (giữ nguyên mọi định dạng, kiểu ô, tiền tố
    // không gian tên của tệp do CSDL sinh ra); sau khi ghi đọc lại để kiểm tra từng ô. Nếu không ghi được
    // (ví dụ tệp .xls cũ) thì xuất bằng thư viện bảng tính.
    async exportXlsx(tpl, rows) {
      const changes = [];
      rows.forEach((o) => {
        if (o.out !== o.ppct) changes.push([`${tpl.cols.ppct}${o.r}`, o.out || "", true]);
        if (tpl.cols.kieu && o.kieuOut !== o.kieu) changes.push([`${tpl.cols.kieu}${o.r}`, o.kieuOut || "", false]);
        if (tpl.cols.note && o.noteOut !== o.note) changes.push([`${tpl.cols.note}${o.r}`, o.noteOut || "", false]);
      });
      let blob = null;
      if (!tpl.xls)
        try {
          blob = await BG.patchXml(tpl, changes);
        } catch (e) {
          console.warn("Ghi trực tiếp template không được:", e);
        }
      if (blob) {
        const bad = await BG.check(blob, tpl, changes);
        if (!bad.length) return blob;
        console.warn("Ô chưa ghi đúng:", bad);
      }
      return BG.writeWithLib(tpl, changes);
    },
    async patchXml(tpl, changes) {
      await u.loadScript("js/vendor/jszip.min.js");
      const zip = await window.JSZip.loadAsync(tpl.buf);
      const P = new DOMParser();
      const read = async (p) => (zip.file(p) ? P.parseFromString(await zip.file(p).async("string"), "application/xml") : null);
      const wbx = await read("xl/workbook.xml");
      const rels = await read("xl/_rels/workbook.xml.rels");
      if (!wbx || !rels) throw new Error("Thiếu workbook.xml");
      const RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
      const sheets = [...wbx.getElementsByTagNameNS("*", "sheet")];
      const se = sheets.find((x) => x.getAttribute("name") === tpl.sheet) || sheets[0];
      const rid = se.getAttributeNS(RNS, "id") || se.getAttribute("r:id");
      const rel = [...rels.getElementsByTagNameNS("*", "Relationship")].find((x) => x.getAttribute("Id") === rid);
      let target = rel ? rel.getAttribute("Target") : "worksheets/sheet1.xml";
      const path = target.startsWith("/") ? target.slice(1) : ("xl/" + target).replace(/\/\.\//g, "/");
      const doc = await read(path);
      if (!doc || doc.getElementsByTagName("parsererror").length) throw new Error("Không đọc được trang tính");
      const root = doc.documentElement;
      const NS = root.namespaceURI;
      const pre = root.prefix;
      const mk = (tag) => doc.createElementNS(NS, pre ? `${pre}:${tag}` : tag);
      const sd = root.getElementsByTagNameNS(NS, "sheetData")[0];
      const colNum = (ref) => ref.replace(/\d+/g, "").split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0);
      const rowsBy = {};
      [...sd.getElementsByTagNameNS(NS, "row")].forEach((r) => (rowsBy[r.getAttribute("r")] = r));
      // Kiểu ô đã điền sẵn trong cột PPCT (dòng dữ liệu) hoặc kiểu cùng dạng định dạng Văn bản.
      const ss = await read("xl/styles.xml");
      const xfs = ss ? [...((ss.getElementsByTagNameNS(NS, "cellXfs")[0] || { children: [] }).children)] : [];
      const sig = (x, nf) => [nf, "fontId", "fillId", "borderId", "xfId"].map((a, i) => (i === 0 ? nf : x.getAttribute(a) || "0")).join("|") + "|" + (x.getElementsByTagNameNS(NS, "alignment")[0] ? new XMLSerializer().serializeToString(x.getElementsByTagNameNS(NS, "alignment")[0]) : "");
      const textStyle = (s) => {
        const x = xfs[Number(s)];
        if (!x || x.getAttribute("numFmtId") === "49") return s;
        const want = sig(x, "49");
        const i = xfs.findIndex((y) => sig(y, y.getAttribute("numFmtId") || "0") === want);
        return i >= 0 ? String(i) : s;
      };
      const minR = Math.min(...tpl.rows.map((o) => o.r));
      let filledStyle = null;
      for (const [k, r] of Object.entries(rowsBy)) {
        if (Number(k) < minR) continue;
        const c = [...r.getElementsByTagNameNS(NS, "c")].find((c) => c.getAttribute("r") === `${tpl.cols.ppct}${k}`);
        if (c && c.textContent.trim() && c.getAttribute("s")) {
          filledStyle = c.getAttribute("s");
          break;
        }
      }
      for (const [ref, v, isPpct] of changes) {
        const rn = ref.replace(/\D/g, "");
        let row = rowsBy[rn];
        if (!row) {
          row = mk("row");
          row.setAttribute("r", rn);
          const after = Object.keys(rowsBy).map(Number).filter((x) => x > Number(rn)).sort((a, b) => a - b)[0];
          sd.insertBefore(row, after ? rowsBy[after] : null);
          rowsBy[rn] = row;
        }
        const cells = [...row.getElementsByTagNameNS(NS, "c")];
        let c = cells.find((x) => x.getAttribute("r") === ref);
        if (!c) {
          c = mk("c");
          c.setAttribute("r", ref);
          const nx = cells.find((x) => colNum(x.getAttribute("r") || "A") > colNum(ref));
          // Kiểu ô lấy theo ô liền trái cùng dòng (cùng khung viền, phông chữ).
          const st0 = cells.filter((x) => colNum(x.getAttribute("r") || "A") < colNum(ref) && x.getAttribute("s")).pop() || cells.find((x) => x.getAttribute("s"));
          if (st0) c.setAttribute("s", st0.getAttribute("s"));
          row.insertBefore(c, nx || null);
        }
        while (c.firstChild) c.removeChild(c.firstChild);
        c.removeAttribute("t");
        if (isPpct && v) c.setAttribute("s", filledStyle || textStyle(c.getAttribute("s") || "0"));
        if (v !== "") {
          c.setAttribute("t", "inlineStr");
          const is = mk("is");
          const t = mk("t");
          t.textContent = v;
          is.appendChild(t);
          c.appendChild(is);
        }
      }
      let xml = new XMLSerializer().serializeToString(doc);
      if (!/^<\?xml/.test(xml)) xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml;
      zip.file(path, xml);
      // Bỏ chuỗi tính toán cũ (nếu có) để Excel tự tính lại, tránh cảnh báo sửa tệp.
      if (zip.file("xl/calcChain.xml")) {
        zip.remove("xl/calcChain.xml");
        const ct = await zip.file("[Content_Types].xml").async("string");
        zip.file("[Content_Types].xml", ct.replace(/<Override[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/, ""));
        const wr = await zip.file("xl/_rels/workbook.xml.rels").async("string");
        zip.file("xl/_rels/workbook.xml.rels", wr.replace(/<Relationship[^>]*calcChain[^>]*\/>/, ""));
      }
      return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
    },
    // Đọc lại tệp vừa tạo, đối chiếu từng ô cần điền.
    async check(blob, tpl, changes) {
      const X = window.XLSX;
      const wb = X.read(await blob.arrayBuffer(), { type: "array" });
      const sh = wb.Sheets[tpl.sheet] || wb.Sheets[wb.SheetNames[0]];
      return changes.filter(([ref, v]) => String((sh[ref] && (sh[ref].w != null ? sh[ref].w : sh[ref].v)) || "").trim() !== String(v).trim());
    },
    // Phương án dự phòng: ghi bằng thư viện bảng tính (giữ dữ liệu, có thể mất một phần định dạng).
    async writeWithLib(tpl, changes) {
      const X = window.XLSX;
      const wb = X.read(tpl.buf, { type: "array", cellStyles: true });
      const sh = wb.Sheets[tpl.sheet] || wb.Sheets[wb.SheetNames[0]];
      changes.forEach(([ref, v]) => {
        if (v === "") return delete sh[ref];
        sh[ref] = Object.assign({}, sh[ref] || {}, { t: "s", v, w: v, z: "@" });
        const g = X.utils.decode_range(sh["!ref"]);
        const a = X.utils.decode_cell(ref);
        if (a.r > g.e.r || a.c > g.e.c) (g.e.r = Math.max(g.e.r, a.r)), (g.e.c = Math.max(g.e.c, a.c)), (sh["!ref"] = X.utils.encode_range(g));
      });
      // Bỏ thuộc tính "level" thư viện đọc từ .xls (không hợp lệ trong .xlsx, Excel sẽ đòi sửa tệp).
      wb.SheetNames.forEach((n) => (wb.Sheets[n]["!cols"] || []).forEach((c) => c && delete c.level));
      const out = X.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
      BG.lastFallback = true;
      return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    },

    /* ---------- Lưu tiến độ ---------- */
    async loadProgress(uid, nam) {
      try {
        await S().ready;
        const v = (await S().get(`baogiang/progress/${uid}/${nam}`)) || {};
        const out = {};
        u.vals(v).forEach((x) => x && x.key && (out[x.key] = x));
        return out;
      } catch (e) {
        return {};
      }
    },
    async saveProgress(uid, nam, tuan, last, rows) {
      const upd = {};
      Object.entries(last).forEach(([k, code]) => (upd[fbKey(k)] = { key: k, code, tuan, at: Date.now() }));
      await S().update(`baogiang/progress/${uid}/${nam}`, upd);
      await S().set(`baogiang/reports/${uid}/${nam}/T${tuan || 0}`, {
        tuan,
        at: Date.now(),
        rows: rows.filter((o) => o.mon && o.lop).map((o) => ({ thu: o.thu, buoi: o.buoi, tkb: o.tkb, mon: o.mon, lop: o.lop, ppct: o.out || "", kieu: o.kieuOut || "" }))
      });
    },
    async loadCalendar(nam) {
      try {
        await S().ready;
        return u.vals((await S().get(`baogiang/lich/${nam}`)) || {}).filter(Boolean);
      } catch (e) {
        return [];
      }
    }
  };
  L360.BaoGiang = BG;
})();
