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
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });
      const name = wb.SheetNames[0];
      const sh = wb.Sheets[name];
      const rng = window.XLSX.utils.decode_range(sh["!ref"] || "A1:A1");
      const rows = window.XLSX.utils.sheet_to_json(sh, { header: 1, raw: false, defval: "", blankrows: true });
      const hi = rows.findIndex((r) => r.some((c) => /^tiết theo ppct$/i.test(String(c).trim())));
      if (hi < 0) throw new Error("Không thấy cột \"Tiết theo PPCT\" – hãy tải đúng template báo giảng tuần xuất từ CSDL.");
      const h = rows[hi].map((c) => norm(c));
      const ci = (re) => h.findIndex((x) => re.test(x));
      const C = { stt: ci(/^stt$/), thu: ci(/^thu$/), buoi: ci(/^buoi/), tkb: ci(/^tiet hoc tkb|^tiet tkb/), kieu: ci(/^kieu giang day/), mon: ci(/^mon hoc/), lop: ci(/^lop hoc|^lop$/), ppct: ci(/^tiet theo ppct/), note: ci(/^ghi chu/) };
      const letter = (i) => window.XLSX.utils.encode_col(i);
      const top = rows.slice(0, hi).map((r) => r.filter(Boolean).join(" ")).join("\n");
      const wk = top.match(/Tuần\s*(\d+)\s*\((\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\)/i);
      const gv = top.match(/giáo viên:\s*([^\n(]+?)\s*(?:\((\w+)\))?\s*(?:\n|$)/i);
      const list = [];
      rows.slice(hi + 1).forEach((r, j) => {
        const g = (k) => (C[k] >= 0 ? String(r[C[k]] == null ? "" : r[C[k]]).trim() : "");
        if (!g("thu") && !g("mon") && !g("stt")) return;
        list.push({ r: rng.s.r + hi + 2 + j, stt: g("stt"), thu: g("thu"), buoi: g("buoi"), tkb: g("tkb"), kieu: g("kieu"), mon: g("mon"), lop: g("lop"), ppct: g("ppct"), note: g("note") });
      });
      const from = wk ? new Date(Number(wk[4]), Number(wk[3]) - 1, Number(wk[2])) : null;
      return {
        name: file.name,
        buf,
        sheet: name,
        cols: { ppct: letter(C.ppct), kieu: C.kieu >= 0 ? letter(C.kieu) : null, note: C.note >= 0 ? letter(C.note) : null },
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
    async exportXlsx(tpl, rows) {
      await u.loadScript("js/vendor/jszip.min.js");
      const zip = await window.JSZip.loadAsync(tpl.buf);
      const wbx = await zip.file("xl/workbook.xml").async("string");
      const rels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
      const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const sm = wbx.match(new RegExp(`<sheet\\b[^>]*name="${tpl.sheet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*r:id="([^"]+)"`)) || wbx.match(/<sheet\b[^>]*r:id="([^"]+)"/);
      const rm = sm && rels.match(new RegExp(`<Relationship\\b[^>]*Id="${sm[1]}"[^>]*Target="([^"]+)"`)) ;
      const rm2 = sm && !rm && rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${sm[1]}"`));
      const target = ((rm || rm2) && (rm || rm2)[1]) || "worksheets/sheet1.xml";
      const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
      let xml = await zip.file(path).async("string");
      // Kiểu ô của cột "Tiết theo PPCT" khi đã có giá trị (định dạng văn bản) – dùng lại cho ô mới điền.
      const stylesXml = zip.file("xl/styles.xml") ? await zip.file("xl/styles.xml").async("string") : "";
      const xfs = ((stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/) || [])[1] || "").match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) || [];
      const minR = Math.min(...tpl.rows.map((o) => o.r));
      const filledStyle = (() => {
        const re = new RegExp(`<c r="${tpl.cols.ppct}(\\d+)"[^>]*?\\ss="(\\d+)"[^>]*t="inlineStr"><is><t>[^<]+</t>`, "g");
        let m;
        while ((m = re.exec(xml))) if (Number(m[1]) >= minR) return m[2];
        return null;
      })();
      // Ô "Tiết theo PPCT" là văn bản: dùng kiểu ô cùng dạng nhưng định dạng Text (@) nếu template có sẵn.
      const textStyle = (s) => {
        const x = xfs[Number(s)];
        if (!x || /numFmtId="49"/.test(x)) return s;
        const want = x.replace(/numFmtId="\d+"/, 'numFmtId="49"');
        const i = xfs.indexOf(want);
        return i >= 0 ? String(i) : s;
      };
      const colNum = (ref) => ref.replace(/\d+/g, "").split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0);
      const setCell = (ref, val, style) => {
        const rowN = ref.replace(/\D/g, "");
        const cellRe = new RegExp(`<c r="${ref}"(\\s[^>]*?)?(?:/>|>[\\s\\S]*?</c>)`);
        const m = xml.match(cellRe);
        let s = style;
        if (m && !s) {
          const sm2 = (m[1] || "").match(/\ss="(\d+)"/);
          s = sm2 ? sm2[1] : null;
        }
        const cell = val === "" ? `<c r="${ref}"${s ? ` s="${s}"` : ""}/>` : `<c r="${ref}"${s ? ` s="${s}"` : ""} t="inlineStr"><is><t>${esc(val)}</t></is></c>`;
        if (m) return (xml = xml.replace(cellRe, cell));
        const rowRe = new RegExp(`(<row\\b[^>]*\\br="${rowN}"[^>]*>)([\\s\\S]*?)(</row>)`);
        const rm3 = xml.match(rowRe);
        if (!rm3) return;
        // Chèn ô đúng thứ tự cột.
        const cells = rm3[2].match(/<c r="[A-Z]+\d+"[\s\S]*?(?:\/>|<\/c>)/g) || [];
        const n = colNum(ref);
        const at = cells.findIndex((c) => colNum(c.match(/r="([A-Z]+)/)[1]) > n);
        const inner = at < 0 ? rm3[2] + cell : rm3[2].replace(cells[at], cell + cells[at]);
        xml = xml.replace(rowRe, `$1${inner}$3`);
      };
      rows.forEach((o) => {
        if (o.out !== o.ppct) {
          const ref = `${tpl.cols.ppct}${o.r}`;
          const cur = (xml.match(new RegExp(`<c r="${ref}"[^>]*\\ss="(\\d+)"`)) || [])[1];
          setCell(ref, o.out || "", o.out ? filledStyle || (cur ? textStyle(cur) : null) : null);
        }
        if (tpl.cols.kieu && o.kieuOut !== o.kieu) setCell(`${tpl.cols.kieu}${o.r}`, o.kieuOut || "");
        if (tpl.cols.note && o.noteOut !== o.note) setCell(`${tpl.cols.note}${o.r}`, o.noteOut || "");
      });
      zip.file(path, xml);
      return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
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
