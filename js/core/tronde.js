/* Trộn đề kiểm tra (chạy hoàn toàn trên máy, không tải đề lên máy chủ).
   Đề gốc (.docx): mỗi phần mở đầu bằng thẻ <g1>/<g2>/<g3> (hoặc <g>) in đậm; câu bắt đầu "Câu n." hoặc "Câu n:";
   trắc nghiệm nhiều phương án A. B. C. D. – phương án đúng tô đỏ; đúng sai a) b) c) d) – ý đúng tô đỏ;
   trả lời ngắn – dòng "Đáp án: …" tô đỏ dưới câu (được xoá khỏi đề phát cho học sinh).
   Giữ nguyên gói Word gốc (công thức Equation/MathType, hình ảnh, chữ tiếng Việt): chỉ sắp xếp lại các đoạn, đánh lại nhãn. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const M = "http://schemas.openxmlformats.org/officeDocument/2006/math";
  const XMLNS = "http://www.w3.org/XML/1998/namespace";
  const OBJ = "￼";
  const FONT = "Times New Roman";
  const SYMBOL_FONTS = /symbol|wingdings|webdings|mt extra|cambria math|euclid|mathtype/i;
  const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

  /* ---------- XML ---------- */
  const parseXml = (s) => new DOMParser().parseFromString(s, "application/xml");
  const ser = (n) => new XMLSerializer().serializeToString(n);
  const kids = (el) => [...el.childNodes].filter((n) => n.nodeType === 1);
  const isW = (n, name) => n && n.nodeType === 1 && n.namespaceURI === W && n.localName === name;
  const isM = (n, name) => n && n.nodeType === 1 && n.namespaceURI === M && (!name || n.localName === name);
  const child = (el, name) => (el ? kids(el).find((c) => isW(c, name)) : null);
  const wAttr = (el, name) => (el ? el.getAttributeNS(W, name) || el.getAttribute("w:" + name) || "" : "");
  const desc = (el, ns, name) => [...el.getElementsByTagNameNS(ns, name)];

  /* ---------- Màu đỏ = đáp án ---------- */
  const isRedHex = (v) => {
    if (!v || /^auto$/i.test(v)) return false;
    if (/^(red|darkred)$/i.test(v)) return true;
    const m = /^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v);
    if (!m) return false;
    const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
    return r >= 0x99 && g <= 0x70 && b <= 0x70 && r - Math.max(g, b) >= 0x50;
  };
  const rprRed = (rPr) => {
    if (!rPr) return false;
    const c = child(rPr, "color");
    if (c && isRedHex(wAttr(c, "val"))) return true;
    const h = child(rPr, "highlight");
    if (h && /^(red|darkRed)$/i.test(wAttr(h, "val"))) return true;
    const s = child(rPr, "shd");
    return !!(s && isRedHex(wAttr(s, "fill")));
  };
  // Tỉ lệ chữ đỏ trong một nút (công thức, liên kết…): đếm theo m:t / w:t con.
  function nodeRed(node, runRPr) {
    let red = 0,
      all = 0;
    const scan = (el, inherited) => {
      for (const c of kids(el)) {
        if ((isW(c, "r") || isM(c, "r")) && c) {
          const rp = kids(c).find((x) => isW(x, "rPr")) || null;
          const txt = kids(c)
            .filter((x) => isW(x, "t") || isM(x, "t"))
            .map((x) => x.textContent)
            .join("");
          const n = Math.max(1, txt.length);
          all += n;
          if (rprRed(rp) || (!rp && inherited)) red += n;
          continue;
        }
        scan(c, inherited);
      }
    };
    if (isW(node, "r") || isM(node, "r")) {
      const n = Math.max(1, node.textContent.length);
      return { red: rprRed(runRPr) ? n : 0, all: n };
    }
    scan(node, rprRed(runRPr));
    return { red, all: Math.max(all, 0) };
  }

  /* ---------- Đoạn văn → các mảnh (chữ, tab, nút) ---------- */
  function pieces(p) {
    const out = [];
    const pushRun = (r) => {
      const rPr = child(r, "rPr");
      for (const c of kids(r)) {
        if (isW(c, "rPr") || isW(c, "lastRenderedPageBreak")) continue;
        if (isW(c, "t")) out.push({ k: "t", rPr, text: c.textContent });
        else if (isW(c, "tab")) out.push({ k: "tab", rPr });
        else if (isW(c, "noBreakHyphen")) out.push({ k: "t", rPr, text: "‑" });
        else if (isW(c, "softHyphen")) continue;
        else {
          const run = r.ownerDocument.createElementNS(W, "w:r");
          if (rPr) run.appendChild(rPr.cloneNode(true));
          run.appendChild(c.cloneNode(true));
          const br = isW(c, "br") || isW(c, "cr");
          const instr = isW(c, "instrText") || isW(c, "fldChar");
          out.push({ k: "node", node: run, text: br ? "\n" : instr ? "" : OBJ, len: objLen(c), red: { red: rprRed(rPr) ? 1 : 0, all: instr ? 0 : 1 } });
        }
      }
    };
    const walk = (el) => {
      for (const c of kids(el)) {
        if (isW(c, "pPr")) continue;
        if (isW(c, "r")) pushRun(c);
        else if (isW(c, "ins") || isW(c, "smartTag") || isW(c, "customXml") || isW(c, "dir") || isW(c, "bdo")) walk(c);
        else if (isW(c, "del") || isW(c, "proofErr") || isW(c, "bookmarkStart") || isW(c, "bookmarkEnd") || isW(c, "permStart") || isW(c, "permEnd") || isW(c, "commentRangeStart") || isW(c, "commentRangeEnd"))
          continue;
        else if (isW(c, "moveFrom") || isW(c, "moveFromRangeStart") || isW(c, "moveFromRangeEnd")) continue;
        else {
          const red = nodeRed(c, null);
          out.push({ k: "node", node: c.cloneNode(true), text: OBJ, len: objLen(c), red, math: isM(c) });
        }
      }
    };
    walk(p);
    return out;
  }
  // Độ rộng ước lượng (đơn vị kí tự) của công thức / hình / đối tượng.
  function objLen(el) {
    if (isM(el)) {
      const t = desc(el, M, "t").map((x) => x.textContent).join("");
      const frac = desc(el, M, "f").length;
      return Math.ceil(t.length * 1.15 + frac * 2) || 2;
    }
    const ext = el.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", "extent")[0];
    if (ext) return Math.ceil(Number(ext.getAttribute("cx")) / 12700 / 6.2) || 99;
    const shape = el.getElementsByTagNameNS("urn:schemas-microsoft-com:vml", "shape")[0];
    if (shape) {
      const m = /width:\s*([\d.]+)pt/.exec(shape.getAttribute("style") || "");
      if (m) return Math.ceil(Number(m[1]) / 6.2);
      return 20;
    }
    return Math.max(1, (el.textContent || "").length);
  }
  const ptext = (pcs) => pcs.map((x) => (x.k === "t" ? x.text : x.k === "tab" ? "\t" : x.text)).join("");
  const plainText = (pcs) =>
    pcs
      .map((x) => (x.k === "t" ? x.text : x.k === "tab" ? " " : x.k === "node" ? (x.text === "\n" ? " " : (x.node.textContent || "").trim()) : ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  const visLen = (pcs) => pcs.reduce((a, x) => a + (x.k === "t" ? x.text.length : x.k === "tab" ? 4 : x.text === "\n" ? 200 : x.len || 0), 0);
  // Cắt các mảnh theo vị trí kí tự [a, b) của ptext.
  function slice(pcs, a, b) {
    const out = [];
    let pos = 0;
    for (const x of pcs) {
      const n = x.k === "t" ? x.text.length : x.k === "tab" ? 1 : x.text.length;
      const s = pos,
        e = pos + n;
      pos = e;
      if (n === 0) {
        if (s >= a && s < b) out.push(x);
        continue;
      }
      if (e <= a || s >= b) continue;
      if (x.k === "t") out.push(Object.assign({}, x, { text: x.text.slice(Math.max(0, a - s), Math.min(n, b - s)) }));
      else out.push(x);
    }
    return out.filter((x) => !(x.k === "t" && x.text === ""));
  }
  const trimPcs = (pcs) => {
    const t = ptext(pcs);
    const a = t.length - t.replace(/^[\s\t]+/, "").length;
    const b = t.replace(/[\s\t]+$/, "").length;
    return slice(pcs, a, Math.max(a, b));
  };
  const redShare = (pcs) => {
    let red = 0,
      all = 0;
    pcs.forEach((x) => {
      if (x.k === "t") {
        const n = x.text.replace(/\s/g, "").length;
        all += n;
        if (rprRed(x.rPr)) red += n;
      } else if (x.k === "node" && x.red) {
        red += x.red.red;
        all += x.red.all;
      }
    });
    return all ? red / all : 0;
  };

  /* ---------- Nhận dạng đề gốc ---------- */
  const RE_G = /^\s*<\s*(\/)?\s*g\s*(\d*)\s*>\s*$/i;
  const RE_Q = /^\s*Câu\s*(\d+)\s*(\([^)]{0,14}\))?\s*[.:)]?\s*/i;
  const RE_KEY = /^\s*Đáp\s*án\s*[:：.]\s*/i;
  const FIXED = /(cả\s+(hai|ba|bốn|[abcd]\b)|tất cả|đều đúng|đều sai|không có (đáp án|phương án|ý)|các (đáp án|phương án|ý) (trên|đều)|(đáp án|phương án) (trên|khác)|\b[ABCD]\s*(,|và|hoặc)\s*[ABCD]\b)/i;
  // Vị trí các nhãn A. B. C. D. (hoặc a) b) c) d)) trong một đoạn, theo đúng thứ tự.
  function findLabels(text, letters, from) {
    const hits = [];
    let want = from;
    let i = 0;
    while (want < letters.length) {
      const L = letters[want];
      const re = L === L.toUpperCase() ? new RegExp(`${L}\\s*[.)]`, "g") : new RegExp(`${L}\\s*\\)|${L}\\.(?=\\s)`, "g");
      re.lastIndex = i;
      let m,
        found = null;
      while ((m = re.exec(text))) {
        const before = text.slice(0, m.index);
        const atStart = /^[\s\t]*$/.test(before);
        const prev = before.replace(/[ ]+$/, "");
        const gap = before.length - prev.length;
        const ok = atStart || /\t\s*$/.test(before) || gap >= 2 || (gap >= 1 && /[.;,!?)\]…￼"”']$/.test(prev)) || (gap === 0 && /￼$/.test(prev));
        const after = text.slice(m.index + m[0].length, m.index + m[0].length + 1);
        if (ok && (after === "" || /[\s\t￼]/.test(after) || /\S/.test(after))) {
          if (!hits.length && !atStart && want === from) break;
          found = m;
          break;
        }
      }
      if (!found) break;
      hits.push({ letter: L, start: found.index, end: found.index + found[0].length });
      i = found.index + found[0].length;
      want++;
    }
    return hits;
  }

  function classifyBody(body) {
    const els = kids(body).filter((e) => !isW(e, "sectPr"));
    const groups = [];
    const warns = [];
    let g = null;
    let q = null;
    let numbered = 0;
    const newGroup = (tag) => {
      g = { tag, questions: [], pre: [] };
      groups.push(g);
      q = null;
    };
    for (const el of els) {
      if (isW(el, "p")) {
        const pcs = pieces(el);
        const text = ptext(pcs);
        const gm = RE_G.exec(text.replace(OBJ, ""));
        if (gm) {
          if (!gm[1]) newGroup(gm[2] || String(groups.length + 1));
          continue;
        }
        const ppr = child(el, "pPr");
        if (ppr && child(ppr, "numPr")) numbered++;
        const qm = RE_Q.exec(text);
        if (qm) {
          if (!g) newGroup("");
          q = { no: Number(qm[1]), els: [], first: { el, pcs: slice(pcs, qm[0].length, text.length) } };
          g.questions.push(q);
          continue;
        }
        if (!text.trim() && !pcs.some((x) => x.k === "node" && x.text !== "\n")) {
          if (q) q.els.push({ el, pcs, blank: true });
          continue;
        }
        if (q) q.els.push({ el, pcs });
        else if (g) g.pre.push(plainText(pcs));
        else warns.push({ lv: "info", msg: `Bỏ qua nội dung trước câu đầu tiên: “${plainText(pcs).slice(0, 60)}”` });
      } else if (q) q.els.push({ el, tbl: true });
      else if (isW(el, "tbl")) warns.push({ lv: "warn", msg: "Có bảng nằm ngoài câu hỏi – đã bỏ qua." });
    }
    if (numbered) warns.push({ lv: "warn", msg: `Có ${numbered} đoạn dùng đánh số tự động của Word. Nếu số câu hoặc phương án nhận ra bị thiếu, hãy gõ tay “Câu 1.”, “A.”, “a)”… thay cho đánh số tự động.` });
    return { groups: groups.filter((x) => x.questions.length), warns };
  }

  // Tách một câu: thân câu, các phương án/ý, đáp án.
  function parseQuestion(q) {
    const res = { no: q.no, stem: [{ pcs: trimPcs(q.first.pcs), el: q.first.el, first: true }], opts: [], kind: "sa", key: "", keyRed: false, notes: [], errs: [] };
    let mode = "stem"; // stem → mcq | tf
    let letters = null;
    const addOpt = (letter, pcs, el, lab) => res.opts.push({ letter, pcs: trimPcs(pcs), extra: [], el, labelRed: redShare(lab || []) >= 0.5 });
    for (const it of q.els) {
      if (it.tbl) {
        if (res.opts.length) res.opts[res.opts.length - 1].extra.push({ tbl: true, el: it.el });
        else res.stem.push({ tbl: true, el: it.el });
        continue;
      }
      const text = ptext(it.pcs);
      if (RE_KEY.test(text)) {
        const m = RE_KEY.exec(text);
        const val = slice(it.pcs, m[0].length, text.length);
        res.key = plainText(val);
        res.keyRed = redShare(val) >= 0.5 || redShare(it.pcs) > 0.4;
        res.hasKeyLine = true;
        continue;
      }
      if (it.blank) {
        if (!res.opts.length) res.stem.push({ pcs: [], el: it.el, blank: true });
        continue;
      }
      // Phương án A–D
      if (mode !== "tf") {
        const from = res.opts.length;
        const hits = findLabels(text, ["A", "B", "C", "D", "E"], from);
        if (hits.length && (from > 0 || hits[0].letter === "A") && /^[\s\t]*$/.test(text.slice(0, hits[0].start))) {
          mode = "mcq";
          hits.forEach((h, i) => addOpt(h.letter, slice(it.pcs, h.end, i + 1 < hits.length ? hits[i + 1].start : text.length), it.el, slice(it.pcs, h.start, h.end)));
          continue;
        }
      }
      if (mode !== "mcq") {
        const from = res.opts.length;
        const hits = findLabels(text, ["a", "b", "c", "d", "e"], from);
        if (hits.length && (from > 0 || hits[0].letter === "a") && /^[\s\t]*$/.test(text.slice(0, hits[0].start))) {
          mode = "tf";
          hits.forEach((h, i) => addOpt(h.letter, slice(it.pcs, h.end, i + 1 < hits.length ? hits[i + 1].start : text.length), it.el, slice(it.pcs, h.start, h.end)));
          continue;
        }
      }
      if (res.opts.length) res.opts[res.opts.length - 1].extra.push({ pcs: it.pcs, el: it.el });
      else res.stem.push({ pcs: it.pcs, el: it.el });
    }
    // Bỏ dòng trống cuối thân câu; "Câu 1." đứng riêng một dòng thì ghép dòng kế tiếp lên.
    while (res.stem.length > 1 && res.stem[res.stem.length - 1].blank) res.stem.pop();
    if (!ptext(res.stem[0].pcs).trim() && res.stem[1] && !res.stem[1].tbl && !res.stem[1].blank) res.stem.splice(0, 2, Object.assign({}, res.stem[1], { pcs: trimPcs(res.stem[1].pcs), first: true }));
    res.kind = mode === "mcq" ? "mcq" : mode === "tf" ? "tf" : "sa";
    // Đáp án
    res.opts.forEach((o) => {
      const all = o.pcs.concat(...o.extra.filter((x) => x.pcs).map((x) => x.pcs));
      o.red = o.labelRed || redShare(all) >= 0.5;
    });
    const where = `Câu ${res.no}`;
    if (res.kind === "mcq") {
      const L = res.opts.map((o) => o.letter).join("");
      if (L !== "ABCD") res.errs.push(`${where}: nhận ra ${res.opts.length} phương án (${L.split("").join(", ")}) – cần đủ A, B, C, D.`);
      const reds = res.opts.filter((o) => o.red);
      if (reds.length === 1) res.key = reds[0].letter;
      else res.errs.push(reds.length ? `${where}: có ${reds.length} phương án tô đỏ – chỉ tô đỏ 1 phương án đúng.` : `${where}: chưa tô đỏ phương án đúng.`);
      res.fixed = res.opts.some((o) => FIXED.test(plainText(o.pcs)));
      if (res.fixed) res.notes.push(`${where}: có phương án nhắc tới phương án khác (VD “Cả A và B”) – giữ nguyên thứ tự A–D của câu này.`);
    } else if (res.kind === "tf") {
      const L = res.opts.map((o) => o.letter).join("");
      if (L !== "abcd") res.errs.push(`${where}: nhận ra ${res.opts.length} ý (${L.split("").join(", ")}) – câu đúng sai cần đủ a), b), c), d).`);
      res.key = res.opts.map((o) => (o.red ? "Đ" : "S")).join("");
    } else {
      if (!res.hasKeyLine) res.notes.push(`${where}: chưa có dòng “Đáp án: …” tô đỏ – ô đáp án sẽ để trống.`);
      else if (!res.key) res.errs.push(`${where}: dòng “Đáp án:” chưa ghi đáp án.`);
      else if (!/^-?[\d,]{1,4}$/.test(res.key.replace(/\s/g, "")) || res.key.replace(/\s/g, "").length > 4)
        res.notes.push(`${where}: đáp án “${res.key}” – phiếu trả lời ngắn chỉ tô được tối đa 4 kí tự (chữ số, dấu “-”, dấu “,”).`);
      if (res.hasKeyLine && !res.keyRed) res.notes.push(`${where}: dòng “Đáp án:” chưa tô đỏ – vẫn được lấy làm đáp án và xoá khỏi đề.`);
    }
    return res;
  }

  /* ---------- Đọc đề gốc ---------- */
  async function load(file) {
    await u.loadScript("js/vendor/jszip.min.js");
    const buf = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(buf);
    const docXml = await zip.file("word/document.xml").async("string");
    const doc = parseXml(docXml);
    if (doc.getElementsByTagName("parsererror").length) throw new Error("Tệp Word bị lỗi cấu trúc, không đọc được.");
    const body = doc.getElementsByTagNameNS(W, "body")[0];
    const { groups, warns } = classifyBody(body);
    const parts = groups.map((g, gi) => {
      const qs = g.questions.map(parseQuestion);
      const count = { mcq: 0, tf: 0, sa: 0 };
      qs.forEach((q) => count[q.kind]++);
      const kind = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
      const mixed = qs.filter((q) => q.kind !== kind);
      return { tag: g.tag, kind, qs, mixed };
    });
    const errs = [];
    const notes = [];
    if (!parts.length) errs.push("Không tìm thấy câu hỏi nào. Mỗi câu cần bắt đầu bằng “Câu 1.” hoặc “Câu 1:”.");
    const tagged = groups.some((g) => g.tag);
    if (parts.length && !tagged) notes.push("Không thấy thẻ <g1>, <g2>, <g3>: cả đề được coi là một phần.");
    parts.forEach((p, i) => {
      p.qs.forEach((q) => (errs.push(...q.errs), notes.push(...q.notes)));
      if (p.mixed.length) errs.push(`Phần ${i + 1} (thẻ <g${p.tag}>) lẫn nhiều dạng câu (${p.mixed.map((q) => "Câu " + q.no).join(", ")} khác dạng) – tách ra thẻ <g> riêng.`);
    });
    warns.forEach((w) => (w.lv === "warn" ? notes : notes).push(w.msg));
    return { name: file.name, buf, docXml, parts, errs, notes, stats: parts.map((p) => ({ kind: p.kind, n: p.qs.length })) };
  }

  /* ---------- Trộn ---------- */
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const shuffle = (arr, R) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const ident = (n) => [...Array(n).keys()];
  // Kế hoạch một mã đề: thứ tự câu từng phần + hoán vị phương án/ý từng câu.
  function plan(ex, opt, R, original) {
    const parts = ex.parts.map((p) => {
      let order = original || !opt.shuffleQ ? ident(p.qs.length) : shuffle(ident(p.qs.length), R);
      // Mã trộn: thứ tự câu của mỗi phần (từ 2 câu) luôn khác đề gốc.
      for (let t = 0; !original && opt.shuffleQ && p.qs.length > 1 && order.every((x, i) => x === i) && t < 12; t++) order = shuffle(ident(p.qs.length), R);
      const perms = {};
      const used = [0, 0, 0, 0];
      order.forEach((qi) => {
        const q = p.qs[qi];
        const n = q.opts.length;
        if (original || !n) return (perms[qi] = ident(n));
        if (q.kind === "mcq") {
          if (!opt.shuffleA || q.fixed || n !== 4) return (perms[qi] = ident(n));
          const ci = q.opts.findIndex((o) => o.red);
          if (ci < 0 || !opt.balance) return (perms[qi] = shuffle(ident(n), R));
          const min = Math.min(...used);
          const cand = [0, 1, 2, 3].filter((k) => used[k] === min);
          const target = cand[Math.floor(R() * cand.length)];
          used[target]++;
          const others = shuffle(ident(n).filter((k) => k !== ci), R);
          const perm = [];
          let oi = 0;
          for (let pos = 0; pos < n; pos++) perm.push(pos === target ? ci : others[oi++]);
          return (perms[qi] = perm);
        }
        perms[qi] = opt.shuffleTF ? shuffle(ident(n), R) : ident(n);
      });
      return { order, perms };
    });
    return parts;
  }
  const sig = (pl) => pl.map((p) => p.order.join(",") + "|" + p.order.map((qi) => (p.perms[qi] || []).join("")).join(".")).join("#");
  // Đáp án theo kế hoạch.
  function keysOf(ex, pl) {
    return ex.parts.map((p, pi) =>
      pl[pi].order.map((qi) => {
        const q = p.qs[qi];
        const perm = pl[pi].perms[qi] || [];
        if (q.kind === "mcq") {
          const pos = perm.findIndex((k) => q.opts[k] && q.opts[k].red);
          return { orig: q.no, key: pos >= 0 ? "ABCD"[pos] : "" };
        }
        if (q.kind === "tf") return { orig: q.no, key: perm.map((k) => (q.opts[k].red ? "Đ" : "S")).join("") };
        return { orig: q.no, key: (q.key || "").replace(/\s+/g, "") };
      })
    );
  }

  /* ---------- Dựng tài liệu Word ---------- */
  function mk(doc) {
    const E = (name, attrs, ...ch) => {
      const [ns, tag] = name.startsWith("m:") ? [M, name] : [W, name.includes(":") ? name : "w:" + name];
      const el = doc.createElementNS(ns, tag);
      Object.entries(attrs || {}).forEach(([k, v]) => v != null && el.setAttributeNS(W, k.includes(":") ? k : "w:" + k, String(v)));
      ch.flat(Infinity).forEach((c) => c && el.appendChild(typeof c === "string" ? doc.createTextNode(c) : c));
      return el;
    };
    const T = (text) => {
      const t = E("t", null, text);
      t.setAttributeNS(XMLNS, "xml:space", "preserve");
      return t;
    };
    return { E, T };
  }

  function buildVersion(zipFiles, ex, pl, opt, code) {
    const doc = parseXml(ex.docXml);
    const body = doc.getElementsByTagNameNS(W, "body")[0];
    // Dựng lại cấu trúc trên chính tài liệu này (các nút thuộc doc mới).
    const { groups } = classifyBody(body);
    const parts = groups.map((g) => ({ qs: g.questions.map(parseQuestion) }));
    const { E, T } = mk(doc);
    const sz = String(Math.round((opt.size || 12) * 2));
    const fonts = () => E("rFonts", { ascii: FONT, hAnsi: FONT, cs: FONT, eastAsia: FONT });
    const rPr = ({ b, i, s, caps } = {}) => E("rPr", null, fonts(), b ? E("b") : null, b ? E("bCs") : null, i ? E("i") : null, i ? E("iCs") : null, caps ? E("caps") : null, E("sz", { val: s ? String(s * 2) : sz }), E("szCs", { val: s ? String(s * 2) : sz }));
    const run = (text, f) => E("r", null, rPr(f), T(text));
    const tabRun = () => E("r", null, rPr(), E("tab"));
    const TW = 11906 - (opt.mL || 1134) - (opt.mR || 851); // bề rộng vùng chữ (twip)
    const pPr = ({ jc = "both", before = 0, after = 0, left = 0, hanging = 0, first = 0, tabs, keep } = {}) =>
      E(
        "pPr",
        null,
        keep ? E("keepNext") : null,
        tabs && tabs.length ? E("tabs", null, tabs.map((t) => E("tab", { val: "left", pos: t }))) : null,
        E("spacing", { before, after, line: 240, lineRule: "auto" }),
        left || hanging || first ? E("ind", { left, hanging: hanging || null, firstLine: !hanging && first ? first : null }) : null,
        E("jc", { val: jc }),
        E("rPr", null, fonts(), E("sz", { val: sz }), E("szCs", { val: sz }))
      );
    const P = (pp, runs) => E("p", null, pPr(pp), runs);
    // Làm sạch định dạng của các mảnh: bỏ màu đỏ (đáp án), đưa về Times New Roman, cỡ chữ thống nhất.
    const cleanRPr = (rp, inMath) => {
      if (!rp) return;
      kids(rp).forEach((c) => {
        if ((isW(c, "color") && isRedHex(wAttr(c, "val"))) || (isW(c, "highlight") && /red/i.test(wAttr(c, "val"))) || (isW(c, "shd") && isRedHex(wAttr(c, "fill")))) rp.removeChild(c);
        if (inMath) return;
        if (isW(c, "rFonts") && opt.forceFont) {
          const cur = wAttr(c, "ascii") || wAttr(c, "hAnsi");
          if (!SYMBOL_FONTS.test(cur)) {
            ["asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"].forEach((a) => c.removeAttributeNS(W, a));
            ["ascii", "hAnsi", "cs", "eastAsia"].forEach((a) => c.setAttributeNS(W, "w:" + a, FONT));
          }
        }
        if ((isW(c, "sz") || isW(c, "szCs")) && opt.unifySize) rp.removeChild(c);
      });
      if (opt.forceFont && !child(rp, "rFonts") && !inMath) {
        const st = child(rp, "rStyle");
        rp.insertBefore(fonts(), st ? st.nextSibling : rp.firstChild);
      }
    };
    const cleanTree = (node) => {
      desc(node, W, "rPr").forEach((rp) => {
        let inMath = false;
        for (let a = rp.parentNode; a; a = a.parentNode) if (a.namespaceURI === M) inMath = true;
        cleanRPr(rp, inMath);
      });
      return node;
    };
    const runsOf = (pcs) =>
      pcs.map((x) => {
        if (x.k === "t") {
          const rp = x.rPr ? x.rPr.cloneNode(true) : E("rPr");
          cleanRPr(rp, false);
          return E("r", null, rp, T(x.text));
        }
        if (x.k === "tab") return tabRun();
        return cleanTree(x.node.cloneNode(true));
      });
    const jcOf = (el) => {
      const pp = child(el, "pPr");
      return pp && child(pp, "jc") ? wAttr(child(pp, "jc"), "val") : "";
    };
    const isSource = (pcs) => {
      const t = plainText(pcs);
      return t.length < 220 && (/^\(?\s*(Theo|Trích|Nguồn|Dẫn theo)\b/i.test(t) || /\b(NXB|Nxb|Nhà xuất bản|tr\.\s*\d|Sđd|tập\s*\d)/i.test(t)) && /\)?\s*[.]?$/.test(t);
    };
    const out = [];
    /* Đầu đề */
    const noBorders = () => E("tblBorders", null, ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => E(s, { val: "nil" })));
    const cell = (w, paras, borders) => E("tc", null, E("tcPr", null, E("tcW", { w, type: "dxa" }), borders ? E("tcBorders", null, ["top", "left", "bottom", "right"].map((s) => E(s, { val: "single", sz: 8, space: 0, color: "000000" }))) : null, E("vAlign", { val: "center" })), paras);
    const table = (widths, rows) =>
      E("tbl", null, E("tblPr", null, E("tblW", { w: widths.reduce((a, b) => a + b, 0), type: "dxa" }), noBorders(), E("tblLayout", { type: "fixed" }), E("tblCellMar", null, E("left", { w: 57, type: "dxa" }), E("right", { w: 57, type: "dxa" }))), E("tblGrid", null, widths.map((w) => E("gridCol", { w }))), rows);
    const fld = (instr, val, f) => {
      const fs = E("fldSimple", { instr });
      fs.appendChild(run(val, f));
      return fs;
    };
    const lw = Math.round(TW * 0.42),
      rw = TW - lw;
    const left = [
      P({ jc: "center" }, run(String(opt.so || "").toUpperCase(), { s: opt.size || 12 })),
      P({ jc: "center" }, run(String(opt.truong || "").toUpperCase(), { b: true })),
      opt.chinhThuc ? P({ jc: "center", before: 60 }, run("ĐỀ CHÍNH THỨC", { b: true })) : null,
      opt.soTrang !== false ? P({ jc: "center" }, [run("(Đề thi có ", { i: true }), fld(' NUMPAGES \\# "00" ', String(ex._pages || 2).padStart(2, "0"), { i: true }), run(" trang)", { i: true })]) : null
    ].filter(Boolean);
    const right = [
      P({ jc: "center" }, run(String(opt.ky || "").toUpperCase(), { b: true })),
      opt.namHoc ? P({ jc: "center" }, run(String(opt.namHoc), { b: true })) : null,
      P({ jc: "center" }, run(`Môn: ${String(opt.mon || "").toUpperCase()}`, { b: true })),
      P({ jc: "center" }, run(`Thời gian làm bài: ${opt.thoiGian || 45} phút, không kể thời gian phát đề`, { i: true }))
    ].filter(Boolean);
    out.push(table([lw, rw], [E("tr", null, cell(lw, left), cell(rw, right))]));
    out.push(P({ after: 0 }, run("")));
    const who = opt.who || "thí sinh";
    const boxW = 2400;
    out.push(
      table([TW - boxW, boxW], [
        E(
          "tr",
          null,
          cell(TW - boxW, [P({ jc: "left", after: 60 }, [run(`Họ, tên ${who}: `, { b: true }), run("..........................................................................")]), P({ jc: "left" }, [run(`${opt.sbd || "Số báo danh"}: `, { b: true }), run("..........................................................................")])]),
          cell(boxW, [P({ jc: "center" }, run(`Mã đề ${code}`, { b: true }))], true)
        )
      ])
    );
    /* Các phần */
    let part = 0;
    parts.forEach((p, pi) => {
      const order = pl[pi].order;
      if (!order.length) return;
      const kind = ex.parts[pi].kind;
      const n = order.length;
      const range = n === 1 ? "Thí sinh trả lời câu 1." : `Thí sinh trả lời từ câu 1 đến câu ${n}.`;
      const tail = kind === "mcq" ? " Mỗi câu hỏi thí sinh chỉ chọn một phương án." : kind === "tf" ? " Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai." : "";
      out.push(P({ before: 120, after: 60, keep: true }, [run(`PHẦN ${ROMAN[part++]}. `, { b: true }), run(range + tail, { b: true })]));
      order.forEach((qi, k) => {
        const q = p.qs[qi];
        const perm = pl[pi].perms[qi] || ident(q.opts.length);
        const label = `Câu ${k + 1}${opt.prefix === ":" ? ":" : "."}`;
        // Thân câu
        q.stem.forEach((s, si) => {
          if (s.tbl) return out.push(cleanTree(s.el.cloneNode(true)));
          if (si === 0) return out.push(P({ jc: "both", before: 60, keep: true }, [run(label, { b: true }), run(" "), runsOf(s.pcs)]));
          if (s.blank) return;
          const j = jcOf(s.el);
          if (isSource(s.pcs)) return out.push(P({ jc: "right", keep: true }, runsOf(trimPcs(s.pcs))));
          if (j === "center") return out.push(P({ jc: "center", keep: true }, runsOf(trimPcs(s.pcs))));
          out.push(P({ jc: "both", first: 567 }, runsOf(trimPcs(s.pcs))));
        });
        // Phương án / ý
        const ops = perm.map((k2) => q.opts[k2]);
        if (q.kind === "mcq") {
          const L = "ABCD";
          const longest = Math.max(...ops.map((o) => visLen(o.pcs) + (o.extra.length ? 200 : 0)));
          const indent = 284;
          const per = longest <= 16 ? 4 : longest <= 37 ? 2 : 1;
          const col = Math.floor((TW - indent) / per);
          const tabs = per > 1 ? ident(per - 1).map((i) => indent + col * (i + 1)) : null;
          for (let i = 0; i < ops.length; i += per) {
            const line = ops.slice(i, i + per);
            const runs = [];
            line.forEach((o, j) => {
              if (j) runs.push(tabRun());
              runs.push(run(`${L[i + j]}.`, { b: true }), run(" "), runsOf(o.pcs));
            });
            out.push(per === 1 ? P({ jc: "both", left: indent + 340, hanging: 340, keep: i + per < ops.length }, runs) : P({ jc: "left", left: indent, tabs, keep: i + per < ops.length }, runs));
            line.forEach((o) => o.extra.forEach((x) => out.push(x.tbl ? cleanTree(x.el.cloneNode(true)) : P({ jc: "both", left: indent + 340 }, runsOf(trimPcs(x.pcs))))));
          }
        } else if (q.kind === "tf") {
          ops.forEach((o, j) => {
            out.push(P({ jc: "both", first: 284, keep: j < ops.length - 1 }, [run(`${"abcd"[j]})`, { b: true }), run(" "), runsOf(o.pcs)]));
            o.extra.forEach((x) => out.push(x.tbl ? cleanTree(x.el.cloneNode(true)) : P({ jc: "both", first: 284 }, runsOf(trimPcs(x.pcs)))));
          });
        }
      });
    });
    out.push(P({ jc: "center", before: 240 }, run("------ HẾT ------", { b: true })));
    out.push(P({ jc: "left", before: 60 }, run(`- ${who === "học sinh" ? "Học sinh" : "Thí sinh"} không được sử dụng tài liệu;`, { i: true })));
    out.push(P({ jc: "left" }, run(`- ${opt.giamThi || "Giám thị"} không giải thích gì thêm.`, { i: true })));
    // Thay nội dung thân tài liệu
    while (body.firstChild) body.removeChild(body.firstChild);
    out.forEach((n) => body.appendChild(n));
    const sect = E(
      "sectPr",
      null,
      opt.pageNo !== false ? (() => {
        const f = E("footerReference", { type: "default" });
        f.setAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "r:id", "rIdL360Ftr");
        return f;
      })() : null,
      E("pgSz", { w: 11906, h: 16838 }),
      E("pgMar", { top: opt.mT || 851, right: opt.mR || 851, bottom: opt.mB || 851, left: opt.mL || 1134, header: 425, footer: 425, gutter: 0 }),
      E("cols", { space: 720 }),
      E("docGrid", { linePitch: 360 })
    );
    body.appendChild(sect);
    return ser(doc);
  }

  const FOOTER = (code, opt) => {
    const sz = 20;
    const r = (t, i) => `<w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>${i ? "<w:i/>" : ""}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="${W}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${r("Trang ")}<w:fldSimple w:instr=" PAGE ">${r("1")}</w:fldSimple>${r("/")}<w:fldSimple w:instr=" NUMPAGES ">${r(String(opt._pages || 2))}</w:fldSimple>${r(` – Mã đề ${esc(code)}`)}</w:p></w:ftr>`;
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Chèn chân trang + đặt phông mặc định Times New Roman vào gói Word.
  async function packVersion(ex, docXml, code, opt) {
    const zip = await window.JSZip.loadAsync(ex.buf);
    zip.file("word/document.xml", docXml);
    if (opt.pageNo !== false) {
      zip.file("word/footerL360.xml", FOOTER(code, opt));
      let rels = await zip.file("word/_rels/document.xml.rels").async("string");
      if (!/Id="rIdL360Ftr"/.test(rels))
        rels = rels.replace("</Relationships>", `<Relationship Id="rIdL360Ftr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerL360.xml"/></Relationships>`);
      zip.file("word/_rels/document.xml.rels", rels);
      let ct = await zip.file("[Content_Types].xml").async("string");
      if (!/footerL360\.xml/.test(ct)) ct = ct.replace("</Types>", `<Override PartName="/word/footerL360.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
      zip.file("[Content_Types].xml", ct);
    }
    const st = zip.file("word/styles.xml");
    if (st) {
      const sdoc = parseXml(await st.async("string"));
      const { E } = mk(sdoc);
      const root = sdoc.documentElement;
      let dd = kids(root).find((c) => isW(c, "docDefaults"));
      if (!dd) root.insertBefore((dd = E("docDefaults")), root.firstChild);
      let rpd = child(dd, "rPrDefault");
      if (!rpd) dd.insertBefore((rpd = E("rPrDefault")), dd.firstChild);
      let rp = child(rpd, "rPr");
      if (!rp) rpd.appendChild((rp = E("rPr")));
      kids(rp).forEach((c) => (isW(c, "rFonts") || isW(c, "sz") || isW(c, "szCs")) && rp.removeChild(c));
      const rs = child(rp, "rStyle");
      rp.insertBefore(E("rFonts", { ascii: FONT, hAnsi: FONT, cs: FONT, eastAsia: FONT }), rs ? rs.nextSibling : rp.firstChild);
      // sz/szCs phải đứng trước highlight, u, …, lang (đúng thứ tự lược đồ Word)
      const AFTER = ["highlight", "u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath"];
      const ref = kids(rp).find((c) => c.namespaceURI === W && AFTER.includes(c.localName)) || null;
      rp.insertBefore(E("sz", { val: String((opt.size || 12) * 2) }), ref);
      rp.insertBefore(E("szCs", { val: String((opt.size || 12) * 2) }), ref);
      // Kiểu Normal: bỏ phông/cỡ riêng để theo mặc định
      kids(root)
        .filter((s) => isW(s, "style") && wAttr(s, "styleId") === "Normal")
        .forEach((s) => {
          const r = child(s, "rPr");
          if (r) kids(r).forEach((c) => (isW(c, "rFonts") || isW(c, "sz") || isW(c, "szCs")) && r.removeChild(c));
        });
      zip.file("word/styles.xml", ser(sdoc));
    }
    const stg = zip.file("word/settings.xml");
    if (stg) {
      const x = await stg.async("string");
      zip.file("word/settings.xml", x.replace(/<w:zoom(?![^>]*w:percent)([^>]*?)\/>/, '<w:zoom$1 w:percent="100"/>'));
    }
    return gen(zip);
  }
  // Nén lại không kèm mục thư mục rỗng (OneDrive/Google Drive báo lỗi với các mục này).
  function gen(zip, type = "uint8array") {
    Object.keys(zip.files).forEach((k) => zip.files[k].dir && delete zip.files[k]);
    return zip.generateAsync({ type, compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  /* ---------- Tài liệu đáp án (Word, dựng mới) ---------- */
  function answerDocx(ex, versions, opt) {
    const r = (t, f = {}) =>
      `<w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}" w:eastAsia="${FONT}"/>${f.b ? "<w:b/><w:bCs/>" : ""}${f.i ? "<w:i/><w:iCs/>" : ""}${f.color ? `<w:color w:val="${f.color}"/>` : ""}<w:sz w:val="${(f.s || 12) * 2}"/><w:szCs w:val="${(f.s || 12) * 2}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
    const p = (runs, { jc = "left", before = 0, after = 0, keep, shade } = {}) =>
      `<w:p><w:pPr>${keep ? "<w:keepNext/>" : ""}${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ""}<w:spacing w:before="${before}" w:after="${after}" w:line="240" w:lineRule="auto"/><w:jc w:val="${jc}"/></w:pPr>${runs}</w:p>`;
    const TW = 11906 - 1134 - 851;
    const tc = (w, text, f = {}) =>
      `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${f.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${f.fill}"/>` : ""}<w:vAlign w:val="center"/></w:tcPr>${p(r(text, f), { jc: f.jc || "center" })}</w:tc>`;
    const tbl = (widths, rows) =>
      `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="8A97AB"/>`).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
    const tr = (cells, head) => `<w:tr>${head ? "<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>" : "<w:trPr><w:cantSplit/></w:trPr>"}${cells.join("")}</w:tr>`;
    const H = (t) => p(r(t, { b: true, s: 13, color: "1F3864" }), { before: 240, after: 80, keep: true });
    const body = [];
    body.push(
      tbl([Math.round(TW * 0.42), TW - Math.round(TW * 0.42)], [
        `<w:tr><w:tc><w:tcPr><w:tcW w:w="${Math.round(TW * 0.42)}" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders></w:tcPr>${p(r(String(opt.so || "").toUpperCase()), { jc: "center" })}${p(r(String(opt.truong || "").toUpperCase(), { b: true }), { jc: "center" })}</w:tc><w:tc><w:tcPr><w:tcW w:w="${TW - Math.round(TW * 0.42)}" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders></w:tcPr>${p(r(String(opt.ky || "").toUpperCase(), { b: true }), { jc: "center" })}${opt.namHoc ? p(r(opt.namHoc, { b: true }), { jc: "center" }) : ""}${p(r(`Môn: ${String(opt.mon || "").toUpperCase()}`, { b: true }), { jc: "center" })}</w:tc></w:tr>`
      ])
    );
    body.push(p(r("ĐÁP ÁN", { b: true, s: 16, color: "1F3864" }), { jc: "center", before: 240 }));
    body.push(p(r(`Gồm ${versions.length} mã đề: ${versions.map((v) => v.code + (v.original ? " (đề gốc)" : "")).join(", ")}`, { i: true }), { jc: "center", after: 120 }));
    const names = { mcq: "Câu trắc nghiệm nhiều phương án lựa chọn", tf: "Câu trắc nghiệm đúng sai", sa: "Câu trắc nghiệm trả lời ngắn" };
    let part = 0;
    ex.parts.forEach((pt, pi) => {
      const n = pt.qs.length;
      if (!n) return;
      body.push(H(`PHẦN ${ROMAN[part++]}. ${names[pt.kind]} (${n} câu)`));
      const per = pt.kind === "mcq" ? 12 : pt.kind === "tf" ? 6 : 8;
      for (let s = 0; s < n; s += per) {
        const cols = ident(Math.min(per, n - s)).map((i) => s + i);
        const first = 1400;
        const w = Math.floor((TW - first) / per);
        const rows = [tr([tc(first, "Mã đề", { b: true, fill: "DCE6F2" }), ...cols.map((i) => tc(w, `Câu ${i + 1}`, { b: true, fill: "DCE6F2", s: 11 }))], true)];
        versions.forEach((v, vi) => rows.push(tr([tc(first, v.code, { b: true, fill: vi % 2 ? "F7F9FC" : null }), ...cols.map((i) => tc(w, v.keys[pi][i].key || "", { b: true, fill: vi % 2 ? "F7F9FC" : null, s: pt.kind === "tf" ? 11 : 12 }))])));
        body.push(tbl([first, ...cols.map(() => w)], rows));
        body.push(p("", { after: 60 }));
      }
      if (pt.kind === "tf") body.push(p(r("Kí hiệu: Đ – đúng, S – sai; theo thứ tự ý a), b), c), d) của mã đề đó.", { i: true, s: 11 }), { after: 60 }));
    });
    // Bảng đối chiếu: câu của mã đề ← câu trong đề gốc
    body.push(H("BẢNG ĐỐI CHIẾU VỚI ĐỀ GỐC"));
    body.push(p(r("Mỗi ô ghi số thứ tự của câu đó trong đề gốc (VD: ô Câu 1 ghi 7 nghĩa là Câu 1 của mã đề là Câu 7 của đề gốc).", { i: true, s: 11 }), { after: 80 }));
    part = 0;
    ex.parts.forEach((pt, pi) => {
      const n = pt.qs.length;
      if (!n) return;
      body.push(p(r(`Phần ${ROMAN[part++]}`, { b: true }), { before: 80, after: 40, keep: true }));
      const per = 15;
      for (let s = 0; s < n; s += per) {
        const cols = ident(Math.min(per, n - s)).map((i) => s + i);
        const first = 1400;
        const w = Math.floor((TW - first) / per);
        const rows = [tr([tc(first, "Mã đề", { b: true, fill: "EEF2F7", s: 11 }), ...cols.map((i) => tc(w, String(i + 1), { b: true, fill: "EEF2F7", s: 11 }))], true)];
        versions.forEach((v) => rows.push(tr([tc(first, v.code, { s: 11 }), ...cols.map((i) => tc(w, String(v.keys[pi][i].orig), { s: 11 }))])));
        body.push(tbl([first, ...cols.map(() => w)], rows));
        body.push(p("", { after: 40 }));
      }
    });
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join("")}<w:sectPr><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="851" w:right="851" w:bottom="851" w:left="1134" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="${W}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${r("Đáp án – trang ", { i: true, s: 10 })}<w:fldSimple w:instr=" PAGE ">${r("1", { i: true, s: 10 })}</w:fldSimple></w:p></w:ftr>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}" w:eastAsia="${FONT}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
    const z = new window.JSZip();
    z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
    z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    z.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`);
    z.file("word/document.xml", doc);
    z.file("word/styles.xml", styles);
    z.file("word/footer1.xml", footer);
    return gen(z);
  }

  // Đáp án TN Maker 2025: cột "Câu\Mã Đề", mỗi cột một mã đề; các phần nối tiếp, mỗi phần đánh số lại từ 1.
  async function tnmakerXlsx(ex, versions) {
    await u.loadScript("js/vendor/xlsx.full.min.js");
    const X = window.XLSX;
    const aoa = [["Câu\\Mã Đề", ...versions.map((v) => String(v.code))]];
    ex.parts.forEach((pt, pi) => pt.qs.forEach((_, i) => aoa.push([String(i + 1), ...versions.map((v) => String(v.keys[pi][i].key || ""))])));
    const wb = X.utils.book_new();
    const mkSheet = () => {
      const sh = X.utils.aoa_to_sheet(aoa);
      sh["!cols"] = [{ wch: 12 }, ...versions.map(() => ({ wch: 9 }))];
      return sh;
    };
    X.utils.book_append_sheet(wb, mkSheet(), "Sheet1");
    X.utils.book_append_sheet(wb, mkSheet(), "Sheet2");
    return new Uint8Array(X.write(wb, { type: "array", bookType: "xlsx" }));
  }

  /* ---------- Mã đề ---------- */
  function makeCodes(opt, R) {
    const n = Math.max(1, Math.min(48, Number(opt.count) || 4));
    const digits = Number(opt.digits) === 4 ? 4 : 3;
    let list = [];
    if (opt.codeMode === "list")
      list = String(opt.codeList || "")
        .split(/[\s,;]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    else if (opt.codeMode === "seq") {
      const start = Number(opt.codeStart) || (digits === 4 ? 101 : 101);
      list = ident(n).map((i) => String(start + i).padStart(digits, "0"));
    } else {
      const set = new Set();
      const lo = digits === 4 ? 101 : 101,
        hi = digits === 4 ? 9999 : 999;
      while (set.size < n) set.add(String(lo + Math.floor(R() * (hi - lo + 1))).padStart(digits, "0"));
      list = [...set].sort();
    }
    const orig = String(opt.origCode || "".padStart(digits, "0")).trim();
    return { codes: [...new Set(list)].filter((c) => c !== orig).slice(0, opt.codeMode === "list" ? 48 : n), orig };
  }

  const slugName = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((w) => (/^[IVX]+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join("");

  // Ước lượng số trang (giá trị hiển thị tạm, Word/LibreOffice tự cập nhật trường NUMPAGES khi mở).
  function estimatePages(ex) {
    let lines = 12;
    ex.parts.forEach((p) => {
      lines += 2;
      p.qs.forEach((q) => {
        q.stem.forEach((s) => (lines += s.tbl ? 6 : Math.max(1, Math.ceil(visLen(s.pcs || []) / 90))));
        if (q.kind === "mcq") {
          const longest = Math.max(...q.opts.map((o) => visLen(o.pcs)));
          lines += longest <= 16 ? 1 : longest <= 37 ? 2 : q.opts.reduce((a, o) => a + Math.max(1, Math.ceil(visLen(o.pcs) / 85)), 0);
        } else lines += q.opts.reduce((a, o) => a + Math.max(1, Math.ceil(visLen(o.pcs) / 88)), 0);
      });
    });
    return Math.max(1, Math.ceil(lines / 50));
  }

  /* ---------- Trộn toàn bộ → ZIP ---------- */
  async function run(ex, opt, onProgress) {
    await u.loadScript("js/vendor/jszip.min.js");
    const R = rng(Number(opt.seed) || (Date.now() ^ Math.floor(Math.random() * 1e9)));
    const { codes, orig } = makeCodes(opt, R);
    ex._pages = estimatePages(ex);
    opt._pages = ex._pages;
    const versions = [{ code: orig, original: true, plan: plan(ex, opt, R, true) }];
    const seen = new Set([sig(versions[0].plan)]);
    codes.forEach((code) => {
      let pl,
        tries = 0;
      do pl = plan(ex, opt, R, false);
      while (seen.has(sig(pl)) && ++tries < 30);
      seen.add(sig(pl));
      versions.push({ code, plan: pl });
    });
    versions.forEach((v) => (v.keys = keysOf(ex, v.plan)));
    const base = [slugName(opt.mon) || "De", slugName(opt.ky)].filter(Boolean).join("_");
    const out = new window.JSZip();
    let i = 0;
    for (const v of versions) {
      onProgress && onProgress(++i, versions.length + 2, v.code);
      const xml = buildVersion(null, ex, v.plan, opt, v.code);
      const bytes = await packVersion(ex, xml, v.code, opt);
      v.file = v.original ? `00_De_goc_Ma_${v.code}_${base}.docx` : `De_Ma_${v.code}_${base}.docx`;
      out.file(v.file, bytes);
      await new Promise((r) => setTimeout(r, 0));
    }
    onProgress && onProgress(versions.length + 1, versions.length + 2, "đáp án");
    out.file(`Dap_an_TNMaker_${base}.xlsx`, await tnmakerXlsx(ex, versions));
    out.file(`Dap_an_${base}.docx`, await answerDocx(ex, versions, opt));
    out.file(`Tep_tai_len/${ex.name}`, ex.buf);
    onProgress && onProgress(versions.length + 2, versions.length + 2, "nén");
    const blob = await out.generateAsync({ type: "blob", compression: "DEFLATE" });
    return { blob, name: `Tron_de_${base || "De"}_${versions.length - 1}_ma.zip`, versions };
  }

  L360.TronDe = { load, run, parseXml, _test: { findLabels, isRedHex, plan, keysOf, estimatePages } };
})();
