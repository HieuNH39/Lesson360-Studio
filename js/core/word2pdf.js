/* Chuyển Word (.docx) sang PDF ngay trên trình duyệt – không tải tệp lên máy chủ nào.
   1) docx-preview dựng tài liệu thành trang (khổ giấy, lề, bảng, đánh số, ảnh, đầu/chân trang theo tệp Word);
   2) vẽ lại từng trang thành PDF dạng chữ (chọn, tìm kiếm được) bằng jsPDF, phông tương đương cùng kích thước chữ
      (Times New Roman → Liberation Serif, Arial → Liberation Sans, Calibri → Carlito);
   3) tuỳ chọn đặt mật khẩu mở tệp (AES-256) bằng qpdf. Cũng đặt được mật khẩu cho tệp PDF có sẵn. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const K = 0.75; // px → pt
  const FAMS = {
    serif: ["L360Serif", "LiberationSerif"],
    sans: ["L360Sans", "LiberationSans"],
    calibri: ["L360Calibri", "Carlito"],
    mono: ["L360Mono", "LiberationMono"]
  };
  const STY = [
    ["normal", "Regular", "400", "normal"],
    ["bold", "Bold", "700", "normal"],
    ["italic", "Italic", "400", "italic"],
    ["bolditalic", "BoldItalic", "700", "italic"]
  ];
  const BY_CSS = Object.fromEntries(Object.entries(FAMS).map(([k, v]) => [v[0].toLowerCase(), k]));
  // Phông trong tệp Word → nhóm phông tương đương (cùng số đo chữ).
  function famKey(ff) {
    const n = String(ff || "")
      .split(",")[0]
      .replace(/["']/g, "")
      .trim()
      .toLowerCase();
    if (BY_CSS[n]) return BY_CSS[n];
    if (/calibri|carlito|candara|corbel|aptos/.test(n)) return "calibri";
    if (/courier|consolas|mono|lucida console/.test(n)) return "mono";
    if (/arial|helvetica|tahoma|verdana|segoe|sans|roboto|open sans|calibri light|be vietnam|vni-helve|\.vnarial/.test(n)) return "sans";
    return "serif";
  }
  // Kí tự phông Symbol/Wingdings (vùng riêng U+F0xx) → kí tự thường tương đương.
  const PUA = { b7: "•", a7: "▪", d8: "►", "76": "❖", fc: "✓", a8: "□", "6e": "■", "71": "❑", "75": "◆", "7f": "○", d7: "►", e0: "→", e8: "➔", "9f": "•", a1: "○", "6c": "●", "70": "◆", "2d": "-" };
  const fixPua = (s) => s.replace(/[-]/g, (c) => PUA[(c.charCodeAt(0) & 0xff).toString(16)] || "•");

  /* ---------- Phông chữ ---------- */
  const buf = {};
  const fontFile = (name) =>
    (buf[name] =
      buf[name] ||
      fetch(`assets/fonts/${name}.ttf`).then((r) => {
        if (!r.ok) throw new Error("Không tải được phông chữ " + name + ".");
        return r.arrayBuffer();
      }));
  const cssDone = new Set();
  async function cssFonts(keys) {
    const jobs = [];
    keys.forEach((k) =>
      STY.forEach((st) => {
        const id = k + st[0];
        if (cssDone.has(id)) return;
        cssDone.add(id);
        jobs.push(
          fontFile(`${FAMS[k][1]}-${st[1]}`).then(async (ab) => {
            const ff = new FontFace(FAMS[k][0], ab.slice(0), { weight: st[2], style: st[3] });
            await ff.load();
            document.fonts.add(ff);
          })
        );
      })
    );
    await Promise.all(jobs);
    await document.fonts.ready;
  }
  function b64(ab) {
    const b = new Uint8Array(ab);
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function pdfFonts(doc, keys) {
    for (const k of keys)
      for (const st of STY) {
        const file = `${FAMS[k][1]}-${st[1]}.ttf`;
        doc.addFileToVFS(file, b64(await fontFile(`${FAMS[k][1]}-${st[1]}`)));
        doc.addFont(file, FAMS[k][0], st[0]);
      }
  }
  let fallbackOn = false;
  async function fallbackFont(doc) {
    if (fallbackOn === doc) return;
    doc.addFileToVFS("DejaVuSans.ttf", b64(await fontFile("DejaVuSans")));
    doc.addFont("DejaVuSans.ttf", "L360Sym", "normal");
    fallbackOn = doc;
  }
  const has = (doc, fam, st, cp) => {
    try {
      const m = doc.internal.getFont(fam, st).metadata;
      return !!(m && m.cmap && m.cmap.unicode && m.cmap.unicode.codeMap[cp]);
    } catch (e) {
      return false;
    }
  };

  /* ---------- Màu, kiểu ---------- */
  function color(c) {
    const m = String(c || "").match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  const styleKey = (cs) => {
    const b = (parseInt(cs.fontWeight, 10) || 400) >= 600;
    const i = /italic|oblique/.test(cs.fontStyle);
    return b && i ? "bolditalic" : b ? "bold" : i ? "italic" : "normal";
  };
  // Đường chân chữ: canvas cho biết độ cao phần trên chữ của phông đúng như trình duyệt dùng.
  const ctx2d = document.createElement("canvas").getContext("2d");
  const ascCache = {};
  function ascent(fam, cs) {
    const key = `${fam}|${cs.fontWeight}|${cs.fontStyle}|${cs.fontSize}`;
    if (ascCache[key] == null) {
      ctx2d.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} "${FAMS[fam][0]}"`;
      const m = ctx2d.measureText("Hg");
      ascCache[key] = m.fontBoundingBoxAscent != null ? m.fontBoundingBoxAscent : parseFloat(cs.fontSize) * 0.891;
    }
    return ascCache[key];
  }

  /* ---------- Đánh số, gạch đầu dòng (docx-preview dùng bộ đếm CSS) → chữ thật ---------- */
  const ROMAN = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  const roman = (n) => ROMAN.reduce((s, [v, r]) => {
    while (n >= v) (s += r), (n -= v);
    return s;
  }, "");
  const alpha = (n) => {
    let s = "";
    while (n > 0) (n--, (s = String.fromCharCode(97 + (n % 26)) + s), (n = Math.floor(n / 26)));
    return s;
  };
  function fmt(n, t) {
    switch (t) {
      case "decimal-leading-zero":
        return n < 10 ? "0" + n : String(n);
      case "lower-alpha":
      case "lower-latin":
        return alpha(n);
      case "upper-alpha":
      case "upper-latin":
        return alpha(n).toUpperCase();
      case "lower-roman":
        return roman(n);
      case "upper-roman":
        return roman(n).toUpperCase();
      case "none":
        return "";
      case "disc":
        return "•";
      case "circle":
        return "◦";
      case "square":
        return "▪";
      default:
        return String(n);
    }
  }
  const unesc = (s) => s.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (m, h, ch) => (h ? String.fromCodePoint(parseInt(h, 16)) : ch));
  function evalContent(c, counters) {
    let out = "";
    const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|counter\(\s*([\w-]+)\s*(?:,\s*([\w-]+)\s*)?\)/g;
    let m;
    while ((m = re.exec(c))) out += m[3] ? fmt(counters[m[3]] || 0, m[4] || "decimal") : unesc(m[1] != null ? m[1] : m[2]);
    return out;
  }
  const pairs = (v) => {
    const out = [];
    const t = String(v || "").trim().split(/\s+/);
    for (let i = 0; i < t.length; i++) {
      if (!/^[\w-]+$/.test(t[i]) || t[i] === "none") continue;
      const n = Number(t[i + 1]);
      if (!isNaN(n) && t[i + 1] != null) (out.push([t[i], n]), i++);
      else out.push([t[i], null]);
    }
    return out;
  };
  function numbering(root) {
    const before = {};
    const set = {};
    const counters = {};
    [...document.styleSheets].forEach((sh) => {
      if (!sh.ownerNode || !root.contains(sh.ownerNode)) return;
      let rs;
      try {
        rs = sh.cssRules;
      } catch (e) {
        return;
      }
      [...rs].forEach((r) => {
        if (!r.selectorText) return;
        const st = r.style;
        if (st.counterReset && st.counterReset !== "none") pairs(st.counterReset).forEach(([n, v]) => (counters[n] = v == null ? 0 : v));
        r.selectorText.split(",").forEach((sel) => {
          sel = sel.trim();
          let m = sel.match(/^p\.([\w-]+)::?before$/);
          if (m && st.content && /counter\(|"|'/.test(st.content) && !/^["']\s*["']$/.test(st.content.trim())) before[m[1]] = { c: st.content, inc: pairs(st.counterIncrement) };
          m = sel.match(/^p\.([\w-]+)$/);
          if (m && st.counterSet && st.counterSet !== "none") set[m[1]] = pairs(st.counterSet);
        });
      });
    });
    if (!Object.keys(before).length) return 0;
    let n = 0;
    root.querySelectorAll("p").forEach((p) => {
      let rule = null;
      p.classList.forEach((c) => {
        (set[c] || []).forEach(([k, v]) => (counters[k] = v == null ? 0 : v));
        if (before[c]) rule = before[c];
      });
      if (!rule) return;
      rule.inc.forEach(([k, v]) => (counters[k] = (counters[k] || 0) + (v == null ? 1 : v)));
      const bs = getComputedStyle(p, "::before");
      if (bs.content === "none" || bs.display === "none") return;
      let text = evalContent(rule.c, counters);
      const sp = document.createElement("span");
      sp.className = "l360-num";
      ["fontFamily", "fontSize", "fontWeight", "fontStyle", "color", "textDecoration", "letterSpacing"].forEach((k) => (sp.style[k] = bs[k]));
      // Hậu tố tab của số thứ tự: chiếm đúng phần thụt treo như Word (chữ thẳng hàng sau số).
      const ti = parseFloat(getComputedStyle(p).textIndent) || 0;
      if (/\t$/.test(text)) {
        text = text.replace(/\t+$/, "");
        if (ti < -1) (sp.style.display = "inline-block"), (sp.style.minWidth = -ti + "px");
        else text += " ";
      }
      sp.textContent = text;
      p.insertBefore(sp, p.firstChild);
      p.classList.add("l360-nb");
      n++;
    });
    const css = document.createElement("style");
    css.textContent = ".l360-nb::before{content:none!important;display:none!important}";
    root.appendChild(css);
    return n;
  }

  /* ---------- Phông/cỡ chữ mặc định của tài liệu (docDefaults): docx-preview gán cho mọi đoạn chạy (.docx span) nên đè lên
     phông của kiểu đoạn văn (Normal…). Word: kiểu đoạn văn ưu tiên hơn mặc định → chuyển mặc định lên phần tử gốc để kế thừa. ---------- */
  function fixDefaults(root) {
    [...document.styleSheets].forEach((sh) => {
      if (!sh.ownerNode || !root.contains(sh.ownerNode)) return;
      let rs;
      try {
        rs = sh.cssRules;
      } catch (e) {
        return;
      }
      [...rs].forEach((r) => {
        if (!r.selectorText || !/^\.docx span$/.test(r.selectorText.trim())) return;
        const keep = [];
        ["font-family", "font-size", "color", "font-weight", "font-style", "letter-spacing"].forEach((k) => {
          const v = r.style.getPropertyValue(k);
          if (v) (keep.push(`${k}:${v}`), r.style.removeProperty(k));
        });
        if (keep.length) sh.insertRule(`section.docx{${keep.join(";")}}`, 0);
      });
    });
  }

  /* ---------- Giãn dòng "bội số" (lineRule auto): Word nhân với chiều cao dòng tự nhiên của phông, không phải cỡ chữ ---------- */
  const NATURAL = { serif: 1.149, sans: 1.149, calibri: 1.22, mono: 1.133 };
  function fixLineHeights(root) {
    const num = (v) => (/^\d*\.?\d+$/.test(String(v || "").trim()) ? parseFloat(v) : null);
    [...document.styleSheets].forEach((sh) => {
      if (!sh.ownerNode || !root.contains(sh.ownerNode)) return;
      let rs;
      try {
        rs = sh.cssRules;
      } catch (e) {
        return;
      }
      [...rs].forEach((r) => {
        const v = r.style && num(r.style.lineHeight);
        if (v) r.style.lineHeight = (v * NATURAL[famKey(r.style.fontFamily || "Times New Roman")]).toFixed(3);
      });
    });
    root.querySelectorAll("[style]").forEach((el) => {
      const v = num(el.style.lineHeight);
      if (v) el.style.lineHeight = (v * NATURAL[famKey(getComputedStyle(el).fontFamily)]).toFixed(3);
    });
  }

  /* ---------- Trường số trang (PAGE, NUMPAGES): thay bằng dấu giữ chỗ, điền số thật khi vẽ ---------- */
  const TOK = { P: "@@P@@", N: "@@N@@" };
  const fieldKind = (ins) => {
    const k = String(ins || "").trim().split(/\s+/)[0].toUpperCase();
    return k === "PAGE" ? "P" : k === "NUMPAGES" || k === "SECTIONPAGES" ? "N" : "";
  };
  function fixFields(xml) {
    // Một đoạn chạy (run) chứa cả mã trường lẫn chữ (như tệp do docx-js tạo): tách thành nhiều đoạn chạy cùng định dạng.
    xml = xml.replace(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g, (run, attrs, body) => {
      if (!/<w:(fldChar|instrText)\b/.test(body)) return run;
      const rpr = (body.match(/^\s*<w:rPr>[\s\S]*?<\/w:rPr>/) || [""])[0];
      const parts = body.slice(rpr.length).match(/<w:(?:fldChar|tab|br|cr|noBreakHyphen|softHyphen|sym)\b[^>]*\/>|<w:(instrText|t|delText)\b[^>]*>[\s\S]*?<\/w:\1>|<w:(?:instrText|t)\b[^>]*\/>/g) || [];
      return parts.length > 1 ? parts.map((x) => `<w:r${attrs}>${rpr.trim()}${x}</w:r>`).join("") : run;
    });
    xml = xml.replace(/<w:fldSimple\b([^>]*?)(?:\/>|>([\s\S]*?)<\/w:fldSimple>)/g, (m, attrs, inner) => {
      const k = fieldKind(((attrs || "").match(/w:instr="([^"]*)"/) || [])[1]);
      inner = inner || "";
      if (!k) return inner;
      let done = false;
      const out = inner.replace(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g, () => (done ? "<w:t></w:t>" : ((done = true), `<w:t xml:space="preserve">${TOK[k]}</w:t>`)));
      return done ? out : `<w:r><w:t>${TOK[k]}</w:t></w:r>`;
    });
    // Trường phức (fldChar begin – instrText – separate – kết quả – end).
    const stack = [];
    return xml.replace(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g, (run) => {
      let out = run;
      const top = stack[stack.length - 1];
      if (/w:fldCharType="begin"/.test(run)) stack.push({ ins: "", res: false, put: false, rpr: (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [""])[0] });
      const cur = stack[stack.length - 1];
      if (cur) {
        const it = run.match(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/);
        if (it) cur.ins += it[1];
        if (/w:fldCharType="separate"/.test(run)) cur.res = true;
        else if (cur.res && top === cur && !/w:fldChar/.test(run) && fieldKind(cur.ins)) {
          out = run.replace(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g, () => (cur.put ? "<w:t></w:t>" : ((cur.put = true), `<w:t xml:space="preserve">${TOK[fieldKind(cur.ins)]}</w:t>`)));
        }
        if (/w:fldCharType="end"/.test(run)) {
          stack.pop();
          if (fieldKind(cur.ins) && !cur.put) out = `<w:r>${cur.rpr}<w:t>${TOK[fieldKind(cur.ins)]}</w:t></w:r>` + run;
        }
      }
      return out;
    });
  }
  async function prepare(ab) {
    try {
      const zip = await window.JSZip.loadAsync(ab);
      const names = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*|styles|numbering)\.xml$/.test(n));
      let changed = false;
      for (const n of names) {
        const x = await zip.file(n).async("string");
        // Chuẩn Word: thiếu lineRule nghĩa là "auto" (bội số dòng) – docx-preview lại hiểu là "chính xác".
        let y = x.replace(/<w:spacing\b(?![^>]*w:lineRule)([^>]*\bw:line="\d+"[^>]*?)(\/?)>/g, '<w:spacing$1 w:lineRule="auto"$2>');
        if (/PAGE|NUMPAGES/.test(y)) y = fixFields(y);
        if (y !== x) (zip.file(n, y), (changed = true));
      }
      return changed ? await zip.generateAsync({ type: "arraybuffer" }) : ab;
    } catch (e) {
      return ab;
    }
  }
  // Dấu giữ chỗ trong trang → ô số trang (rộng bằng 2 chữ số) để dàn trang đúng.
  function markFields(root) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    for (let t = tw.nextNode(); t; t = tw.nextNode()) if (/@@[PN]@@/.test(t.nodeValue)) list.push(t);
    list.forEach((t) => {
      const frag = document.createDocumentFragment();
      t.nodeValue.split(/(@@[PN]@@)/).forEach((part) => {
        const m = part.match(/^@@([PN])@@$/);
        if (m) {
          const sp = document.createElement("span");
          sp.dataset.fld = m[1];
          sp.textContent = "00";
          frag.appendChild(sp);
        } else if (part) frag.appendChild(document.createTextNode(part));
      });
      t.parentNode.replaceChild(frag, t);
    });
  }

  /* ---------- Thu thập hình vẽ của một trang ---------- */
  const SIDES = [
    ["Top", (r, w) => [r.left, r.top + w / 2, r.right, r.top + w / 2]],
    ["Bottom", (r, w) => [r.left, r.bottom - w / 2, r.right, r.bottom - w / 2]],
    ["Left", (r, w) => [r.left + w / 2, r.top, r.left + w / 2, r.bottom]],
    ["Right", (r, w) => [r.right - w / 2, r.top, r.right - w / 2, r.bottom]]
  ];
  async function rasterize(el, w, h) {
    try {
      let src;
      if (el.tagName === "IMG") {
        src = el.currentSrc || el.src;
        if (!el.naturalWidth) return null;
        if (/^data:image\/(png|jpe?g)/i.test(src)) return { data: src, fmt: /png/i.test(src.slice(0, 20)) ? "PNG" : "JPEG" };
      } else if (el.tagName === "CANVAS") return { data: el.toDataURL("image/png"), fmt: "PNG" };
      else {
        const x = new XMLSerializer().serializeToString(el);
        src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(x);
      }
      const im = new Image();
      await new Promise((r) => ((im.onload = r), (im.onerror = r), (im.src = src)));
      if (!im.naturalWidth && el.tagName === "IMG") return null;
      const c = document.createElement("canvas");
      const sc = Math.min(3, Math.max(1.5, 1600 / Math.max(1, w)));
      c.width = Math.max(1, Math.round(w * sc));
      c.height = Math.max(1, Math.round(h * sc));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      return { data: c.toDataURL("image/png"), fmt: "PNG" };
    } catch (e) {
      return null;
    }
  }
  async function collect(sec, doc) {
    const R = sec.getBoundingClientRect();
    const X = (x) => x - R.left;
    const Y = (y) => y - R.top;
    const items = [];
    const cells = [];
    const csOf = new Map();
    const css = (el) => {
      let c = csOf.get(el);
      if (!c) csOf.set(el, (c = getComputedStyle(el)));
      return c;
    };
    const imgs = [];
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
        const t = n.tagName;
        if (t === "STYLE" || t === "SCRIPT" || t === "TEMPLATE") return NodeFilter.FILTER_REJECT;
        const cs = css(n);
        if (cs.display === "none" || cs.visibility === "hidden") return NodeFilter.FILTER_REJECT;
        if (n.namespaceURI === "http://www.w3.org/2000/svg" && t.toLowerCase() !== "svg") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const range = document.createRange();
    const regionOf = (node) => {
      const e = node.nodeType === 1 ? node : node.parentElement;
      return e && e.closest("footer") && sec.contains(e.closest("footer")) ? "f" : e && e.closest("header") && sec.contains(e.closest("header")) ? "h" : "";
    };
    const push = (node, it) => ((it.rg = regionOf(node)), items.push(it));
    let n = walker.nextNode();
    while (n) {
      if (n.nodeType === 1) {
        const el = n;
        const cs = css(el);
        const inline = cs.display === "inline";
        const bg = color(cs.backgroundColor);
        if (bg && bg.a > 0.02 && el !== sec) {
          const rs = inline ? [...el.getClientRects()] : [el.getBoundingClientRect()];
          rs.forEach((r) => r.width > 0 && r.height > 0 && push(el, { t: "rect", x: X(r.left), y: Y(r.top), w: r.width, h: r.height, c: bg, top: Y(r.top), bottom: Y(r.bottom) }));
        }
        if (!inline && el !== sec) {
          const r = el.getBoundingClientRect();
          let border = null;
          SIDES.forEach(([s, f]) => {
            const w = parseFloat(cs[`border${s}Width`]) || 0;
            const st = cs[`border${s}Style`];
            const c = color(cs[`border${s}Color`]);
            if (w > 0 && st !== "none" && st !== "hidden" && c && c.a > 0.05) {
              const [x1, y1, x2, y2] = f(r, w);
              const ln = { t: "line", x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), w, c, dash: st === "dashed" ? [3 * w, 2 * w] : st === "dotted" ? [w, w] : null, top: Y(Math.min(y1, y2)) - w, bottom: Y(Math.max(y1, y2)) + w };
              push(el, ln);
              border = border || {};
              border[s] = ln;
            }
          });
          // Ô bảng: khi bảng sang trang, kẻ thêm đường đóng ô ở mép trang.
          if (/^(TD|TH)$/.test(el.tagName) && border) cells.push({ x1: X(r.left), x2: X(r.right), top: Y(r.top), bottom: Y(r.bottom), b: border.Bottom || border.Top, t: border.Top || border.Bottom });
        }
        const tag = el.tagName.toLowerCase();
        if (tag === "img" || tag === "svg" || tag === "canvas") {
          const r = el.getBoundingClientRect();
          if (r.width > 1 && r.height > 1) imgs.push({ el, x: X(r.left), y: Y(r.top), w: r.width, h: r.height, rg: regionOf(el) });
          if (tag === "svg") {
            // Bỏ qua phần tử con của SVG (đã vẽ thành ảnh).
            let nx = walker.nextSibling();
            while (!nx && walker.parentNode()) nx = walker.nextSibling();
            n = nx;
            continue;
          }
        }
      } else {
        const p = n.parentElement;
        const txt = n.nodeValue;
        const fld = p && p.closest("[data-fld]");
        if (fld) {
          const cs = css(p);
          const fam = famKey(cs.fontFamily);
          const r = fld.getBoundingClientRect();
          const pa = fld.closest("p");
          push(n, { t: "text", s: "", fld: fld.dataset.fld, al: pa ? css(pa).textAlign : "left", x: X(r.left), base: Y(r.top) + ascent(fam, cs), w: r.width, top: Y(r.top), bottom: Y(r.bottom), fam, st: styleKey(cs), size: parseFloat(cs.fontSize) || 16, c: color(cs.color) || { r: 0, g: 0, b: 0 }, ls: 0 });
        } else if (p && txt && /\S/.test(txt)) {
          const cs = css(p);
          const fam = famKey(cs.fontFamily);
          const st = styleKey(cs);
          const c = color(cs.color) || { r: 0, g: 0, b: 0, a: 1 };
          const size = parseFloat(cs.fontSize) || 16;
          const asc = ascent(fam, cs);
          const tt = cs.textTransform;
          const deco = cs.textDecorationLine || "";
          const ls = parseFloat(cs.letterSpacing) || 0;
          const re = /\S+/g;
          let m;
          while ((m = re.exec(txt))) {
            range.setStart(n, m.index);
            range.setEnd(n, m.index + m[0].length);
            const rs = [...range.getClientRects()].filter((r) => r.width > 0);
            let word = m[0];
            if (tt === "uppercase") word = word.toLocaleUpperCase("vi");
            else if (tt === "lowercase") word = word.toLocaleLowerCase("vi");
            const pieces = [];
            const miss = [...word].some((ch) => !has(doc, FAMS[fam][0], st, ch.codePointAt(0)));
            if (rs.length === 1 && !miss) pieces.push([word, rs[0]]);
            else {
              // Từ bị ngắt dòng hoặc có kí tự phông không có: vẽ từng kí tự đúng vị trí.
              let off = 0;
              [...m[0]].forEach((ch) => {
                range.setStart(n, m.index + off);
                range.setEnd(n, m.index + off + ch.length);
                off += ch.length;
                const r = [...range.getClientRects()].find((x) => x.width > 0);
                if (r) pieces.push([tt === "uppercase" ? ch.toLocaleUpperCase("vi") : ch, r]);
              });
            }
            pieces.forEach(([s, r]) =>
              push(n, { t: "text", s, x: X(r.left), base: Y(r.top) + asc, w: r.width, top: Y(r.top), bottom: Y(r.bottom), fam, st, size, c, ul: /underline/.test(deco), lt: /line-through/.test(deco), ls })
            );
          }
        }
      }
      n = walker.nextNode();
    }
    for (const im of imgs) {
      const d = await rasterize(im.el, im.w, im.h);
      if (d) items.push({ t: "img", x: im.x, y: im.y, w: im.w, h: im.h, d, top: im.y, bottom: im.y + im.h, rg: im.rg });
    }
    return { items, cells, R };
  }

  /* ---------- Chia trang dài (nội dung vượt một trang giấy) tại khoảng trống giữa các dòng ---------- */
  function slices(sec, items) {
    const cs = getComputedStyle(sec);
    const R = sec.getBoundingClientRect();
    const pageH = parseFloat(cs.minHeight) || R.height;
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const body = items.filter((i) => !i.rg);
    const H = Math.max(R.height, ...items.map((i) => i.bottom));
    const B = Math.max(0, ...body.map((i) => i.bottom));
    if (H <= pageH + 2) return { pageH, padT, H, list: [[0, pageH]] };
    // Vùng cấm cắt: mỗi dòng chữ, mỗi ảnh (gộp các vùng chồng nhau).
    const zones = body
      .filter((i) => i.t === "text" || i.t === "img")
      .map((i) => [i.top + 0.5, i.bottom - 0.5])
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    zones.forEach((z) => {
      const l = merged[merged.length - 1];
      if (l && z[0] <= l[1]) l[1] = Math.max(l[1], z[1]);
      else merged.push(z.slice());
    });
    const list = [];
    let y0 = 0;
    let guard = 0;
    while (guard++ < 400) {
      const avail = list.length ? pageH - padT - padB : pageH - padB;
      if (B - y0 <= avail + 1) {
        list.push([y0, Math.max(B, y0 + 1)]);
        break;
      }
      let cut = y0 + avail;
      const z = merged.find((m) => m[0] < cut && m[1] > cut);
      if (z && z[0] - 1 > y0 + avail * 0.25) cut = z[0] - 1;
      list.push([y0, cut]);
      y0 = cut;
    }
    return { pageH, padT, H, list };
  }

  /* ---------- Vẽ một trang PDF ---------- */
  async function draw(doc, data, sl, idx, pageW, pageH, padT, pageNo, total) {
    const [y0, y1] = sl;
    const single = data.single;
    const offB = (idx ? padT : 0) - y0;
    const offF = single ? 0 : pageH - data.H;
    const off0 = 0;
    const P = (v) => v * K;
    const offOf = (i) => (single ? 0 : i.rg === "h" ? off0 : i.rg === "f" ? offF : offB);
    // Đường kẻ ngang nằm đúng chỗ ngắt trang: chỉ vẽ ở trang trên (không thành vạch thừa đầu trang sau).
    const inSlice = (i) => {
      if (single || i.rg) return true;
      if (i.t === "line" && Math.abs(i.y1 - i.y2) < 0.5) return i.y1 <= y1 + 0.5 && (idx ? i.y1 > y0 + 0.5 : i.y1 >= y0 - 0.5);
      return i.bottom > y0 && i.top < y1;
    };
    const rgb = (c) => [c.r, c.g, c.b];
    // Đầu trang, chân trang: vẽ trên mọi trang, không cắt.
    const shapes = (list, clip) => {
      if (clip) {
        doc.saveGraphicsState();
        doc.rect(0, P(idx ? padT : 0), P(pageW), P(y1 - y0 + (idx ? 0 : 0)), null);
        doc.clip();
        doc.discardPath();
      }
      for (const i of list) {
        const off = offOf(i);
        if (i.t === "rect") {
          doc.setFillColor(...rgb(i.c));
          doc.rect(P(i.x), P(i.y + off), P(i.w), P(i.h), "F");
        } else if (i.t === "line") {
          doc.setDrawColor(...rgb(i.c));
          doc.setLineWidth(P(i.w));
          doc.setLineDashPattern(i.dash ? i.dash.map(P) : [], 0);
          doc.line(P(i.x1), P(i.y1 + off), P(i.x2), P(i.y2 + off));
        } else if (i.t === "img") {
          try {
            doc.addImage(i.d.data, i.d.fmt, P(i.x), P(i.y + off), P(i.w), P(i.h), undefined, "FAST");
          } catch (e) {}
        }
      }
      doc.setLineDashPattern([], 0);
      if (clip) doc.restoreGraphicsState();
    };
    shapes(data.items.filter((i) => i.t !== "text" && i.rg && inSlice(i)), false);
    shapes(data.items.filter((i) => i.t !== "text" && !i.rg && inSlice(i)), !single);
    const off = offB;
    doc.saveGraphicsState();
    if (!single) {
      doc.rect(0, P(idx ? padT : 0), P(pageW), P(y1 - y0), null);
      doc.clip();
      doc.discardPath();
    }
    // Đường đóng ô bảng ở mép trên/dưới trang khi một hàng bảng tách sang trang sau.
    data.cells.forEach((c) => {
      [[y1, c.b], [y0, c.t]].forEach(([yy, ln], k) => {
        if (!ln || !(c.top < yy - 1 && c.bottom > yy + 1)) return;
        if (k === 1 && !idx) return;
        if (k === 0 && yy >= data.H - 1) return;
        doc.setDrawColor(ln.c.r, ln.c.g, ln.c.b);
        doc.setLineWidth(P(ln.w));
        const y = yy + off + (k === 0 ? -ln.w / 2 : ln.w / 2);
        doc.line(P(c.x1), P(y), P(c.x2), P(y));
      });
    });
    doc.restoreGraphicsState();
    for (const i of data.items) {
      if (i.t !== "text") continue;
      if (!single && !i.rg) {
        const mid = (i.top + i.bottom) / 2;
        if (mid < y0 || mid >= y1) continue;
      }
      const off = offOf(i);
      let fam = FAMS[i.fam][0];
      let st = i.st;
      let s = i.fld ? String(i.fld === "P" ? pageNo : total) : i.s;
      if (i.fld) {
        doc.setFont(fam, st);
        doc.setFontSize(P(i.size));
        doc.setTextColor(i.c.r, i.c.g, i.c.b);
        const ax = i.al === "right" || i.al === "end" ? "right" : i.al === "center" ? "center" : "left";
        doc.text(s, P(ax === "right" ? i.x + i.w : ax === "center" ? i.x + i.w / 2 : i.x), P(i.base + off), { baseline: "alphabetic", align: ax });
        continue;
      }
      if ([...s].some((ch) => !has(doc, fam, st, ch.codePointAt(0)))) {
        await fallbackFont(doc);
        if ([...s].every((ch) => has(doc, "L360Sym", "normal", ch.codePointAt(0)))) (fam = "L360Sym"), (st = "normal");
        else s = [...s].map((ch) => (has(doc, fam, st, ch.codePointAt(0)) ? ch : "?")).join("");
      }
      doc.setFont(fam, st);
      doc.setFontSize(P(i.size));
      doc.setTextColor(i.c.r, i.c.g, i.c.b);
      doc.text(s, P(i.x), P(i.base + off), i.ls ? { baseline: "alphabetic", charSpace: P(i.ls) } : { baseline: "alphabetic" });
      if (i.ul || i.lt) {
        doc.setDrawColor(i.c.r, i.c.g, i.c.b);
        doc.setLineWidth(Math.max(0.4, P(i.size) * 0.06));
        const y = i.ul ? i.base + i.size * 0.12 : i.base - i.size * 0.28;
        doc.line(P(i.x), P(y + off), P(i.x + i.w), P(y + off));
      }
    }
  }

  /* ---------- Mật khẩu (qpdf, AES-256) ---------- */
  let qpdfMod = null;
  async function qpdf() {
    if (qpdfMod) return qpdfMod;
    await u.loadScript("js/vendor/qpdf/qpdf.js");
    const factory = window.Module;
    if (typeof factory !== "function") throw new Error("Không tải được bộ đặt mật khẩu.");
    qpdfMod = await factory({ locateFile: (f) => "js/vendor/qpdf/" + f, print: () => {}, printErr: () => {} });
    return qpdfMod;
  }
  async function encrypt(bytes, password, opt = {}) {
    const q = await qpdf();
    const id = Math.random().toString(36).slice(2);
    const a = `/in-${id}.pdf`;
    const b = `/out-${id}.pdf`;
    q.FS.writeFile(a, new Uint8Array(bytes));
    const owner = opt.owner || password + "#" + Math.random().toString(36).slice(2, 10);
    const args = [a, "--encrypt", password, owner, "256"].concat(opt.lock ? ["--modify=none", "--extract=n", "--annotate=n"] : []).concat(["--", b]);
    let rc;
    try {
      rc = q.callMain(args);
    } catch (e) {
      rc = e && e.status != null ? e.status : 2;
    }
    if (rc !== 0 && rc !== 3) throw new Error("Không đặt được mật khẩu cho tệp PDF (tệp có thể đã được bảo vệ sẵn).");
    const out = q.FS.readFile(b);
    try {
      q.FS.unlink(a);
      q.FS.unlink(b);
    } catch (e) {}
    return out;
  }

  /* ---------- Chuyển đổi ---------- */
  async function convert(file, opt = {}) {
    const prog = opt.onProgress || (() => {});
    const ab = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    // PDF có sẵn: chỉ đặt mật khẩu.
    if (/^%PDF/.test(new TextDecoder().decode(new Uint8Array(ab, 0, Math.min(5, ab.byteLength))))) {
      if (!opt.password) throw new Error("Tệp đã là PDF – hãy nhập mật khẩu để đặt cho tệp.");
      prog("Đang đặt mật khẩu…");
      return { bytes: await encrypt(ab, opt.password, opt), pages: null, plain: null };
    }
    prog("Đang mở tệp Word…");
    await u.loadScript("js/vendor/jszip.min.js");
    const prev = window.docx;
    await u.loadScript("js/vendor/docx-preview.min.js");
    const DP = window.docx && window.docx.renderAsync ? window.docx : L360._docxPreview;
    if (window.docx && window.docx.renderAsync) L360._docxPreview = window.docx;
    if (prev && prev !== window.docx && !prev.renderAsync) window.docx = prev;
    await u.loadScript("js/vendor/jspdf.umd.min.js");
    const host = document.createElement("div");
    host.className = "w2p-host";
    // all:initial – không thừa hưởng cỡ chữ, giãn dòng… của giao diện ứng dụng (tài liệu dàn đúng như Word).
    host.style.cssText = "all:initial;display:block;position:absolute;left:-40000px;top:0;background:#fff;width:max-content;line-height:normal";
    document.body.appendChild(host);
    try {
      const src = await prepare(ab);
      await (DP || window.docx).renderAsync(src, host, host, {
        className: "docx",
        inWrapper: false,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: true,
        trimXmlDeclaration: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true
      });
      const secs = [...host.querySelectorAll("section.docx")];
      if (!secs.length) throw new Error("Không đọc được nội dung tệp Word.");
      prog("Đang dàn trang…");
      // Kí tự phông Symbol → kí tự thường; đánh số → chữ thật; phông → phông tương đương.
      const tw = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) if (/[-]/.test(t.nodeValue)) t.nodeValue = fixPua(t.nodeValue);
      fixDefaults(host);
      fixLineHeights(host);
      numbering(host);
      markFields(host);
      const used = new Set();
      host.querySelectorAll("*").forEach((el) => {
        if (/^(STYLE|SCRIPT)$/.test(el.tagName)) return;
        const k = famKey(getComputedStyle(el).fontFamily);
        used.add(k);
        el.style.fontFamily = `"${FAMS[k][0]}"`;
      });
      host.querySelectorAll(".l360-num").forEach((sp) => (sp.textContent = fixPua(sp.textContent)));
      await cssFonts([...used]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      // Hàng bảng cao hơn một trang: chữ trong ô đặt từ đầu ô (như Word), không căn giữa/xuống đáy qua nhiều trang.
      let tall = 0;
      secs.forEach((sec) => {
        const cs = getComputedStyle(sec);
        const cap = (parseFloat(cs.minHeight) || sec.getBoundingClientRect().height) - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
        sec.querySelectorAll("td,th").forEach((td) => {
          if (td.getBoundingClientRect().height <= cap * 0.9 && td.parentElement.getBoundingClientRect().height <= cap * 0.9) return;
          if (getComputedStyle(td).verticalAlign !== "top") (td.style.verticalAlign = "top"), tall++;
        });
      });
      if (tall) await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const { jsPDF } = window.jspdf;
      let doc = null;
      // Lượt 1: thu thập nội dung, chia trang (biết tổng số trang cho trường NUMPAGES).
      const plan = [];
      for (let si = 0; si < secs.length; si++) {
        const sec = secs[si];
        prog(`Đang dàn trang ${si + 1}/${secs.length}…`);
        const R = sec.getBoundingClientRect();
        const cs = getComputedStyle(sec);
        const pw = R.width;
        const ph = parseFloat(cs.minHeight) || R.height;
        if (!doc) {
          doc = new jsPDF({ unit: "pt", format: [pw * K, ph * K], orientation: pw > ph ? "landscape" : "portrait", compress: true });
          await pdfFonts(doc, [...used]);
          doc.setProperties({ title: (opt.title || "").replace(/\.docx$/i, ""), creator: "Lesson 360° Studio – Chuyển Word sang PDF" });
        }
        let data = await collect(sec, doc);
        let sp = slices(sec, data.items);
        // Hàng bảng vắt qua chỗ ngắt trang: chữ mọi ô đặt từ đầu ô (như Word) rồi dàn lại trang này.
        if (sp.list.length > 1) {
          const cuts = sp.list.slice(0, -1).map((x) => x[1]);
          const Rr = sec.getBoundingClientRect();
          let ch = 0;
          sec.querySelectorAll("td,th").forEach((td) => {
            const r = td.getBoundingClientRect();
            const t = r.top - Rr.top;
            const b = r.bottom - Rr.top;
            if (cuts.some((c) => t < c - 2 && b > c + 2) && getComputedStyle(td).verticalAlign !== "top") (td.style.verticalAlign = "top"), ch++;
          });
          if (ch) {
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            data = await collect(sec, doc);
            sp = slices(sec, data.items);
          }
        }
        data.H = sp.H;
        data.single = sp.list.length === 1;
        plan.push({ data, sp, pw, ph });
        await new Promise((r) => setTimeout(r, 0));
      }
      // Lượt 2: vẽ.
      const total = plan.reduce((a, x) => a + x.sp.list.length, 0);
      let pages = 0;
      for (const { data, sp, pw, ph } of plan) {
        for (let k = 0; k < sp.list.length; k++) {
          if (pages++) doc.addPage([pw * K, ph * K], pw > ph ? "landscape" : "portrait");
          prog(`Đang vẽ trang ${pages}/${total}…`);
          await draw(doc, data, sp.list[k], k, pw, sp.pageH, sp.padT, pages, total);
        }
      }
      const plain = doc.output("arraybuffer");
      let bytes = plain;
      if (opt.password) {
        prog("Đang đặt mật khẩu…");
        bytes = await encrypt(plain, opt.password, opt);
      }
      return { bytes, pages, plain };
    } finally {
      if (!opt.keep) host.remove();
    }
  }

  L360.Word2Pdf = { convert, encrypt, famKey };
})();
