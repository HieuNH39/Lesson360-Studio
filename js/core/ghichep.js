/* Ghi chép cuộc họp: loại cuộc họp + mẫu nội dung, làm sạch HTML, xuất Word (.docx) theo thể thức biên bản (Nghị định 30/2020/NĐ-CP)
   hoặc bản ghi chép gọn; PDF chuyển từ chính tệp Word đó (Word2Pdf). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const cfg = L360.cfg;
  const H = (t, items) => `<h3>${t}</h3><ul>${(items || [""]).map((x) => `<li>${x}</li>`).join("")}</ul>`;
  const TYPES = [
    { id: "to", name: "Họp tổ chuyên môn", color: "#2F6FDB", icon: "users", desc: "Đánh giá tháng, triển khai kế hoạch, sinh hoạt chuyên môn", bb: true, nd: H("1. Đánh giá công việc tháng qua") + H("2. Triển khai kế hoạch tháng tới") + H("3. Sinh hoạt chuyên môn") + H("4. Ý kiến thảo luận") },
    { id: "shcm", name: "Sinh hoạt chuyên môn, dự giờ", color: "#0C9A9A", icon: "eye", desc: "Nghiên cứu bài học: người dạy chia sẻ, góp ý, bài học rút ra", bb: true, nd: H("1. Thông tin tiết dạy", ["Người dạy: ", "Lớp: ", "Bài dạy: "]) + H("2. Giáo viên dạy chia sẻ") + H("3. Ý kiến góp ý (học sinh học như thế nào?)") + H("4. Bài học rút ra") },
    { id: "hdsp", name: "Họp Hội đồng sư phạm", color: "#1E8E5A", icon: "layers", desc: "Đánh giá công tác, phương hướng, ý kiến chỉ đạo của Ban Giám hiệu", bb: true, nd: H("1. Đánh giá công tác tháng qua") + H("2. Phương hướng, nhiệm vụ tháng tới") + H("3. Ý kiến thảo luận") + H("4. Ý kiến chỉ đạo của Ban Giám hiệu") },
    { id: "ph", name: "Họp cha mẹ học sinh", color: "#E8930C", icon: "user", desc: "Tình hình lớp, kết quả học tập, ý kiến cha mẹ học sinh", bb: true, nd: H("1. Báo cáo tình hình lớp") + H("2. Kết quả học tập, rèn luyện") + H("3. Kế hoạch thời gian tới") + H("4. Ý kiến của cha mẹ học sinh") },
    { id: "lop", name: "Sinh hoạt lớp", color: "#E0457B", icon: "flag", desc: "Nhận xét tuần, kế hoạch tuần tới, sinh hoạt chủ đề", bb: true, nd: H("1. Nhận xét tuần qua") + H("2. Kế hoạch tuần tới") + H("3. Sinh hoạt theo chủ đề") },
    { id: "th", name: "Tập huấn, hội thảo", color: "#8A5A2B", icon: "book", desc: "Nội dung chính, điều tâm đắc, vận dụng vào giảng dạy", bb: false, nd: H("1. Nội dung chính") + H("2. Điều tâm đắc") + H("3. Vận dụng vào giảng dạy") },
    { id: "khac", name: "Ghi chép tự do", color: "#6B7A90", icon: "note", desc: "Trang trắng – ghi bất cứ nội dung nào", bb: false, nd: "<p></p>" }
  ];
  const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[TYPES.length - 1];
  const defUnit = (id) => (["to", "shcm", "th"].includes(id) ? cfg.unit || "" : id === "ph" || id === "lop" ? "Lớp " : "");
  const defTitle = (id, day) => {
    const d = day ? day.split("-") : [];
    if (id === "to" || id === "hdsp") return `${typeOf(id).name} tháng ${Number(d[1])}/${d[0]}`;
    return `${typeOf(id).name} ngày ${d[2]}/${d[1]}/${d[0]}`;
  };

  /* ---------- Làm sạch HTML (dán từ Word, Zalo, web) ---------- */
  const KEEP = { B: "b", STRONG: "b", I: "i", EM: "i", U: "u", MARK: "mark", BR: "br", P: "p", DIV: "p", H1: "h3", H2: "h3", H3: "h3", H4: "h4", H5: "h4", H6: "h4", UL: "ul", OL: "ol", LI: "li", TABLE: "table", TBODY: "tbody", THEAD: "tbody", TR: "tr", TD: "td", TH: "td", IMG: "img", BLOCKQUOTE: "p" };
  function sanitize(html, { keepImgSrc } = {}) {
    const doc = new DOMParser().parseFromString(`<div id="r">${html || ""}</div>`, "text/html");
    const root = doc.getElementById("r");
    const walk = (node, out) => {
      node.childNodes.forEach((c) => {
        if (c.nodeType === 3) return out.appendChild(doc.createTextNode(c.nodeValue.replace(/ /g, " ")));
        if (c.nodeType !== 1) return;
        const tag = c.tagName;
        if (/^(SCRIPT|STYLE|META|LINK|TITLE|HEAD|O:P|XML|SVG|IFRAME|OBJECT)$/.test(tag)) return;
        // Chữ tô đậm/nghiêng/gạch chân, tô nền bằng style (Google Docs, Word).
        let to = KEEP[tag];
        const s = (c.getAttribute && c.getAttribute("style")) || "";
        if (tag === "SPAN" || tag === "FONT" || !to) {
          let wrap = out;
          const add = (t) => {
            const el = doc.createElement(t);
            wrap.appendChild(el);
            wrap = el;
          };
          if (/font-weight:\s*(bold|[6-9]00)/i.test(s)) add("b");
          if (/font-style:\s*italic/i.test(s)) add("i");
          if (/text-decoration[^;]*underline/i.test(s)) add("u");
          if (/background(-color)?:\s*(yellow|#ff0|#ffff00|rgb\(255,\s*255,\s*0\))/i.test(s)) add("mark");
          return walk(c, wrap);
        }
        if (tag === "IMG") {
          const k = c.getAttribute("data-k");
          if (!k || !/^[a-z0-9]{4,20}$/i.test(k)) return;
          const im = doc.createElement("img");
          im.setAttribute("data-k", k);
          if (keepImgSrc && /^data:image\/(jpeg|png|webp);base64,/.test(c.getAttribute("src") || "")) im.setAttribute("src", c.getAttribute("src"));
          return out.appendChild(im);
        }
        // Khung bọc (div lồng nhau từ Word, web): bỏ khung, giữ nội dung.
        if (to === "p" && c.querySelector("p,div,ul,ol,table,h1,h2,h3,h4,h5,h6,li,blockquote")) return walk(c, out);
        const el = doc.createElement(to);
        if (to === "td") ["colspan", "rowspan"].forEach((a) => c.getAttribute(a) && /^\d{1,2}$/.test(c.getAttribute(a)) && el.setAttribute(a, c.getAttribute(a)));
        if (/font-weight:\s*(bold|[6-9]00)/i.test(s) && to === "p") {
          const b = doc.createElement("b");
          el.appendChild(b);
          walk(c, b);
        } else walk(c, el);
        out.appendChild(el);
      });
      return out;
    };
    const clean = walk(root, doc.createElement("div"));
    // Bỏ khối rỗng lồng nhau thừa (p trong li, p trong td giữ nguyên nội dung).
    clean.querySelectorAll("li > p:only-child, td > p:only-child").forEach((p) => p.replaceWith(...p.childNodes));
    return clean.innerHTML.replace(/(<p><\/p>){2,}/g, "<p></p>");
  }
  // Chữ thuần để tìm kiếm.
  function plain(html) {
    const d = new DOMParser().parseFromString(`<div>${String(html || "").replace(/<(\/p|\/li|\/h3|\/h4|br|\/tr)>/gi, "<$1>\n")}</div>`, "text/html");
    return (d.body.textContent || "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  }
  const isBlank = (html) => !plain(html) && !/<img/i.test(html || "");

  /* ---------- Xuất Word ---------- */
  const viDate = (day) => {
    if (!day) return "ngày …… tháng …… năm ……";
    const [y, m, d] = day.split("-");
    return `ngày ${d} tháng ${m} năm ${y}`;
  };
  const viTime = (tm) => (tm ? `${Number(tm.slice(0, 2))} giờ ${tm.slice(3)} phút` : "");
  async function tidy(blob) {
    try {
      await u.loadScript("js/vendor/jszip.min.js");
      const zip = await window.JSZip.loadAsync(blob);
      Object.keys(zip.files).forEach((n) => zip.files[n].dir && delete zip.files[n]);
      const rp = "word/_rels/document.xml.rels";
      if (zip.file("word/fontTable.xml") && zip.file(rp)) {
        let rels = await zip.file(rp).async("string");
        if (!/fontTable\.xml/.test(rels)) zip.file(rp, rels.replace("</Relationships>", '<Relationship Id="rIdL360Font" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>'));
      }
      return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
    } catch (e) {
      return blob;
    }
  }
  const imgSize = (src) =>
    new Promise((res) => {
      const im = new Image();
      im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => res(null);
      im.src = src;
    });

  /* meta: {t, loai, ngay, bd, kt, dd, ct, tk}; doc: {tp, vang, nd, kl, viec, dv, so}; imgs: {k: dataURL}
     opts: {style: "bb" | "gc", images: true, author} */
  async function docx(meta, doc, imgs, opts = {}) {
    await u.loadScript("js/vendor/docx.umd.js");
    const D = window.docx;
    const bb = opts.style !== "gc";
    const FONT = "Times New Roman";
    const SZ = bb ? 28 : 26;
    const W = 11906 - 1701 - 851;
    const AL = { center: D.AlignmentType.CENTER, left: D.AlignmentType.LEFT, both: D.AlignmentType.JUSTIFIED, right: D.AlignmentType.RIGHT };
    const AUTO = D.LineRuleType ? D.LineRuleType.AUTO : "auto";
    const none = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const thin = { style: D.BorderStyle.SINGLE, size: 4, color: "000000" };
    const R = (text, o = {}) => new D.TextRun({ text, bold: !!o.b, italics: !!o.i, underline: o.u ? {} : undefined, shading: o.hl ? { type: D.ShadingType.CLEAR, color: "auto", fill: "FFF176" } : undefined, size: o.size || SZ, font: FONT });
    const P = (runs, o = {}) =>
      new D.Paragraph({
        children: runs,
        alignment: AL[o.align || "both"],
        spacing: { before: o.before || 0, after: o.after != null ? o.after : 80, line: o.line || 288, lineRule: AUTO },
        indent: o.indent,
        keepNext: !!o.keep,
        keepLines: !!o.keep,
        numbering: o.num,
        border: o.border
      });
    // Đường kẻ ngắn dưới tên đơn vị, tiêu ngữ, tên văn bản.
    const rule = (cellW, len) => P([R("", { size: 4 })], { align: "center", after: 60, line: 240, indent: { left: Math.max(0, Math.round((cellW - len) / 2)), right: Math.max(0, Math.round((cellW - len) / 2)) }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } } });
    const lines = (text, o) => {
      const out = [];
      String(text || "")
        .split(/\n/)
        .forEach((ln, i) => {
          if (i) out.push(new D.TextRun({ break: 1 }));
          out.push(R(ln, o));
        });
      return out;
    };
    // Ảnh: kích thước theo điểm ảnh, tối đa bề rộng vùng chữ.
    const sizes = {};
    if (opts.images !== false)
      await Promise.all(
        Object.entries(imgs || {}).map(async ([k, src]) => {
          const s = await imgSize(src);
          if (s) sizes[k] = s;
        })
      );
    const imgRun = (k, maxW) => {
      const src = imgs && imgs[k];
      const s = sizes[k];
      if (!src || !s || opts.images === false) return null;
      const w = Math.min(maxW, s.w);
      return new D.ImageRun({ data: src, transformation: { width: w, height: Math.round((s.h * w) / s.w) } });
    };
    let olInst = 0;
    // HTML của ô soạn thảo → các đoạn Word.
    function blocks(html, ctx = {}) {
      const root = new DOMParser().parseFromString(`<div>${sanitize(html)}</div>`, "text/html").body.firstChild;
      // Mục mẫu để trống (tiêu đề mục không có nội dung bên dưới): bỏ khi xuất.
      const isH = (n) => n.nodeType === 1 && /^H[34]$/.test(n.tagName);
      const kids = [...root.childNodes];
      kids.forEach((h, i) => {
        if (!isH(h)) return;
        const tail = [];
        for (let j = i + 1; j < kids.length && !isH(kids[j]); j++) tail.push(kids[j]);
        if (tail.every((n) => !n.textContent.trim() && !(n.nodeType === 1 && (n.tagName === "IMG" || n.querySelector("img"))))) [h, ...tail].forEach((n) => n.remove());
      });
      const out = [];
      const maxW = ctx.maxW || 600;
      const segs = (node, marks, acc) => {
        node.childNodes.forEach((c) => {
          if (c.nodeType === 3) return acc.push({ t: c.nodeValue.replace(/\s+/g, " "), m: marks });
          if (c.nodeType !== 1) return;
          const tag = c.tagName.toLowerCase();
          if (tag === "br") return acc.push({ br: true });
          if (tag === "img") return acc.push({ img: c.getAttribute("data-k") });
          if (["ul", "ol", "table"].includes(tag)) return;
          const m = Object.assign({}, marks);
          if (tag === "b") m.b = true;
          if (tag === "i") m.i = true;
          if (tag === "u") m.u = true;
          if (tag === "mark") m.hl = true;
          segs(c, m, acc);
        });
        return acc;
      };
      const runsOf = (list) => {
        // Bỏ khoảng trắng đầu/cuối đoạn.
        const blank = (x) => x.br || (x.t !== undefined && !x.t.trim());
        while (list.length && blank(list[0])) list.shift();
        while (list.length && blank(list[list.length - 1])) list.pop();
        if (list.length && list[0].t) list[0] = Object.assign({}, list[0], { t: list[0].t.replace(/^\s+/, "") });
        const l = list.length - 1;
        if (l >= 0 && list[l].t) list[l] = Object.assign({}, list[l], { t: list[l].t.replace(/\s+$/, "") });
        const runs = [];
        let pics = 0;
        let txt = 0;
        list.forEach((s) => {
          if (s.br) runs.push(new D.TextRun({ break: 1 }));
          else if (s.img) {
            const r = imgRun(s.img, maxW);
            if (r) runs.push(r), pics++;
          } else if (s.t) runs.push(R(s.t, Object.assign({ size: ctx.size }, s.m))), txt++;
        });
        return { runs, pics, txt, empty: !runs.length };
      };
      const para = (node, o = {}) => {
        const { runs, pics, txt, empty } = runsOf(segs(node, o.marks || {}, []));
        if (empty) return;
        out.push(P(runs, Object.assign({ align: pics && !txt ? "center" : ctx.align || "both", indent: ctx.indent }, o)));
      };
      const list = (el, level) => {
        const ordered = el.tagName === "OL";
        const inst = ordered ? ++olInst : 0;
        [...el.children].forEach((li) => {
          if (li.tagName !== "LI") return;
          const { runs, pics, txt, empty } = runsOf(segs(li, {}, []));
          // Dòng chỉ có ảnh: đặt giữa, không gạch đầu dòng.
          if (!empty && pics && !txt) out.push(P(runs, { align: "center", after: 60 }));
          else if (!empty) out.push(P(runs, { num: { reference: ordered ? "gc-ol" : "gc-ul", level: Math.min(level, 2), instance: inst }, after: 40, align: ctx.align || "both" }));
          [...li.children].forEach((c) => (c.tagName === "UL" || c.tagName === "OL") && list(c, level + 1));
        });
      };
      const table = (el) => {
        const rows = [...el.querySelectorAll("tr")].filter((tr) => tr.closest("table") === el);
        const n = Math.max(1, ...rows.map((tr) => [...tr.children].reduce((s, td) => s + (Number(td.getAttribute("colspan")) || 1), 0)));
        const cw = Math.floor((ctx.width || W) / n);
        if (!rows.length) return;
        out.push(
          new D.Table({
            width: { size: cw * n, type: D.WidthType.DXA },
            columnWidths: Array(n).fill(cw),
            rows: rows.map(
              (tr) =>
                new D.TableRow({
                  children: [...tr.children].map((td) => {
                    const span = Number(td.getAttribute("colspan")) || 1;
                    const inner = blocks(td.innerHTML, { maxW: Math.round((cw * span) / 15) - 10, width: cw * span - 200, size: SZ - 2, align: "left" });
                    return new D.TableCell({
                      width: { size: cw * span, type: D.WidthType.DXA },
                      columnSpan: span > 1 ? span : undefined,
                      margins: { top: 40, bottom: 40, left: 90, right: 90 },
                      borders: { top: thin, bottom: thin, left: thin, right: thin },
                      children: inner.length ? inner : [P([R("", { size: SZ - 2 })], { after: 0 })]
                    });
                  })
                })
            )
          })
        );
        out.push(P([R("")], { after: 0, line: 240 }));
      };
      let inline = [];
      const flush = () => {
        if (!inline.length) return;
        const wrap = document.createElement("p");
        inline.forEach((n) => wrap.appendChild(n.cloneNode(true)));
        para(wrap);
        inline = [];
      };
      [...root.childNodes].forEach((c) => {
        const tag = c.nodeType === 1 ? c.tagName : "";
        if (!tag || ["B", "I", "U", "MARK", "BR", "IMG"].includes(tag)) return inline.push(c);
        flush();
        if (tag === "P") para(c);
        else if (tag === "H3" || tag === "H4") para(c, { marks: { b: true }, keep: true, before: 100, after: 40, align: "left" });
        else if (tag === "UL" || tag === "OL") list(c, 0);
        else if (tag === "TABLE") table(c);
        else para(c);
      });
      flush();
      return out;
    }
    const tableOf = (cols, rows, widths) =>
      new D.Table({
        width: { size: W, type: D.WidthType.DXA },
        columnWidths: widths,
        rows: [cols, ...rows].map(
          (r, ri) =>
            new D.TableRow({
              tableHeader: ri === 0,
              children: r.map(
                (txt, ci) =>
                  new D.TableCell({
                    width: { size: widths[ci], type: D.WidthType.DXA },
                    margins: { top: 40, bottom: 40, left: 90, right: 90 },
                    borders: { top: thin, bottom: thin, left: thin, right: thin },
                    shading: ri === 0 ? { type: D.ShadingType.CLEAR, color: "auto", fill: "EEF2F7" } : undefined,
                    verticalAlign: D.VerticalAlign.CENTER,
                    children: [P(lines(txt, { b: ri === 0, size: SZ - 2 }), { align: ri === 0 || ci === 0 || ci === 3 ? "center" : "left", after: 0 })]
                  })
              )
            })
        )
      });
    const viec = (doc.viec || []).filter((v) => v && String(v.t || "").trim());
    const viecTable = () =>
      tableOf(
        ["STT", "Nội dung công việc", "Người thực hiện", "Thời hạn"],
        viec.map((v, i) => [String(i + 1), v.t, v.ai || "", v.han ? v.han.split("-").reverse().join("/") : ""]),
        [800, W - 800 - 2400 - 1700, 2400, 1700]
      );
    const children = [];
    const cell = (w, kids) => new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, margins: { left: 0, right: 0 }, children: kids });
    const school = (cfg.school || "").toUpperCase();
    const dv = String(doc.dv || "").trim();
    const diaDanh = cfg.diaDanh || "";
    if (bb) {
      const LW = 3800;
      const RW = W - LW;
      const left = dv
        ? [P([R(school, { size: 26 })], { align: "center", after: 0, line: 240 }), P([R(dv.toUpperCase(), { b: true, size: 26 })], { align: "center", after: 0, line: 240 }), rule(LW, 1500)]
        : [P([R(school, { b: true, size: 26 })], { align: "center", after: 0, line: 240 }), rule(LW, 1500)];
      if (doc.so) left.push(P([R(`Số: ${doc.so}`, { size: 26 })], { align: "center", after: 0 }));
      children.push(
        new D.Table({
          width: { size: W, type: D.WidthType.DXA },
          columnWidths: [LW, RW],
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: [
            new D.TableRow({
              children: [
                cell(LW, left),
                cell(RW, [
                  P([R("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { b: true, size: 24 })], { align: "center", after: 0, line: 240 }),
                  P([R("Độc lập - Tự do - Hạnh phúc", { b: true, size: 26 })], { align: "center", after: 0, line: 240 }),
                  rule(RW, 3300),
                  P([R(`${diaDanh ? diaDanh + ", " : ""}${viDate(meta.ngay)}`, { i: true, size: 26 })], { align: "center", after: 0 })
                ])
              ]
            })
          ]
        })
      );
      children.push(P([R("BIÊN BẢN", { b: true })], { align: "center", before: 360, after: 0 }));
      children.push(P([R(meta.t || typeOf(meta.loai).name, { b: true })], { align: "center", after: 0 }));
      children.push(rule(W, 1600));
      const lab = (k, v) => v && children.push(P([R(k + ": ", { b: true }), ...lines(v)], { after: 60 }));
      lab("Thời gian", `${meta.bd ? viTime(meta.bd) + ", " : ""}${viDate(meta.ngay)}`);
      lab("Địa điểm", meta.dd);
      lab("Thành phần tham dự", doc.tp);
      lab("Vắng mặt", doc.vang);
      lab("Chủ trì", meta.ct);
      lab("Thư kí", meta.tk);
      children.push(P([R("NỘI DUNG CUỘC HỌP", { b: true })], { before: 160, after: 60, keep: true, align: "left" }));
      children.push(...blocks(doc.nd));
      if (!isBlank(doc.kl)) {
        children.push(P([R("KẾT LUẬN", { b: true })], { before: 160, after: 60, keep: true, align: "left" }));
        children.push(...blocks(doc.kl));
      }
      if (viec.length) {
        children.push(P([R("PHÂN CÔNG THỰC HIỆN", { b: true })], { before: 160, after: 80, keep: true, align: "left" }));
        children.push(viecTable());
      }
      children.push(
        P([R(`Cuộc họp kết thúc vào lúc ${meta.kt ? viTime(meta.kt) : "…… giờ …… phút"} cùng ngày. Biên bản đã được đọc lại trước cuộc họp và các thành viên dự họp nhất trí với nội dung biên bản./.`)], {
          before: 200,
          indent: { firstLine: 567 }
        })
      );
      const sig = (role, name) => [
        P([R(role, { b: true })], { align: "center", after: 0 }),
        P([R("(Kí, ghi rõ họ tên)", { i: true, size: 26 })], { align: "center", after: 0 }),
        P([R("")], { after: 0 }),
        P([R("")], { after: 0 }),
        P([R("")], { after: 0 }),
        P([R(name || "", { b: true })], { align: "center", after: 0 })
      ];
      children.push(P([R("")], { after: 0 }));
      children.push(
        new D.Table({
          width: { size: W, type: D.WidthType.DXA },
          columnWidths: [W / 2, W / 2],
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: [new D.TableRow({ cantSplit: true, children: [cell(W / 2, sig("THƯ KÍ", meta.tk)), cell(W / 2, sig("CHỦ TRÌ", meta.ct))] })]
        })
      );
    } else {
      children.push(P([R(String(meta.t || typeOf(meta.loai).name).toUpperCase(), { b: true, size: 30 })], { align: "center", after: 40 }));
      children.push(P([R(`${typeOf(meta.loai).name}${opts.author ? " · Người ghi: " + opts.author : ""}`, { i: true, size: 24 })], { align: "center", after: 200 }));
      const info = [
        ["Thời gian", `${meta.bd ? meta.bd + (meta.kt ? " – " + meta.kt : "") + ", " : ""}${meta.ngay ? meta.ngay.split("-").reverse().join("/") : ""}`],
        ["Địa điểm", meta.dd],
        ["Đơn vị", dv],
        ["Chủ trì", meta.ct],
        ["Thư kí", meta.tk],
        ["Thành phần", doc.tp],
        ["Vắng mặt", doc.vang]
      ].filter((r) => String(r[1] || "").trim());
      if (info.length)
        children.push(
          new D.Table({
            width: { size: W, type: D.WidthType.DXA },
            columnWidths: [2200, W - 2200],
            rows: info.map(
              ([k, v]) =>
                new D.TableRow({
                  children: [
                    new D.TableCell({ width: { size: 2200, type: D.WidthType.DXA }, borders: { top: thin, bottom: thin, left: thin, right: thin }, shading: { type: D.ShadingType.CLEAR, color: "auto", fill: "F2F5F9" }, margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: [P([R(k, { b: true, size: 24 })], { after: 0, align: "left" })] }),
                    new D.TableCell({ width: { size: W - 2200, type: D.WidthType.DXA }, borders: { top: thin, bottom: thin, left: thin, right: thin }, margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: [P(lines(v, { size: 24 }), { after: 0, align: "left" })] })
                  ]
                })
            )
          })
        );
      children.push(P([R("Nội dung", { b: true, size: 28 })], { before: 240, after: 60, keep: true, align: "left" }));
      children.push(...blocks(doc.nd));
      if (!isBlank(doc.kl)) {
        children.push(P([R("Kết luận", { b: true, size: 28 })], { before: 200, after: 60, keep: true, align: "left" }));
        children.push(...blocks(doc.kl));
      }
      if (viec.length) {
        children.push(P([R("Việc cần làm", { b: true, size: 28 })], { before: 200, after: 80, keep: true, align: "left" }));
        children.push(viecTable());
      }
    }
    const lv = (i, fmt, text, left) => ({ level: i, format: fmt, text, alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left, hanging: 283 } }, run: { font: FONT } } });
    const file = new D.Document({
      creator: opts.author || cfg.appName || "Lesson 360° Studio",
      title: meta.t || "Biên bản",
      styles: { default: { document: { run: { font: FONT, size: SZ } } } },
      numbering: {
        config: [
          { reference: "gc-ul", levels: [lv(0, D.LevelFormat.BULLET, "-", 567), lv(1, D.LevelFormat.BULLET, "+", 1021), lv(2, D.LevelFormat.BULLET, "•", 1474)] },
          { reference: "gc-ol", levels: [lv(0, D.LevelFormat.DECIMAL, "%1.", 567), lv(1, D.LevelFormat.LOWER_LETTER, "%2)", 1021), lv(2, D.LevelFormat.LOWER_ROMAN, "%3.", 1474)] }
        ]
      },
      sections: [
        {
          properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 851 } } },
          footers: {
            default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: [D.PageNumber.CURRENT], size: 22, font: FONT })] })] })
          },
          children
        }
      ]
    });
    return tidy(await D.Packer.toBlob(file));
  }
  const fileName = (meta, ext) =>
    `${(meta.ngay || "").replace(/-/g, "")}_${typeOf(meta.loai).bb ? "BienBan" : "GhiChep"}_${String(meta.t || "cuoc-hop")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^A-Za-z0-9]+/g, "")
      .slice(0, 60)}.${ext}`;

  L360.GhiChep = { TYPES, typeOf, defUnit, defTitle, sanitize, plain, isBlank, docx, fileName };
})();
