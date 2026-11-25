/* Xuất bài giảng PowerPoint (.pptx) từ các tiết học – để dạy cả khi lớp không có thiết bị.
   Mỗi tiết khoảng 20–40 trang chiếu: trang bìa, mục tiêu, trang chuyển pha, từng trang bài giảng
   (ảnh, dòng thời gian, sơ đồ tư duy, bảng so sánh…), câu hỏi kèm trang đáp án, ô chữ, phiếu nhóm, ghi nhớ.
   Màu sắc và hoạ tiết theo phong cách thiết kế của tiết học; lời dẫn của giáo viên nằm trong phần ghi chú. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const arr = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);
  const W = 13.333;
  const H = 7.5;
  const MX = 0.6;
  const PH = { "khoi-dong": "E8930C", "hinh-thanh": "2F6FDB", "luyen-tap": "1E8E5A", "van-dung": "D2453B" };
  const PH_NAME = { "khoi-dong": "KHỞI ĐỘNG", "hinh-thanh": "HÌNH THÀNH KIẾN THỨC", "luyen-tap": "LUYỆN TẬP", "van-dung": "VẬN DỤNG" };
  const LET = "ABCDEFGH";
  const hex = (c) => String(c || "").replace("#", "").toUpperCase() || "2563EB";
  // Chữ thuần để vẽ: đối tượng thì lấy tiêu đề/nội dung (không bao giờ in "[object Object]").
  const plain = (s) =>
    String(s == null ? "" : typeof s === "object" ? (Array.isArray(s) ? s.map((x) => (x && typeof x === "object" ? x.title || x.text || x.label || "" : x)).join(", ") : s.title || s.text || s.label || s.ten || s.term || "") : s)
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(^|\s)\*([^*\s][^*]*)\*/g, "$1$2")
      .replace(/^#+\s*/gm, "")
      .trim();

  // Xáo trộn ổn định theo hạt giống (để kế hoạch slide và tệp xuất luôn khớp nhau).
  function shuffle(list, seed) {
    let h = 0;
    String(seed).split("").forEach((c) => (h = (h * 31 + c.charCodeAt(0)) >>> 0));
    const a = list.map((x, i) => [x, i]);
    for (let i = a.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) >>> 0;
      const j = h % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.length > 1 && a.every((x, i) => x[1] === i)) a.push(a.shift());
    return a;
  }

  /* ---------- Kế hoạch trang chiếu ---------- */
  /* ---------- Làm sạch dữ liệu đầu vào: giáo án do AI soạn có thể sai kiểu, thiếu trường, khối lạ.
     Mọi trường được ép về đúng kiểu để bộ dựng không bao giờ dừng giữa chừng. ---------- */
  const toStr = (v) =>
    v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.map(toStr).filter((x) => x.trim()).join("\n") : typeof v === "object" ? toStr(v.text || v.label || v.title || v.ten || v.term || "") : String(v);
  const STRF = ["md", "text", "title", "caption", "center", "left", "right", "bothLabel", "source", "so", "ten", "mota", "chude", "label", "value", "desc", "time", "year", "term", "def", "alt", "query", "icon", "q", "explain", "question", "instructions", "task", "keyword", "keyClue", "clue", "placeholder", "mission", "script", "credit", "src", "commons", "url", "edu"];
  function cleanObj(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    const x = Object.assign({}, o);
    STRF.forEach((k) => {
      if (k in x && typeof x[k] !== "string") x[k] = toStr(x[k]);
    });
    return x;
  }
  const BKINDS = new Set(["text", "list", "image", "gallery", "timeline", "mindmap", "compare", "flow", "cycle", "venn", "pyramid", "stats", "quote", "map", "keyterms", "question", "conclusion", "note", "video", "chude", "tenbai", "muc"]);
  const strs = (v) => arr(v).filter((x) => x != null).map(toStr).filter((x) => x.trim());
  const objs = (v, f) => arr(v).filter((x) => x != null && x !== "").map((x) => (typeof x === "object" && !Array.isArray(x) ? cleanObj(x) : f(toStr(x))));
  function cleanBlock(b) {
    if (b == null || b === "") return null;
    if (typeof b !== "object" || Array.isArray(b)) {
      const t = toStr(b);
      return t.trim() ? { kind: "text", md: t } : null;
    }
    const x = cleanObj(b);
    if (!BKINDS.has(x.kind)) {
      const t = x.md || x.text || x.title || "";
      return t.trim() ? { kind: "text", md: t } : null;
    }
    const k = x.kind;
    if (k === "list" || k === "cycle") x.items = strs(arr(x.items).map((i) => (i && typeof i === "object" ? i.text || i.label || i.title : i)));
    else if (k === "keyterms") x.items = objs(x.items, (t) => ({ term: t, def: "" })).filter((i) => ((i.term || "") + (i.def || "")).trim());
    else if (k === "stats") x.items = objs(x.items, (t) => ({ value: t, label: "" })).filter((i) => ((i.value || "") + (i.label || "")).trim());
    else if ("items" in x || k === "timeline" || k === "pyramid") x.items = objs(x.items, (t) => ({ label: t })).filter((i) => (i.label || i.title || i.time || i.desc || "").trim());
    if (k === "mindmap") x.branches = arr(x.branches).filter((v) => v != null && v !== "").map((br) => (typeof br === "object" && !Array.isArray(br) ? Object.assign(cleanObj(br), { items: strs(br.items) }) : { label: toStr(br), items: [] }));
    if (k === "compare") {
      x.columns = strs(x.columns);
      x.rows = arr(x.rows).filter((r) => r != null).map((r) => (Array.isArray(r) ? r.map(toStr) : [toStr(r)]));
      const nc = Math.max(x.columns.length, ...x.rows.map((r) => r.length), 1);
      while (x.columns.length < nc) x.columns.push("");
      x.rows = x.rows.map((r) => r.slice(0, nc).concat(Array(Math.max(0, nc - r.length)).fill("")));
    }
    if (k === "flow") x.steps = arr(x.steps).filter((v) => v != null && v !== "").map((v) => (typeof v === "object" && !Array.isArray(v) ? cleanObj(v) : { label: toStr(v) }));
    if (k === "gallery") x.images = arr(x.images).filter((v) => v && typeof v === "object" && !Array.isArray(v)).map(cleanObj);
    if (k === "map") x.pins = arr(x.pins).filter((v) => v && typeof v === "object").map((v) => Object.assign(cleanObj(v), { x: Math.min(100, Math.max(0, Number(v.x) || 0)), y: Math.min(100, Math.max(0, Number(v.y) || 0)) }));
    ["leftItems", "rightItems", "both", "bai", "muc", "y"].forEach((f) => f in x && (x[f] = strs(x[f])));
    return x;
  }
  function cleanQ(q) {
    if (!q || typeof q !== "object" || Array.isArray(q)) return null;
    const x = cleanObj(q);
    x.kind = ["mcq", "tf", "short", "fill", "sort"].includes(q.kind) ? q.kind : "mcq";
    x.options = strs(q.options);
    x.statements = arr(q.statements).filter((v) => v != null).map((v) => (typeof v === "object" ? { text: toStr(v.text), answer: !!v.answer } : { text: toStr(v), answer: false }));
    x.groups = strs(q.groups);
    x.items = arr(q.items).filter((v) => v != null).map((v) => (typeof v === "object" ? { text: toStr(v.text || v.label), group: Math.max(0, Math.min(Math.max(0, x.groups.length - 1), Number(v.group) || 0)) } : { text: toStr(v), group: 0 }));
    x.bank = strs(q.bank);
    x.accept = strs(q.accept);
    if (x.kind === "mcq") x.answer = Math.max(0, Math.min(Math.max(0, x.options.length - 1), Number(q.answer) || 0));
    else if (x.kind === "short") x.answer = toStr(q.answer);
    if (!(x.q || "").trim() && !x.text && !x.options.length && !x.statements.length) return null;
    return x;
  }
  function cleanStep(st) {
    const s = cleanObj(st);
    s.minutes = Math.max(0, Math.round(Number(st.minutes) || 0));
    if ("pages" in st || s.type === "slide")
      s.pages = arr(st.pages)
        .filter((pg) => pg && typeof pg === "object")
        .map((pg) => Object.assign({}, pg, { title: toStr(pg.title), layout: ["split", "stack"].includes(pg.layout) ? pg.layout : undefined, blocks: arr(pg.blocks).map(cleanBlock).filter(Boolean) }))
        .filter((pg) => pg.blocks.length);
    if ("questions" in st) s.questions = arr(st.questions).map(cleanQ).filter(Boolean);
    if ("rows" in st && s.type === "crossword")
      s.rows = arr(st.rows)
        .filter((r) => r && typeof r === "object")
        .map((r) => {
          const answer = toStr(r.answer).replace(/\s+/g, "").toUpperCase().slice(0, 14);
          return { answer, clue: toStr(r.clue), key: Math.max(0, Math.min(answer.length - 1, Number(r.key) || 0)) };
        })
        .filter((r) => r.answer)
        .slice(0, 10);
    ["options", "roles"].forEach((f) => f in st && (s[f] = strs(st[f])));
    // Giữ nguyên kiểu từng phần tử (chuỗi vẫn là chuỗi, đối tượng được làm sạch) – mỗi loại hoạt động đọc theo cách riêng.
    ["cards", "items", "pairs", "fields", "resources", "groups"].forEach((f) => f in st && (s[f] = arr(st[f]).filter((x) => x != null && x !== "").map((x) => (typeof x === "object" && !Array.isArray(x) ? cleanObj(x) : toStr(x)))));
    return s;
  }
  function cleanPack(p) {
    const x = Object.assign({}, p);
    x.title = toStr(p.title) || "Bài học";
    x.objectives = strs(p.objectives);
    x.steps = arr(p.steps).filter((st) => st && typeof st === "object").map(cleanStep);
    return x;
  }
  function plan(packs) {
    packs = arr(packs)
      .map((p) => cleanPack(p.schema === "l360-pack/2" && p.steps ? p : L360.Pack.normalize(cleanPack(p))))
      .sort((a, b) => a.tiet.so - b.tiet.so);
    const slides = [];
    const range = {};
    const add = (o) => slides.push(o);
    packs.forEach((p, pi) => {
      add({ k: "title", p });
      if (p.objectives.length) add({ k: "goals", p });
      let prev = "";
      let notes = [];
      p.steps.forEach((s) => {
        if (s.phase !== prev) {
          add({ k: "phase", p, phase: s.phase, steps: p.steps.filter((x) => x.phase === s.phase) });
          prev = s.phase;
        }
        const from = slides.length + 1;
        const T = s.type;
        if (T === "slide") {
          const pages = (s.pages || []).flatMap(splitPage);
          pages.forEach((pg, i) => add({ k: "page", p, s, pg, i, n: pages.length }));
        }
        else if (T === "quiz" || T === "video") {
          if (T === "video") add({ k: "video", p, s });
          const qs = s.questions || [];
          // Mỗi câu một trang; đáp án và giải thích hiện ra khi giáo viên bấm (hiệu ứng), không cần trang đáp án riêng.
          qs.forEach((q, i) => add({ k: "q", p, s, q, i, n: qs.length }));
        } else if (T === "poll2") {
          const q = { kind: "mcq", q: s.question, options: s.options || [], answer: s.answer, explain: s.explain, opinion: s.answer == null };
          add({ k: "q", p, s, q, i: 0, n: 1 });
        } else if (T === "crossword") add({ k: "cw", p, s });
        else if (T === "match" || T === "order") add({ k: T, p, s });
        else if (T === "groupwork") {
          add({ k: "group", p, s });
          add({ k: "sheet", p, s });
        } else if (T === "cards" || T === "auction") add({ k: T, p, s });
        else add({ k: "task", p, s });
        range[s.id] = [from, slides.length];
        const d = L360.describeStep ? L360.describeStep(s) : { notes: [] };
        notes = notes.concat(d.notes.filter(Boolean));
      });
      // Ghi nhớ: chia trang theo độ dài (tối đa 6 ý, ~13 dòng chữ 16 pt mỗi trang) để chữ luôn đủ lớn khi chiếu.
      const NL = (t) => Math.max(1, Math.ceil(t.length / 86));
      const items = [];
      notes.forEach((x) => {
        const t = plain(x).replace(/^\s*[-•]\s*/gm, "").replace(/\n+/g, " ").trim();
        if (!t) return;
        if (NL(t) <= 11) return items.push(t);
        let cur = "";
        t.split(/(?<=[.;!?])\s+/).forEach((sx) => {
          if (cur && NL(cur + " " + sx) > 11) {
            items.push(cur);
            cur = sx;
          } else cur = cur ? cur + " " + sx : sx;
        });
        if (cur) items.push(cur);
      });
      const chunks = [];
      let cur = [];
      let lines = 0;
      items.forEach((t) => {
        if (cur.length && (cur.length >= 6 || lines + NL(t) > 12)) {
          chunks.push(cur);
          cur = [];
          lines = 0;
        }
        cur.push(t);
        lines += NL(t);
      });
      if (cur.length) chunks.push(cur);
      chunks.forEach((c, i) => add({ k: "recap", p, notes: c, part: chunks.length > 1 ? `${i + 1}/${chunks.length}` : "" }));
      if (pi === packs.length - 1) add({ k: "end", p, vd: p.steps.find((s) => s.phase === "van-dung"), hw: L360.Pack.homework(p) });
    });
    return { slides, range, packs };
  }

  /* ---------- Đo chữ (ước lượng để chữ không tràn khung) ---------- */
  function fit(text, w, h, max = 24, min = 11, k = 0.52) {
    const paras = String(text || "").split("\n");
    for (let s = max; s > min; s--) {
      const cpl = Math.max(4, Math.floor((w - 0.15) / ((s * k) / 72)));
      const lines = paras.reduce((n, p) => n + Math.max(1, Math.ceil(p.length / cpl)), 0);
      if ((lines * s * 1.22) / 72 + ((paras.length - 1) * s * 0.3) / 72 <= h - 0.12) return s;
    }
    return min;
  }
  // Mục đã có số thứ tự sẵn (I., 1., a), Bài 1…) thì không đánh số thêm.
  const numbered = (x) => /^\s*(?:(?:[IVXLC]+|\d+(?:\.\d+)*|[a-zđ])[.)]\s|(?:Bài|Chủ đề|Chuyên đề|Mục|Phần)\s)/i.test(String(x || ""));
  /* ---------- Chiều cao tối thiểu của mỗi khối (chữ ≥ 14 pt khi chiếu) – dùng để chia trang, không để chữ bị thu nhỏ ---------- */
  const PLAIN = (b) => (L360.blocks && L360.blocks.plain ? L360.blocks.plain(b) : "") || "";
  function linesAt(text, w, pt) {
    const cpl = Math.max(8, Math.floor((w - 0.2) / ((pt * 0.52) / 72)));
    return String(text || "")
      .split("\n")
      .reduce((n, p) => n + Math.max(1, Math.ceil(p.length / cpl)), 0);
  }
  const lineH = (n, pt) => (n * pt * 1.3) / 72;
  const VISK = ["image", "gallery", "map", "video"];
  const HEROK = ["chude", "tenbai", "muc"];
  function minH(b, w) {
    switch (b.kind) {
      case "image":
      case "map":
        return 2.4;
      case "gallery":
        return 2.7;
      case "video":
        return 1.2;
      case "timeline":
        return 2.4;
      case "mindmap":
        return 3.6;
      case "cycle":
      case "venn":
        return 3.3;
      case "pyramid":
        return 0.4 + arr(b.items).length * 0.62;
      case "flow":
        return 1.9;
      case "stats":
        return 1.6;
      case "compare":
        return 0.45 + (arr(b.rows).length + 1) * 0.46;
      case "quote":
        return 0.8 + lineH(linesAt(PLAIN(b), w - 0.5, 16), 16);
      case "question":
      case "conclusion":
      case "note":
        return 0.8 + lineH(linesAt(String(b.text || "").replace(/\*\*/g, ""), w - 0.45, 16), 16);
      case "keyterms":
        return 0.5 + lineH(linesAt(arr(b.items).map((x) => `${x.term}: ${x.def}`).join("\n"), w, 16), 16);
      default:
        return (b.title ? 0.4 : 0) + 0.2 + lineH(linesAt(PLAIN(b), w, 16), 16);
    }
  }
  // Tách một khối chữ quá dài thành nhiều khối (theo dòng/ý) để không phải thu nhỏ chữ.
  function splitLong(b, w, avail) {
    if (minH(b, w) <= avail) return [b];
    const key = b.kind === "list" ? "items" : b.kind === "keyterms" ? "items" : ["note", "conclusion", "question"].includes(b.kind) ? "text" : b.md != null ? "md" : b.text != null ? "text" : "";
    if (!key) return [b];
    const parts = Array.isArray(b[key]) ? b[key].slice() : String(b[key] || "").split("\n");
    if (parts.length < 2) return [b];
    const out = [];
    let cur = [];
    const mk = (xs) => Object.assign({}, b, { [key]: Array.isArray(b[key]) ? xs : xs.join("\n") });
    parts.forEach((x) => {
      const t = mk(cur.concat([x]));
      if (cur.length && minH(t, w) > avail) {
        out.push(mk(cur));
        cur = [x];
      } else cur.push(x);
    });
    if (cur.length) out.push(mk(cur));
    return out.map((x, i) => (i ? Object.assign(x, { title: b.title ? b.title + " (tiếp)" : x.title }) : x));
  }
  // Một trang trong gói có thể thành nhiều trang chiếu khi nhiều khối: mỗi khối luôn đủ chỗ, chữ không bị thu nhỏ.
  const AVAIL = 7.5 - 1.95 - 0.62;
  function splitPage(pg) {
    const bl = arr(pg.blocks);
    if (!bl.length) return [pg];
    // Trang chủ đề/tên bài/tên mục luôn đứng một mình; khối khác đi cùng thì tách ra trang riêng.
    if (bl.some((b) => HEROK.includes(b.kind))) {
      if (bl.every((b) => HEROK.includes(b.kind)) && bl.length === 1) return [pg];
      const out = [];
      let run = [];
      const flush = () => {
        if (run.length) out.push(...splitPage(Object.assign({}, pg, { blocks: run })));
        run = [];
      };
      bl.forEach((b) => {
        if (HEROK.includes(b.kind)) {
          flush();
          out.push(Object.assign({}, pg, { title: "", blocks: [b] }));
        } else run.push(b);
      });
      flush();
      return out;
    }
    const CW = 13.333 - 2 * 0.6;
    const vis = bl.filter((b) => VISK.includes(b.kind));
    const rest = bl.filter((b) => !VISK.includes(b.kind));
    const split = (pg.layout || (vis.length && rest.length ? "split" : "stack")) === "split" && vis.length && rest.length;
    const w = split ? CW - CW * 0.47 - 0.3 : CW;
    const visFirst = split ? vis.slice(0, 2) : [];
    const list = (split ? rest : bl).flatMap((b) => splitLong(b, w, AVAIL));
    const visMore = split ? vis.slice(2) : [];
    const pages = [];
    let cur = [];
    let used = 0;
    list.forEach((b) => {
      // Trang đầu (có ảnh) dùng cột phải; trang tiếp theo dùng cả chiều ngang.
      const m = Math.min(minH(b, pages.length ? CW : w), AVAIL);
      if (cur.length && used + 0.18 + m > AVAIL) {
        pages.push(cur);
        cur = [];
        used = 0;
      }
      used += (cur.length ? 0.18 : 0) + m;
      cur.push(b);
    });
    if (cur.length) pages.push(cur);
    // Ảnh thứ 3 trở đi: sang trang riêng, mỗi trang tối đa 2 ảnh.
    for (let i = 0; i < visMore.length; i += 2) pages.push(visMore.slice(i, i + 2));
    if (pages.length <= 1 && list.length === bl.length - visFirst.length) return [pg];
    return pages.map((c, i) => Object.assign({}, pg, { blocks: i === 0 && split ? visFirst.concat(c) : c, title: i && (pg.title || "") ? `${pg.title} (tiếp)` : pg.title, layout: i === 0 && split ? "split" : "stack" }));
  }
  // Markdown nhẹ → các đoạn chữ PptxGenJS (đậm, gạch đầu dòng).
  function runs(md, base = {}) {
    const out = [];
    String(md || "")
      .replace(/\r/g, "")
      .split("\n")
      .filter((l, i, a) => l.trim() || (i && a[i - 1].trim()))
      .forEach((line) => {
        let t = line.trim();
        const bullet = /^[-•*]\s+/.test(t);
        if (bullet) t = t.replace(/^[-•*]\s+/, "");
        t = t.replace(/^#+\s*/, "");
        const parts = t.split(/(\*\*[^*]+\*\*)/).filter((x) => x !== "");
        if (!parts.length) parts.push(" ");
        parts.forEach((part, i) => {
          const bold = /^\*\*[^*]+\*\*$/.test(part);
          out.push({
            text: bold ? part.slice(2, -2) : part.replace(/(^|\s)\*([^*\s][^*]*)\*/g, "$1$2"),
            options: Object.assign({}, base, bold ? { bold: true } : {}, bullet && i === 0 ? { bullet: { indent: 16 } } : {}, i === parts.length - 1 ? { breakLine: true } : {})
          });
        });
      });
    if (out.length) delete out[out.length - 1].options.breakLine;
    return out;
  }

  /* ---------- Ảnh: tải trước về dạng dữ liệu (tránh lỗi CORS khi đóng gói) ---------- */
  async function loadImage(src) {
    if (!src) return null;
    try {
      let data = src;
      if (!/^data:/.test(src)) {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 12000);
        const r = await fetch(src, { signal: ctl.signal, mode: "cors" });
        clearTimeout(to);
        if (!r.ok) return null;
        const blob = await r.blob();
        if (!/^image\//.test(blob.type)) return null;
        data = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.readAsDataURL(blob);
        });
      }
      const dim = await new Promise((res) => {
        const im = new Image();
        im.onload = () => res({ w: im.naturalWidth || 4, h: im.naturalHeight || 3 });
        im.onerror = () => res(null);
        im.src = data;
      });
      if (!dim) return null;
      // Ảnh webp/svg → chuyển sang PNG cho PowerPoint.
      if (!/^data:image\/(png|jpe?g|gif)/i.test(data)) {
        const c = document.createElement("canvas");
        c.width = Math.min(1600, dim.w);
        c.height = Math.round((c.width * dim.h) / dim.w);
        const im = new Image();
        await new Promise((r) => ((im.onload = r), (im.onerror = r), (im.src = data)));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        data = c.toDataURL("image/png");
      } else if (dim.w > 1920 || data.length > 1600000) {
        // Ảnh quá lớn → thu về 1600 px để tệp nhẹ, mở nhanh trên máy chiếu.
        const c = document.createElement("canvas");
        c.width = Math.min(1600, dim.w);
        c.height = Math.round((c.width * dim.h) / dim.w);
        const im = new Image();
        await new Promise((r) => ((im.onload = r), (im.onerror = r), (im.src = data)));
        const g = c.getContext("2d");
        const png = /^data:image\/png/i.test(data);
        if (!png) {
          g.fillStyle = "#FFFFFF";
          g.fillRect(0, 0, c.width, c.height);
        }
        g.drawImage(im, 0, 0, c.width, c.height);
        const d2 = png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86);
        if (d2.length < data.length) data = d2;
      }
      return { data, w: dim.w, h: dim.h };
    } catch (e) {
      return null;
    }
  }
  function imageSrcs(packs) {
    const out = new Set();
    packs.forEach((p) =>
      p.steps.forEach((s) => {
        (s.pages || []).forEach((pg) =>
          (pg.blocks || []).forEach((b) => {
            if ((b.kind === "image" || b.kind === "map") && b.src) out.add(b.src);
            if (b.kind === "gallery") (b.images || []).forEach((im) => im.src && out.add(im.src));
            if (b.kind === "video") {
              const v = L360.videoSource ? L360.videoSource(b) : {};
              if (v.poster) out.add(v.poster);
            }
          })
        );
        (s.questions || []).forEach((q) => q.image && out.add(q.image));
        if (s.type === "auction") (s.items || []).forEach((x) => x.image && out.add(x.image));
        if (s.type === "video") {
          const v = L360.videoSource ? L360.videoSource(s.source || {}) : {};
          if (v.poster) out.add(v.poster);
        }
      })
    );
    return [...out];
  }

  /* ---------- Dựng tệp ---------- */
  async function build(packsIn, opt = {}) {
    await u.loadScript("js/vendor/pptxgen.bundle.js");
    const pl = plan(packsIn);
    const packs = pl.packs;
    const p0 = packs[0];
    const D = L360.Design.resolve(p0);
    const pal = D.palette;
    const dark = !!(D.style && D.style.dark) || D.id === "cong-nghe";
    const col = {
      accent: hex(pal.accent),
      accent2: hex(pal.accent2),
      soft: hex(pal.soft),
      bg: dark ? hex(pal.ink) : hex(pal.bg),
      ink: dark ? "F4F7FB" : hex(pal.ink),
      muted: dark ? "AFC0D6" : "5B6678",
      card: dark ? "1A2E45" : "FFFFFF",
      line: dark ? "33506E" : "DCE2EA"
    };
    const FONT = opt.font || "Arial";
    const HFONT = opt.font || "Arial";
    const decor = ["su-lieu", "dong-ho"].includes(D.id) ? "frame" : ["ban-do", "so-tay", "thien-nhien"].includes(D.id) ? "band" : "circles";

    const imgs = {};
    const LOGO_A = "assets/img/logo-l360-ngang-trong.png";
    const LOGO_B = "assets/img/logo-hsh-goc.png";
    const srcs = imageSrcs(packs).concat([LOGO_A, LOGO_B]);
    let done = 0;
    await Promise.all(
      srcs.map(async (s) => {
        imgs[s] = await loadImage(s);
        done++;
        opt.onProgress && opt.onProgress(`Đang tải ảnh ${done}/${srcs.length}…`);
      })
    );

    const pptx = new window.PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    // PptxGenJS không thoát kí tự XML trong thuộc tính tệp (&, <, >) → làm sạch trước.
    const meta = (t) => String(t || "").replace(/&/g, "và").replace(/[<>"]/g, "");
    pptx.author = meta(opt.author || (L360.Auth && L360.Auth.teacher && L360.Auth.teacher.name));
    pptx.company = meta(L360.cfg && L360.cfg.school);
    pptx.title = meta(p0.title);
    const S = pptx.ShapeType;
    const total = pl.slides.length;

    /* --- tiện ích vẽ --- */
    const T = (sl, text, o) => sl.addText(text, Object.assign({ fontFace: FONT, color: col.ink, margin: 0.04, valign: "top" }, o));
    const box = (sl, x, y, w, h, o = {}) =>
      sl.addShape(S.roundRect, Object.assign({ x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || col.card }, line: o.line ? { color: o.line, width: o.lw || 1, dashType: o.dash || "solid" } : { type: "none" } }, o.shadow ? { shadow: { type: "outer", blur: 6, offset: 1.5, angle: 90, color: "000000", opacity: 0.12 } } : {}));
    const pill = (sl, text, x, y, color, o = {}) => {
      text = String(text || "").replace(/\s+/g, " ").trim();
      const maxW = Math.max(1.1, (o.maxW || W - MX) - x);
      if (0.13 * text.length * ((o.size || 11) / 11) + 0.4 > maxW) text = text.slice(0, Math.max(4, Math.floor((maxW - 0.4) / (0.13 * ((o.size || 11) / 11))) - 1)).trim() + "…";
      const w = Math.min(maxW, Math.max(1.1, 0.13 * text.length * ((o.size || 11) / 11) + 0.4));
      sl.addShape(S.roundRect, { x, y, w, h: o.h || 0.32, rectRadius: 0.16, fill: { color }, line: { type: "none" } });
      T(sl, text, { x, y, w, h: o.h || 0.32, fontSize: o.size || 11, bold: true, color: o.color || "FFFFFF", align: "center", valign: "middle", charSpacing: 1 });
      return w;
    };
    const img = (sl, src, x, y, w, h, o = {}) => {
      const im = imgs[src];
      if (!im) {
        // Chưa có ảnh: khung chờ gọn gàng để giáo viên chèn ảnh (không hiện từ khoá tìm kiếm).
        box(sl, x, y, w, h, { fill: col.soft, line: col.line, dash: "dash" });
        T(sl, [{ text: "🖼", options: { fontSize: 26, breakLine: true } }, { text: "Chèn ảnh minh hoạ", options: { fontSize: 12, bold: true } }], { x, y, w, h, color: col.muted, align: "center", valign: "middle" });
        return { x, y, w, h };
      }
      const r = im.w / im.h;
      if (o.cover) {
        const k = Math.max(w / im.w, h / im.h);
        sl.addImage({ data: im.data.replace(/^data:/, ""), x, y, w: im.w * k, h: im.h * k, sizing: { type: "cover", w, h } });
        return { x, y, w, h };
      }
      let iw = w;
      let ih = w / r;
      if (ih > h) {
        ih = h;
        iw = h * r;
      }
      const ix = x + (w - iw) / 2;
      const iy = y + (h - ih) / 2;
      sl.addImage({ data: im.data.replace(/^data:/, ""), x: ix, y: iy, w: iw, h: ih, rounding: false });
      return { x: ix, y: iy, w: iw, h: ih };
    };
    /* --- hiệu ứng (đánh dấu hình bằng tên; sau khi đóng gói sẽ dựng phần <p:timing> cho PowerPoint) --- */
    const click = (sl) => ++sl._click;
    const anim = (sl, k, fx, fn, dur) => {
      const prev = sl._an;
      sl._an = k ? { k, fx: fx || "fade", dur: dur || 0 } : null;
      try {
        return fn();
      } finally {
        sl._an = prev;
      }
    };
    // Đồng hồ hoạt động chạy offline: bấm nút "► Bắt đầu" thì thanh rút ngắn dần trong N phút, hết giờ hiện "Hết giờ!".
    // Đồng hồ là một chuỗi hiệu ứng riêng gắn với nút (trigger): bấm tiếp để hiện nội dung khác không làm đồng hồ nhảy tới cuối.
    const timerBar = (sl, minutes) => {
      const m = Math.round(Number(minutes) || 0);
      if (m < 1) return;
      const y = H - 0.78;
      const x = MX + 2.4;
      const w = W - 2 * MX - 2.4 - 1.5;
      const k = 900 + ++sl._trig;
      anim(sl, k, "button", () =>
        T(sl, `► Bắt đầu · ${m} phút`, { shape: S.roundRect, rectRadius: 0.2, x: MX, y: y - 0.14, w: 2.25, h: 0.42, fill: { color: col.accent2 }, line: { type: "none" }, color: "FFFFFF", fontSize: 13, bold: true, align: "center", valign: "middle", margin: 0 })
      );
      sl.addShape(S.roundRect, { x, y, w, h: 0.14, rectRadius: 0.07, fill: { color: col.line }, line: { type: "none" } });
      anim(sl, k, "timer", () => sl.addShape(S.roundRect, { x, y, w, h: 0.14, rectRadius: 0.07, fill: { color: col.accent }, line: { type: "none" } }), m * 60000);
      // vạch chia từng phút để đọc nhanh số phút còn lại
      if (m > 1 && m <= 30) for (let i = 1; i < m; i++) sl.addShape(S.rect, { x: x + (w * i) / m - 0.01, y, w: 0.02, h: 0.14, fill: { color: "FFFFFF" }, line: { type: "none" } });
      anim(sl, k, "after", () => T(sl, "Hết giờ!", { shape: S.roundRect, rectRadius: 0.19, x: W - MX - 1.35, y: y - 0.12, w: 1.35, h: 0.38, fill: { color: "D2453B" }, line: { type: "none" }, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 }), m * 60000);
    };
    const decorate = (sl, strong) => {
      if (decor === "circles") {
        sl.addShape(S.ellipse, { x: W - 2.3, y: -1.75, w: 3.3, h: 3.3, fill: { color: strong ? col.accent2 : col.soft, transparency: strong ? 40 : 10 }, line: { type: "none" } });
        sl.addShape(S.ellipse, { x: W - 1.15, y: 1.0, w: 0.5, h: 0.5, fill: { color: col.accent, transparency: 55 }, line: { type: "none" } });
      } else if (decor === "frame") {
        sl.addShape(S.rect, { x: 0.2, y: 0.2, w: W - 0.4, h: H - 0.4, fill: { type: "none" }, line: { color: strong ? "FFFFFF" : col.accent, width: 1.25, transparency: strong ? 40 : 0 } });
        sl.addShape(S.rect, { x: 0.28, y: 0.28, w: W - 0.56, h: H - 0.56, fill: { type: "none" }, line: { color: strong ? "FFFFFF" : col.accent2, width: 0.5, transparency: strong ? 60 : 30 } });
      } else {
        sl.addShape(S.rect, { x: 0, y: 0, w: 0.16, h: H, fill: { color: strong ? col.accent2 : col.accent }, line: { type: "none" } });
        sl.addShape(S.rect, { x: W - 3.2, y: 0, w: 3.2, h: 0.08, fill: { color: strong ? "FFFFFF" : col.accent, transparency: 30 }, line: { type: "none" } });
      }
    };
    const footer = (sl, p, n, light) => {
      let lbl = [L360.Pack.label(p), p.bai && p.bai.ten ? p.bai.ten : p.title].filter(Boolean).join(" · ").replace(/\s+/g, " ").trim();
      if (lbl.length > 120) lbl = lbl.slice(0, 118).replace(/\s+\S*$/, "") + "…";
      T(sl, lbl, { x: MX, y: H - 0.42, w: 9, h: 0.28, fontSize: 9, color: light ? "FFFFFF" : col.muted, transparency: light ? 20 : 0 });
      T(sl, `${n}/${total}`, { x: W - MX - 1.2, y: H - 0.42, w: 1.2, h: 0.28, fontSize: 9, color: light ? "FFFFFF" : col.muted, align: "right" });
    };
    const header = (sl, ph, title, o = {}) => {
      sl.background = { color: col.bg };
      decorate(sl, false);
      const pw = pill(sl, PH_NAME[ph] || o.label || "", MX, 0.42, PH[ph] || col.accent, { size: 10, h: 0.3 });
      if (o.chip) pill(sl, o.chip, MX + pw + 0.12, 0.42, col.soft, { size: 10, h: 0.3, color: col.accent2 });
      if (o.ghi) {
        sl.addShape(S.roundRect, { x: W - MX - 2.15, y: 0.4, w: 2.15, h: 0.36, rectRadius: 0.18, fill: { color: "FFF4D6" }, line: { color: "E0A100", width: 1 } });
        T(sl, "✎  GHI VÀO VỞ", { x: W - MX - 2.15, y: 0.4, w: 2.15, h: 0.36, fontSize: 11, bold: true, color: "8A5A00", align: "center", valign: "middle" });
      }
      const t = plain(title);
      T(sl, t, { x: MX, y: 0.82, w: W - 2 * MX - (decor === "circles" ? 1.4 : 0), h: 0.8, fontFace: HFONT, fontSize: fit(t, W - 2 * MX - 1.4, 0.8, 30, 18), bold: true, color: col.ink, valign: "middle" });
      sl.addShape(S.rect, { x: MX, y: 1.66, w: 0.9, h: 0.06, fill: { color: PH[ph] || col.accent }, line: { type: "none" } });
    };

    /* --- khối nội dung trong một vùng --- */
    const VIS = ["image", "gallery", "map", "video"];
    const weight = (b) => {
      const t = L360.blocks.plain(b) || "";
      switch (b.kind) {
        case "image":
        case "gallery":
        case "map":
          return 5;
        case "timeline":
          return 2.6;
        case "mindmap":
        case "cycle":
        case "venn":
          return 4.2;
        case "pyramid":
          return 3.4;
        case "flow":
          return 1.9;
        case "stats":
          return 1.6;
        case "compare":
          return 1 + arr(b.rows).length * 0.55;
        case "video":
          return 1.5;
        case "note":
        case "conclusion":
          return 1.1 + Math.min(4, t.length / 80);
        default:
          return 0.9 + Math.min(4, t.length / 110) + (b.title ? 0.35 : 0);
      }
    };
    function blockTitle(sl, b, x, y, w, def) {
      let t = plain(b.title || def || "").replace(/\s+/g, " ").trim();
      if (!t) return 0;
      const tmax = Math.floor(w / 0.115);
      if (t.length > tmax) t = t.slice(0, tmax - 1).replace(/\s+\S*$/, "") + "…";
      T(sl, t, { x, y, w, h: 0.36, fontSize: 14, bold: true, color: col.accent2 });
      return 0.38;
    }
    function drawBlock(sl, b, x, y, w, h) {
      const k = b.kind;
      if (k === "image") {
        const cap = L360.shortCap ? L360.shortCap(plain(b.caption || "")) : plain(b.caption || "");
        const capH = cap ? 0.38 : 0;
        const r = img(sl, b.src, x, y, w, h - capH, { alt: b.query || b.caption });
        if (capH) T(sl, cap, { x, y: r.y + r.h + 0.04, w, h: capH - 0.04, fontSize: 12, italic: true, color: col.ink, align: "center" });
        return;
      }
      if (k === "gallery") {
        const ims = arr(b.images).slice(0, 4);
        const ty = blockTitle(sl, b, x, y, w);
        const n = ims.length || 1;
        const cols = n <= 2 ? n : 2;
        const rows = Math.ceil(n / cols);
        const gw = (w - (cols - 1) * 0.15) / cols;
        const gh = (h - ty - (rows - 1) * 0.15) / rows;
        ims.forEach((im, i) => {
          const cx = x + (i % cols) * (gw + 0.15);
          const cy = y + ty + Math.floor(i / cols) * (gh + 0.15);
          const r = img(sl, im.src, cx, cy, gw, gh - 0.3, { alt: im.query || im.caption });
          T(sl, plain(im.caption || ""), { x: cx, y: r.y + r.h + 0.02, w: gw, h: 0.28, fontSize: 11, italic: true, align: "center", color: col.ink });
        });
        return;
      }
      if (k === "map") {
        const pins = arr(b.pins);
        const legW = pins.length ? Math.min(3.2, w * 0.36) : 0;
        const r = img(sl, b.src, x, y, w - legW - (legW ? 0.15 : 0), h - 0.3, { alt: b.query || "Bản đồ" });
        pins.forEach((p, i) => {
          const px = r.x + (r.w * (Number(p.x) || 0)) / 100 - 0.16;
          const py = r.y + (r.h * (Number(p.y) || 0)) / 100 - 0.16;
          sl.addShape(S.ellipse, { x: px, y: py, w: 0.32, h: 0.32, fill: { color: "D2453B" }, line: { color: "FFFFFF", width: 1.5 } });
          T(sl, String(i + 1), { x: px, y: py, w: 0.32, h: 0.32, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
        });
        if (legW) {
          const lt = pins.map((p, i) => `${i + 1}. ${plain(p.label)}`).join("\n");
          T(sl, lt, { x: x + w - legW, y, w: legW, h: h - 0.3, fontSize: fit(lt, legW, h - 0.3, 16, 11), color: col.ink, paraSpaceAfter: 4 });
        }
        if (b.caption) T(sl, plain(b.caption || ""), { x, y: y + h - 0.28, w, h: 0.28, fontSize: 10, italic: true, color: col.muted });
        return;
      }
      if (k === "video") {
        const v = L360.videoSource ? L360.videoSource(b) : { url: b.src };
        box(sl, x, y, w, h, { fill: col.soft });
        const pv = v.poster && imgs[v.poster] ? img(sl, v.poster, x + 0.1, y + 0.1, Math.min(w * 0.45, (h - 0.2) * 1.78), h - 0.2) : null;
        const tx = pv ? pv.x + pv.w + 0.2 : x + 0.25;
        T(sl, [{ text: "▶  ", options: { color: col.accent, bold: true } }, { text: plain(b.caption || v.title || "Xem video"), options: { bold: true, hyperlink: v.page || v.url ? { url: v.page || v.url } : undefined } }], {
          x: tx,
          y: y + 0.1,
          w: x + w - tx - 0.1,
          h: h - 0.2,
          fontSize: 16,
          valign: "middle"
        });
        return;
      }
      if (k === "timeline") {
        const it = arr(b.items).slice(0, 8);
        const ty = blockTitle(sl, b, x, y, w);
        const n = Math.max(1, it.length);
        const cw = w / n;
        const ly = y + ty + (h - ty) * 0.38;
        sl.addShape(S.rect, { x: x + 0.05, y: ly - 0.025, w: w - 0.1, h: 0.05, fill: { color: col.accent }, line: { type: "none" } });
        const fs = fit(it.map((t) => plain(t.label || t.title || "")).join("\n"), cw * n, (h - ty) * 0.55 * 2, 16, 11);
        it.forEach((t, i) => anim(sl, sl._sub ? click(sl) : 0, "fade", () => {
          const cx = x + i * cw;
          sl.addShape(S.ellipse, { x: cx + cw / 2 - 0.13, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: col.card }, line: { color: col.accent, width: 2.5 } });
          T(sl, plain(t.time || t.year || ""), { x: cx + 0.04, y: ly - 0.62, w: cw - 0.08, h: 0.44, fontSize: Math.min(18, fs + 3), bold: true, color: col.accent2, align: "center", valign: "bottom" });
          const body = [{ text: plain(t.label || t.title || ""), options: { bold: true, breakLine: !!t.desc } }].concat(t.desc ? [{ text: plain(t.desc), options: { fontSize: Math.max(10, fs - 2), color: col.muted } }] : []);
          T(sl, body, { x: cx + 0.04, y: ly + 0.2, w: cw - 0.08, h: y + h - ly - 0.2, fontSize: fs, align: "center", color: col.ink });
        }));
        return;
      }
      if (k === "mindmap") {
        const br = arr(b.branches).slice(0, 6);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const cw = Math.min(2.8, w * 0.3);
        const chh = 0.9;
        // Quy ước: nhánh 1 ở góc trên bên phải, đánh số theo chiều kim đồng hồ; mỗi nhánh một màu.
        const MMC = ["2F6FDB", "E8930C", "1E8E5A", "D2453B", "0C9A9A", "8A5A2B"];
        br.forEach((bb, i) => (bb = br[i] = Object.assign({}, bb, { _n: i + 1, _c: MMC[i % 6] })));
        const nr = Math.ceil(br.length / 2);
        const right = br.slice(0, nr);
        const left = br.slice(nr).reverse();
        const bw = Math.min(3.6, (w - cw) / 2 - 0.35);
        const side = (list, isRight) => {
          const bh = Math.min(1.7, (h - (list.length - 1) * 0.15) / Math.max(1, list.length));
          const total = list.length * bh + (list.length - 1) * 0.15;
          // Hiện theo số thứ tự nhánh: bên phải từ trên xuống, bên trái từ dưới lên (chiều kim đồng hồ).
          (isRight ? list.map((bb, i) => [bb, i]) : list.map((bb, i) => [bb, i]).reverse()).forEach(([bb, i]) => anim(sl, sl._sub ? click(sl) : 0, "fade", () => {
            const bx = isRight ? x + w - bw : x;
            const by = cy - total / 2 + i * (bh + 0.15);
            const c = bb._c;
            sl.addShape(S.line, { x: isRight ? cx + cw / 2 : bx + bw, y: Math.min(cy, by + bh / 2), w: Math.abs((isRight ? bx : cx - cw / 2) - (isRight ? cx + cw / 2 : bx + bw)), h: Math.max(0.001, Math.abs(by + bh / 2 - cy)), line: { color: c, width: 2.5 }, flipV: by + bh / 2 < cy });
            box(sl, bx, by, bw, bh, { fill: col.card, line: c, lw: 1.5 });
            sl.addShape(S.rect, { x: bx + 0.06, y: by + 0.06, w: bw - 0.12, h: 0.07, fill: { color: c }, line: { type: "none" } });
            const items = arr(bb.items).map((s) => "• " + plain(s));
            const lab = `${bb._n}. ${bb.icon ? plain(bb.icon) + " " : ""}${plain(bb.label)}`;
            const txt = [lab].concat(items).join("\n");
            const fs = fit(txt, bw - 0.2, bh - 0.18, 16, 11);
            T(sl, [{ text: lab, options: { bold: true, color: c, breakLine: items.length > 0 } }].concat(items.map((s, j) => ({ text: s, options: { fontSize: Math.max(10, fs - 1), breakLine: j < items.length - 1 } }))), {
              x: bx + 0.1,
              y: by + 0.13,
              w: bw - 0.2,
              h: bh - 0.18,
              fontSize: fs,
              valign: "middle"
            });
          }));
        };
        sl.addShape(S.roundRect, { x: cx - cw / 2, y: cy - chh / 2, w: cw, h: chh, rectRadius: 0.45, fill: { color: col.accent }, line: { type: "none" } });
        const ct = plain(b.center || b.title || "");
        T(sl, ct, { x: cx - cw / 2 + 0.1, y: cy - chh / 2, w: cw - 0.2, h: chh, fontSize: fit(ct, cw - 0.2, chh, 18, 11), bold: true, color: "FFFFFF", align: "center", valign: "middle" });
        side(right, true);
        side(left, false);
        return;
      }
      if (k === "compare") {
        const cols = arr(b.columns);
        const rows = arr(b.rows);
        const ty = blockTitle(sl, b, x, y, w);
        const all = [cols].concat(rows).map((r) => arr(r).map(plain).join(" "));
        const fs = fit(all.join("\n"), w * 0.9, h - ty, 16, 11);
        const data = [cols.map((c) => ({ text: plain(c), options: { bold: true, color: "FFFFFF", fill: { color: col.accent }, align: "center" } }))].concat(
          rows.map((r, ri) => arr(r).map((c, ci) => ({ text: plain(c), options: { bold: ci === 0, fill: { color: ri % 2 ? col.card : col.soft }, color: dark ? "0F1B2D" : col.ink } })))
        );
        if (cols.length)
          sl.addTable(data, { x, y: y + ty, w, colW: cols.map(() => w / cols.length), fontFace: FONT, fontSize: fs, border: { type: "solid", pt: 0.75, color: col.line }, valign: "middle", margin: 0.06, autoPage: false });
        return;
      }
      if (k === "flow" || k === "cycle") {
        const st = arr(k === "flow" ? b.steps : b.items).slice(0, 6).map((s) => (typeof s === "string" ? { label: s } : s));
        const ty = blockTitle(sl, b, x, y, w);
        const n = Math.max(1, st.length);
        if (k === "flow") {
          const gap = 0.32;
          const bw = (w - gap * (n - 1)) / n;
          const bh = Math.min(h - ty, 2.4);
          const by = y + ty + (h - ty - bh) / 2;
          const txt = st.map((s) => plain(s.label) + (s.desc ? "\n" + plain(s.desc) : "")).join("\n");
          const fs = fit(txt, bw * n, bh * 1.6, 16, 11);
          st.forEach((s, i) => anim(sl, sl._sub ? click(sl) : 0, "fade", () => {
            const bx = x + i * (bw + gap);
            box(sl, bx, by, bw, bh, { fill: i % 2 ? col.soft : col.card, line: col.accent, lw: 1.25 });
            sl.addShape(S.ellipse, { x: bx + bw / 2 - 0.2, y: by - 0.2, w: 0.4, h: 0.4, fill: { color: col.accent }, line: { color: col.bg, width: 2 } });
            T(sl, String(i + 1), { x: bx + bw / 2 - 0.2, y: by - 0.2, w: 0.4, h: 0.4, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
            T(sl, [{ text: plain(s.label), options: { bold: true, breakLine: !!s.desc } }].concat(s.desc ? [{ text: plain(s.desc), options: { fontSize: Math.max(10, fs - 2), color: col.muted } }] : []), {
              x: bx + 0.08,
              y: by + 0.22,
              w: bw - 0.16,
              h: bh - 0.3,
              fontSize: fs,
              align: "center",
              valign: "middle"
            });
            if (i > 0) sl.addShape(S.rightArrow, { x: bx - gap + 0.04, y: by + bh / 2 - 0.12, w: gap - 0.08, h: 0.24, fill: { color: col.accent }, line: { type: "none" } });
          }));
        } else {
          const cx = x + w / 2;
          const cy = y + ty + (h - ty) / 2;
          const R = Math.min(w, h - ty) / 2 - 0.55;
          sl.addShape(S.ellipse, { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R, fill: { type: "none" }, line: { color: col.accent, width: 2, dashType: "dash" } });
          if (b.center) T(sl, plain(b.center), { x: cx - R * 0.6, y: cy - 0.5, w: R * 1.2, h: 1, fontSize: 16, bold: true, align: "center", valign: "middle", color: col.accent2 });
          const nw = Math.min(2.4, R * 1.15);
          st.forEach((s, i) => anim(sl, sl._sub ? click(sl) : 0, "fade", () => {
            const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
            const nx = cx + R * Math.cos(a) - nw / 2;
            const ny = cy + R * Math.sin(a) - 0.42;
            box(sl, nx, ny, nw, 0.84, { fill: col.card, line: col.accent, lw: 1.25 });
            const t = `${i + 1}. ${plain(s.label)}`;
            T(sl, t, { x: nx + 0.06, y: ny, w: nw - 0.12, h: 0.84, fontSize: fit(t, nw - 0.12, 0.84, 14, 10), bold: true, align: "center", valign: "middle" });
          }));
        }
        return;
      }
      if (k === "venn") {
        const ty = blockTitle(sl, b, x, y, w);
        const hh = h - ty;
        const cw = Math.min(w * 0.58, hh * 1.5);
        const cy = y + ty;
        const lx = x + w / 2 - cw + cw * 0.22;
        const rx = x + w / 2 - cw * 0.22;
        sl.addShape(S.ellipse, { x: lx, y: cy, w: cw, h: hh, fill: { color: col.accent, transparency: 78 }, line: { color: col.accent, width: 1.5 } });
        anim(sl, sl._sub ? click(sl) : 0, "fade", () => sl.addShape(S.ellipse, { x: rx, y: cy, w: cw, h: hh, fill: { color: "E8930C", transparency: 78 }, line: { color: "E8930C", width: 1.5 } }));
        const L = [plain(b.left || "A")].concat(arr(b.leftItems).map((t) => "• " + plain(t)));
        const Rr = [plain(b.right || "B")].concat(arr(b.rightItems).map((t) => "• " + plain(t)));
        const M = [plain(b.bothLabel || "Giống nhau")].concat(arr(b.both).map((t) => "• " + plain(t)));
        const tw = cw * 0.5;
        const fs = fit(L.concat(Rr, M).join("\n"), tw * 3, hh * 0.8, 16, 11);
        const blockTxt = (lines, bx, color) =>
          T(sl, lines.map((t, i) => ({ text: t, options: { bold: i === 0, color: i === 0 ? color : col.ink, breakLine: i < lines.length - 1 } })), { x: bx, y: cy + hh * 0.12, w: tw, h: hh * 0.76, fontSize: fs, valign: "middle", align: "center" });
        blockTxt(L, lx + cw * 0.06, col.accent2);
        anim(sl, sl._sub ? click(sl) : 0, "fade", () => blockTxt(Rr, rx + cw - tw - cw * 0.06, "B25E00"));
        anim(sl, sl._sub ? click(sl) : 0, "fade", () => blockTxt(M, x + w / 2 - tw / 2, "1E8E5A"));
        return;
      }
      if (k === "pyramid") {
        const it = arr(b.items).slice(0, 6).map((t) => (typeof t === "string" ? { label: t } : t));
        const ty = blockTitle(sl, b, x, y, w);
        const n = Math.max(1, it.length);
        const hasD = it.some((t) => t.desc);
        const pyW = hasD ? Math.min(w * 0.5, 6) : Math.min(w, 8);
        const gap = 0.08;
        const lh = Math.min(0.95, (h - ty - (n - 1) * gap) / n);
        const top = y + ty + (h - ty - (n * lh + (n - 1) * gap)) / 2;
        const px0 = hasD ? x : x + (w - pyW) / 2;
        const fsL = Math.min(...it.map((t, i) => fit(plain(t.label), pyW * (0.35 + (0.65 * (i + 1)) / n) * 0.72, lh - 0.04, 18, 11)));
        const dW = w - pyW - 0.35;
        const fsD = hasD ? Math.min(...it.map((t) => fit(plain(t.desc || ""), dW, lh, 16, 11))) : 0;
        it.forEach((t, i) =>
          anim(sl, sl._sub ? click(sl) : 0, "fade", () => {
            const pw = pyW * (0.35 + (0.65 * (i + 1)) / n);
            const px = px0 + (pyW - pw) / 2;
            const py = top + i * (lh + gap);
            sl.addShape(S.trapezoid, { x: px, y: py, w: pw, h: lh, fill: { color: i % 2 ? col.accent2 : col.accent, transparency: Math.min(40, i * 8) }, line: { type: "none" } });
            T(sl, plain(t.label), { x: px + pw * 0.14, y: py, w: pw * 0.72, h: lh, fontSize: fsL, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
            if (t.desc) {
              const lx = px + pw * 0.9;
              if (x + pyW + 0.28 - lx > 0.1) sl.addShape(S.line, { x: lx, y: py + lh / 2, w: x + pyW + 0.28 - lx, h: 0, line: { color: col.line, width: 1, dashType: "dash" } });
              T(sl, plain(t.desc), { x: x + pyW + 0.35, y: py, w: dW, h: lh, fontSize: fsD, color: col.ink, valign: "middle" });
            }
          })
        );
        return;
      }
      if (k === "stats") {
        const it = arr(b.items).slice(0, 4);
        const ty = blockTitle(sl, b, x, y, w);
        const n = Math.max(1, it.length);
        const cw = (w - (n - 1) * 0.2) / n;
        it.forEach((s, i) => {
          const sx = x + i * (cw + 0.2);
          box(sl, sx, y + ty, cw, h - ty, { fill: col.soft });
          T(sl, plain(s.value), { x: sx + 0.1, y: y + ty + 0.08, w: cw - 0.2, h: (h - ty) * 0.55, fontSize: fit(plain(s.value), cw - 0.2, (h - ty) * 0.55, 36, 14, 0.6), bold: true, color: col.accent, align: "center", valign: "middle" });
          T(sl, plain(s.label), { x: sx + 0.1, y: y + ty + (h - ty) * 0.6, w: cw - 0.2, h: (h - ty) * 0.38, fontSize: fit(plain(s.label), cw - 0.2, (h - ty) * 0.38, 14, 10), align: "center", color: col.ink });
        });
        return;
      }
      if (k === "keyterms") {
        const it = arr(b.items);
        const ty = blockTitle(sl, b, x, y, w, "Thuật ngữ");
        const txt = it.map((t) => `${plain(t.term)}: ${plain(t.def)}`).join("\n");
        T(
          sl,
          it.flatMap((t, i) => [
            { text: plain(t.term) + ": ", options: { bold: true, color: col.accent2 } },
            { text: plain(t.def), options: { breakLine: i < it.length - 1 } }
          ]),
          { x, y: y + ty, w, h: h - ty, fontSize: fit(txt, w, h - ty, 22, 14), paraSpaceAfter: 6 }
        );
        return;
      }
      if (k === "quote") {
        sl.addShape(S.rect, { x, y, w: 0.08, h, fill: { color: col.accent }, line: { type: "none" } });
        box(sl, x + 0.12, y, w - 0.12, h, { fill: col.soft });
        const txt = plain(b.text);
        T(sl, plain(b.title || "Tư liệu"), { x: x + 0.3, y: y + 0.08, w: w - 0.45, h: 0.32, fontSize: 12, bold: true, color: col.accent2 });
        T(sl, [{ text: "“" + txt + "”", options: { italic: true } }].concat(b.source ? [{ text: "\n— " + plain(b.source), options: { fontSize: 11, color: col.muted, italic: false } }] : []), {
          x: x + 0.3,
          y: y + 0.42,
          w: w - 0.45,
          h: h - 0.5,
          fontSize: fit(txt + (b.source ? "\n" + b.source : ""), w - 0.45, h - 0.5, 26, 13),
          fontFace: HFONT,
          valign: "middle"
        });
        return;
      }
      if (k === "question" || k === "conclusion" || k === "note") {
        const cfg =
          k === "question"
            ? { fill: dark ? "1D3550" : "EEF6FF", line: "2F6FDB", icon: "?", title: b.title || "Câu hỏi", tc: "2F6FDB" }
            : k === "conclusion"
            ? { fill: col.soft, line: col.accent, icon: "★", title: b.title || "Kết luận", tc: col.accent2 }
            : { fill: dark ? "3A3214" : "FFF8E1", line: "E0A100", icon: "✎", title: b.title || "Ghi vào vở", tc: "8A5A00", dash: "dash" };
        box(sl, x, y, w, h, { fill: cfg.fill, line: cfg.line, lw: 1.5, dash: cfg.dash });
        sl.addShape(S.ellipse, { x: x + 0.14, y: y + 0.12, w: 0.38, h: 0.38, fill: { color: cfg.line }, line: { type: "none" } });
        T(sl, cfg.icon, { x: x + 0.14, y: y + 0.12, w: 0.38, h: 0.38, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
        let ttl = plain(cfg.title).replace(/\s+/g, " ").toUpperCase();
        const tmax = Math.floor((w - 0.8) / 0.105);
        if (ttl.length > tmax) ttl = ttl.slice(0, tmax - 1).replace(/\s+\S*$/, "") + "…";
        T(sl, ttl, { x: x + 0.62, y: y + 0.12, w: w - 0.8, h: 0.38, fontSize: 12, bold: true, color: cfg.tc, valign: "middle", charSpacing: 1 });
        const txt = String(b.text || "");
        T(sl, runs(txt), { x: x + 0.2, y: y + 0.56, w: w - 0.4, h: h - 0.66, fontSize: fit(plain(txt), w - 0.4, h - 0.66, 24, 14), color: col.ink, paraSpaceAfter: 4 });
        return;
      }
      // text, list và mặc định
      const ty = blockTitle(sl, b, x, y, w);
      const md = k === "list" ? arr(b.items).map((it) => "- " + (typeof it === "string" ? it : it.text)).join("\n") : b.md || b.text || L360.blocks.plain(b) || "";
      T(sl, runs(md), { x, y: y + ty, w, h: h - ty, fontSize: fit(plain(md), w, h - ty, 24, 14), paraSpaceAfter: 6, lineSpacingMultiple: 1.05 });
    }
    const SUB = ["timeline", "mindmap", "flow", "cycle", "venn", "pyramid"];
    function stackBlocks(sl, list, x, y, w, h, o = {}) {
      if (!list.length) return;
      const gap = 0.18;
      const ws = list.map(weight);
      const sum = ws.reduce((a, b) => a + b, 0);
      const free = h - gap * (list.length - 1);
      const mins = list.map((b) => Math.min(minH(b, w), free));
      const ms = mins.reduce((a, b) => a + b, 0);
      const hs = ms >= free ? mins.map((m) => (m * free) / ms) : mins.map((m, i) => m + ((free - ms) * ws[i]) / sum);
      let cy = y;
      list.forEach((b, i) => {
        const bh = hs[i];
        // Khối đầu hiện sẵn; các khối sau (kết luận, ghi vở…) hiện lần lượt khi bấm. Sơ đồ hiện từng nhánh/mốc.
        const k = o.anim && (i > 0 || o.all) ? click(sl) : 0;
        sl._sub = o.anim && SUB.includes(b.kind);
        anim(sl, k, b.kind === "note" || b.kind === "conclusion" ? "wipe" : "fade", () => drawBlock(sl, b, x, cy, w, bh));
        sl._sub = false;
        cy += bh + gap;
      });
    }

    /* --- các loại trang chiếu --- */
    const R = {};
    R.title = (sl, d, n) => {
      const p = d.p;
      sl.background = { color: col.accent };
      decorate(sl, true);
      const firstImg = (() => {
        for (const s of p.steps) for (const pg of s.pages || []) for (const b of pg.blocks || []) {
          if (b.kind === "image" && imgs[b.src]) return b.src;
          if (b.kind === "gallery") for (const im of b.images || []) if (imgs[im.src]) return im.src;
        }
        return null;
      })();
      const tw = firstImg ? 7.2 : W - 2 * MX;
      if (firstImg) img(sl, firstImg, 7.75, 0, W - 7.75, H, { cover: true });
      const subj = (L360.Curr && L360.Curr.subjectName(p.subjectId, p.grade)) || p.subject || "";
      pill(sl, `${subj.toUpperCase()}${p.grade ? " · LỚP " + p.grade : ""}`, MX + 0.05, 1.2, col.accent2, { size: 12, h: 0.38 });
      const b = p.bai || {};
      const big = plain(b.ten || p.title);
      T(sl, b.so ? (/^(CĐ|Chủ đề)/i.test(b.so) ? b.so : "BÀI " + b.so) : "", { x: MX, y: 1.85, w: tw, h: 0.55, fontSize: 20, bold: true, color: "FFFFFF", charSpacing: 2 });
      T(sl, big, { x: MX, y: 2.4, w: tw, h: 2.5, fontFace: HFONT, fontSize: fit(big, tw, 2.5, 46, 26, 0.55), bold: true, color: "FFFFFF", valign: "top" });
      T(sl, p.tiet.tong > 1 ? `Tiết ${p.tiet.so}/${p.tiet.tong}${b.ten && p.title !== b.ten ? " – " + plain(p.title) : ""}` : b.ten && p.title !== b.ten ? plain(p.title) : "", {
        x: MX,
        y: 5.0,
        w: tw,
        h: 0.6,
        fontSize: 18,
        color: "FFFFFF"
      });
      const gv = opt.author || pptx.author;
      T(sl, [gv ? "Giáo viên: " + gv : "", (L360.cfg && L360.cfg.school) || ""].filter(Boolean).join("\n"), { x: MX, y: 6.05, w: tw, h: 0.8, fontSize: 12, color: "FFFFFF", transparency: 15 });
    };
    R.goals = (sl, d, n) => {
      header(sl, d.p.steps[0] ? d.p.steps[0].phase : "khoi-dong", "Mục tiêu tiết học");
      const g = d.p.objectives.slice(0, 6);
      const rowH = Math.min(0.95, 5.0 / g.length);
      g.forEach((o, i) => anim(sl, click(sl), "fade", () => {
        const y = 1.95 + i * (rowH + 0.08);
        box(sl, MX, y, W - 2 * MX, rowH, { fill: col.card, line: col.line });
        sl.addShape(S.ellipse, { x: MX + 0.18, y: y + rowH / 2 - 0.2, w: 0.4, h: 0.4, fill: { color: col.accent }, line: { type: "none" } });
        T(sl, "✓", { x: MX + 0.18, y: y + rowH / 2 - 0.2, w: 0.4, h: 0.4, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
        T(sl, plain(o), { x: MX + 0.75, y, w: W - 2 * MX - 0.9, h: rowH, fontSize: fit(plain(o), W - 2 * MX - 0.9, rowH, 20, 12), valign: "middle" });
      }));
      footer(sl, d.p, n);
    };
    R.phase = (sl, d, n) => {
      const c = PH[d.phase] || col.accent;
      sl.background = { color: c };
      sl.addShape(S.ellipse, { x: W - 5.2, y: -1.6, w: 7, h: 7, fill: { color: "FFFFFF", transparency: 88 }, line: { type: "none" } });
      sl.addShape(S.ellipse, { x: W - 3.4, y: 3.9, w: 4.4, h: 4.4, fill: { color: "FFFFFF", transparency: 92 }, line: { type: "none" } });
      const idx = ["khoi-dong", "hinh-thanh", "luyen-tap", "van-dung"].indexOf(d.phase) + 1;
      T(sl, "0" + idx, { x: MX, y: 1.0, w: 4, h: 1.6, fontSize: 96, bold: true, color: "FFFFFF", transparency: 35, fontFace: HFONT });
      T(sl, PH_NAME[d.phase] || "", { x: MX, y: 2.7, w: W - 2 * MX, h: 1.1, fontSize: 44, bold: true, color: "FFFFFF", fontFace: HFONT, charSpacing: 2 });
      // Gộp các bước trùng tên (ví dụ trang chiếu + câu hỏi của cùng một hoạt động).
      const seen = {};
      d.steps.forEach((s) => {
        const t = plain(s.title).replace(/^Câu hỏi – /, "");
        seen[t] = (seen[t] || 0) + (Number(s.minutes) || 0);
      });
      const list = Object.entries(seen).map(([t, m]) => `${t}${m ? `  ·  ${m} phút` : ""}`);
      T(sl, list.map((t, i) => ({ text: t, options: { bullet: { code: "25CF" }, breakLine: i < list.length - 1 } })), { x: MX + 0.1, y: 4.0, w: W - 2 * MX - 3, h: 2.6, fontSize: fit(list.join("\n"), W - 2 * MX - 3, 2.6, 22, 12), color: "FFFFFF", paraSpaceAfter: 6 });
      footer(sl, d.p, n, true);
    };
    // Trang chủ đề / tên bài / tên mục: thiết kế toàn trang, có nhắc ghi vở.
    function hero(sl, b, d, n) {
      const ghi = (t, x, y, dark) => {
        sl.addShape(S.roundRect, { x, y, w: 3.3, h: 0.42, rectRadius: 0.21, fill: { color: dark ? "FFFFFF" : b.kind === "muc" ? "FFFFFF" : col.soft, transparency: dark ? 82 : 0 }, line: { type: "none" } });
        T(sl, "✎  " + t, { x, y, w: 3.3, h: 0.42, fontSize: 13, bold: true, color: dark ? "FFFFFF" : col.accent2, align: "center", valign: "middle", margin: 0 });
      };
      if (b.kind === "chude") {
        sl.background = { color: col.accent2 };
        sl.addShape(S.ellipse, { x: W - 5.2, y: -2.6, w: 7.4, h: 7.4, fill: { color: col.accent, transparency: 35 }, line: { type: "none" } });
        sl.addShape(S.ellipse, { x: W - 7.8, y: 4.6, w: 4.4, h: 4.4, fill: { color: "FFFFFF", transparency: 90 }, line: { type: "none" } });
        sl.addShape(S.ellipse, { x: W - 3.6, y: -1.2, w: 3, h: 3, fill: { type: "none" }, line: { color: "FFFFFF", width: 1.5, transparency: 55 } });
        const k = plain(b.so || "Chủ đề").toUpperCase();
        T(sl, k, { x: MX + 0.1, y: 1.3, w: 9, h: 0.55, fontSize: 18, bold: true, color: "FFFFFF", valign: "middle" });
        sl.addShape(S.rect, { x: MX + 0.12, y: 1.9, w: 1.2, h: 0.07, fill: { color: "FFFFFF" }, line: { type: "none" } });
        const t = plain(b.ten || b.title || "");
        T(sl, t, { x: MX + 0.1, y: 2.1, w: 9.6, h: 2.0, fontFace: HFONT, fontSize: fit(t, 9.6, 2.0, 48, 26, 0.55), bold: true, color: "FFFFFF", valign: "middle" });
        if (b.mota) T(sl, plain(b.mota), { x: MX + 0.1, y: 4.15, w: 9.2, h: 0.8, fontSize: fit(plain(b.mota), 9.2, 0.8, 18, 12), color: "FFFFFF", transparency: 10 });
        // Danh sách bài của chủ đề: mỗi bài một dòng (không cắt chữ, không tràn khung).
        const bai = arr(b.bai).slice(0, 3);
        let by = 5.0;
        bai.forEach((x, i) => {
          const tx = numbered(x) ? plain(x) : `${i + 1}  ${plain(x)}`;
          const cw = Math.min(W - 2 * MX - 4.0, 0.1 * tx.length + 0.6);
          sl.addShape(S.roundRect, { x: MX + 0.1, y: by, w: cw, h: 0.42, rectRadius: 0.12, fill: { color: "FFFFFF", transparency: 84 }, line: { type: "none" } });
          T(sl, tx, { x: MX + 0.22, y: by, w: cw - 0.24, h: 0.42, fontSize: fit(tx, cw - 0.24, 0.42, 14, 11), bold: true, color: "FFFFFF", valign: "middle", margin: 0 });
          by += 0.5;
        });
        ghi("Ghi tên chủ đề vào vở", W - MX - 3.3, 6.35, true);
      } else if (b.kind === "tenbai") {
        sl.background = { color: "FFFFFF" };
        ["E8930C", "2F6FDB", "1E8E5A", "D2453B"].forEach((c, i) => sl.addShape(S.rect, { x: 0, y: (H / 4) * i, w: 0.28, h: H / 4, fill: { color: c }, line: { type: "none" } }));
        sl.addShape(S.ellipse, { x: W - 4.4, y: H - 3.9, w: 6, h: 6, fill: { color: col.soft }, line: { type: "none" } });
        if (b.chude) T(sl, plain(b.chude), { x: 1.2, y: 1.2, w: 10, h: 0.45, fontSize: 15, bold: true, color: col.muted });
        pill(sl, plain(b.so || "Bài học").toUpperCase(), 1.2, 1.75, col.accent, { size: 14, h: 0.42 });
        const t = plain(b.ten || b.title || "");
        T(sl, t, { x: 1.2, y: 2.35, w: 10.6, h: 2.2, fontFace: HFONT, fontSize: fit(t, 10.6, 2.2, 46, 24, 0.55), bold: true, color: col.ink, valign: "middle" });
        const mucs = arr(b.muc).slice(0, 4);
        let my = 4.7;
        const mh = mucs.length > 3 ? 0.38 : 0.44;
        mucs.forEach((x, i) => {
          const tx = numbered(x) ? plain(x) : `${i + 1}. ${plain(x)}`;
          const cw = Math.min(W - 1.2 - MX - 1.0, 0.1 * tx.length + 0.6);
          box(sl, 1.2, my, cw, mh, { fill: col.soft });
          T(sl, tx, { x: 1.32, y: my, w: cw - 0.24, h: mh, fontSize: fit(tx, cw - 0.24, mh, 14, 11), bold: true, color: col.accent2, valign: "middle", margin: 0 });
          my += mh + 0.08;
        });
        ghi("Ghi tên bài vào vở", 1.2, Math.max(5.75, my + 0.1), false);
      } else {
        sl.background = { color: col.soft };
        sl.addShape(S.roundRect, { x: MX + 0.3, y: 2.0, w: 3.0, h: 3.0, rectRadius: 0.6, fill: { color: col.accent }, line: { type: "none" }, shadow: { type: "outer", blur: 10, offset: 3, angle: 90, color: "000000", opacity: 0.18 } });
        T(sl, plain(b.so || ""), { x: MX + 0.3, y: 2.0, w: 3.0, h: 3.0, fontFace: HFONT, fontSize: 110, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
        T(sl, `MỤC ${plain(b.so || "")}`, { x: 4.4, y: 2.0, w: 8, h: 0.5, fontSize: 18, bold: true, color: col.accent, charSpacing: 2 });
        const t = plain(b.ten || b.title || "");
        T(sl, t, { x: 4.4, y: 2.5, w: W - 4.4 - MX, h: 1.7, fontFace: HFONT, fontSize: fit(t, W - 4.4 - MX, 1.7, 42, 22, 0.55), bold: true, color: col.ink, valign: "middle" });
        const ys = arr(b.y).map(plain).slice(0, 4);
        if (ys.length) T(sl, ys.map((x, i) => ({ text: x, options: { bullet: true, breakLine: i < ys.length - 1 } })), { x: 4.4, y: 4.3, w: W - 4.4 - MX, h: 1.4, fontSize: fit(ys.join("\n"), W - 4.4 - MX, 1.4, 18, 12), color: col.muted });
        ghi("Ghi tên mục vào vở", 4.4, 5.9, false);
      }
      footer(sl, d.p, n, b.kind === "chude");
    }
    R.page = (sl, d, n) => {
      const pg = d.pg;
      const bl = arr(pg.blocks);
      const hds = bl.filter((b) => ["chude", "tenbai", "muc"].includes(b.kind));
      if (hds.length && hds.length === bl.length) return hero(sl, hds[0], d, n);
      const ghi = bl.some((b) => b.kind === "note");
      header(sl, d.s.phase, pg.title || d.s.title, { chip: d.n > 1 ? `${d.i + 1}/${d.n}` : "", ghi });
      const vis = bl.filter((b) => VIS.includes(b.kind));
      const rest = bl.filter((b) => !VIS.includes(b.kind));
      const layout = pg.layout || (vis.length && rest.length ? "split" : "stack");
      const y = 1.95;
      const h = H - y - 0.6;
      if (layout === "split") {
        const lw = (W - 2 * MX) * 0.47;
        stackBlocks(sl, vis, MX, y, lw, h);
        stackBlocks(sl, rest, MX + lw + 0.3, y, W - 2 * MX - lw - 0.3, h, { anim: true });
      } else stackBlocks(sl, bl, MX, y, W - 2 * MX, h, { anim: true });
      footer(sl, d.p, n);
    };
    R.video = (sl, d, n) => {
      header(sl, d.s.phase, d.s.title, { chip: "Video" });
      const v = L360.videoSource ? L360.videoSource(d.s.source || {}) : {};
      const qs = arr(d.s.questions);
      drawBlock(sl, { kind: "video", src: (d.s.source || {}).url, edu: (d.s.source || {}).edu, caption: v.title || d.s.title }, MX, 1.95, W - 2 * MX, 1.6);
      if (d.s.instructions) T(sl, plain(d.s.instructions), { x: MX, y: 3.75, w: W - 2 * MX, h: 0.6, fontSize: 18, italic: true });
      const lines = qs.map((q, i) => `${q.t != null ? u.fmtSec(q.t) + " – " : ""}Câu ${i + 1}: ${plain(q.q)}`);
      T(sl, lines.join("\n"), { x: MX, y: 4.45, w: W - 2 * MX, h: 2.0, fontSize: fit(lines.join("\n"), W - 2 * MX, 2.0, 18, 11), paraSpaceAfter: 6 });
      timerBar(sl, d.s.minutes);
      footer(sl, d.p, n);
    };
    R.q = (sl, d, n) => {
      const q = d.q;
      header(sl, d.s.phase, d.s.title, { chip: d.n > 1 ? `Câu ${d.i + 1}/${d.n}` : "Câu hỏi" });
      const qt = plain(q.q);
      const hasImg = q.image && imgs[q.image];
      const qw = hasImg ? 7.4 : W - 2 * MX;
      // Khung câu hỏi co theo độ dài; phần đáp án chiếm phần còn lại, chừa chỗ cho dòng giải thích.
      const qh = qt.length > 140 ? 1.45 : qt.length > 70 ? 1.2 : 0.95;
      const optTop = 1.95 + qh + 0.22;
      const optBottom = H - (q.explain && !q.opinion ? 1.22 : 0.72);
      box(sl, MX, 1.95, qw, qh, { fill: col.card, line: col.line, shadow: true });
      T(sl, qt, { x: MX + 0.2, y: 1.97, w: qw - 0.4, h: qh - 0.04, fontSize: fit(qt, qw - 0.4, qh - 0.04, 26, 16), bold: true, valign: "middle" });
      if (hasImg) img(sl, q.image, MX + qw + 0.25, 1.95, W - 2 * MX - qw - 0.25, 4.8);
      const ow = hasImg ? qw : W - 2 * MX;
      if (q.kind === "tf") {
        const st = arr(q.statements);
        st.forEach((x, i) => {
          const y = optTop + i * 0.8;
          box(sl, MX, y, ow, 0.68, { fill: col.soft });
          T(sl, "abcd"[i] + ")", { x: MX + 0.15, y, w: 0.5, h: 0.68, fontSize: 18, bold: true, color: col.accent2, valign: "middle" });
          T(sl, plain(x.text), { x: MX + 0.65, y, w: ow - 2.3, h: 0.68, fontSize: fit(plain(x.text), ow - 2.3, 0.68, 18, 10), valign: "middle" });
          ["Đ", "S"].forEach((lab, j) => {
            sl.addShape(S.roundRect, { x: MX + ow - 1.5 + j * 0.7, y: y + 0.12, w: 0.55, h: 0.44, rectRadius: 0.08, fill: { color: col.card }, line: { color: col.accent, width: 1 } });
            T(sl, lab, { x: MX + ow - 1.5 + j * 0.7, y: y + 0.12, w: 0.55, h: 0.44, fontSize: 14, bold: true, align: "center", valign: "middle", color: col.accent2, margin: 0 });
          });
        });
        // Bấm: hiện đáp án từng ý (ô Đ/S đúng tô xanh).
        const kA = click(sl);
        st.forEach((x, i) => {
          const y = optTop + i * 0.8;
          const j = x.answer ? 0 : 1;
          anim(sl, kA, "appear", () => {
            sl.addShape(S.roundRect, { x: MX + ow - 1.5 + j * 0.7, y: y + 0.12, w: 0.55, h: 0.44, rectRadius: 0.08, fill: { color: "1E8E5A" }, line: { color: "1E8E5A", width: 1 } });
            T(sl, j ? "S" : "Đ", { x: MX + ow - 1.5 + j * 0.7, y: y + 0.12, w: 0.55, h: 0.44, fontSize: 14, bold: true, align: "center", valign: "middle", color: "FFFFFF", margin: 0 });
          });
        });
      } else if (q.kind === "fill") {
        // Điền khuyết: đoạn văn có chỗ trống đánh số, hàng "từ gợi ý"; bấm: hiện đáp án từng chỗ trống.
        const f = L360.fillParse(q.text);
        const passage = f.parts.map((t, i) => [{ text: plain(t) }].concat(i < f.blanks.length ? [{ text: ` (${i + 1}) ………… `, options: { bold: true, color: col.accent2 } }] : [])).flat();
        const ph = optBottom - optTop - 1.0;
        box(sl, MX, optTop, ow, ph, { fill: col.card, line: col.line });
        const ptxt = passage.map((r) => r.text).join("");
        T(sl, passage, { x: MX + 0.25, y: optTop + 0.05, w: ow - 0.5, h: ph - 0.1, fontSize: fit(ptxt, ow - 0.5, ph - 0.1, 24, 14, 0.5), valign: "middle", lineSpacingMultiple: 1.25 });
        const words = f.blanks.map((b) => b.answer).concat(arr(q.bank)).map(plain).sort((a, b) => a.localeCompare(b, "vi"));
        const by = optBottom - 0.82;
        T(sl, "Từ gợi ý:", { x: MX, y: by, w: 1.3, h: 0.62, fontSize: 15, bold: true, color: col.muted, valign: "middle" });
        let cx = MX + 1.35, cy = by + 0.08;
        words.forEach((w) => {
          const cw = Math.min(4, 0.12 * w.length + 0.45);
          if (cx + cw > MX + ow) return;
          box(sl, cx, cy, cw, 0.46, { fill: col.soft, line: col.line });
          T(sl, w, { x: cx, y: cy, w: cw, h: 0.46, fontSize: 14, bold: true, align: "center", valign: "middle", margin: 0 });
          cx += cw + 0.12;
        });
        anim(sl, click(sl), "appear", () => {
          box(sl, MX, by - 0.02, ow, 0.66, { fill: "E3F4EB", line: "1E8E5A" });
          const at = f.blanks.map((b, i) => `(${i + 1}) ${plain(b.answer)}`).join("   ");
          T(sl, [{ text: "Đáp án:  ", options: { bold: true, color: "1E8E5A" } }, { text: at, options: { bold: true, color: "0F2742" } }], { x: MX + 0.2, y: by - 0.02, w: ow - 0.4, h: 0.66, fontSize: fit("Đáp án:  " + at, ow - 0.4, 0.66, 18, 11), valign: "middle" });
        });
      } else if (q.kind === "sort") {
        // Kéo thả phân loại: các mục ở trên, cột nhóm ở dưới; bấm: các mục hiện vào đúng cột.
        const groups = arr(q.groups).map(plain);
        const items = arr(q.items);
        const ng = Math.max(1, groups.length);
        let cx = MX, cy = optTop;
        items.forEach((it, i) => {
          const t = `${i + 1}. ${plain(it.text)}`;
          const cw = Math.min(5.5, 0.105 * t.length + 0.4);
          if (cx + cw > MX + ow) (cx = MX), (cy += 0.52);
          box(sl, cx, cy, cw, 0.44, { fill: col.soft, line: col.line });
          T(sl, t, { x: cx, y: cy, w: cw, h: 0.44, fontSize: 13, align: "center", valign: "middle", margin: 0 });
          cx += cw + 0.12;
        });
        const gy = cy + 0.65;
        const gh = optBottom - gy;
        const gw = (ow - (ng - 1) * 0.2) / ng;
        const gcol = ["2F6FDB", "E8930C", "1E8E5A", "D2453B"];
        groups.forEach((g, gi) => {
          const gx = MX + gi * (gw + 0.2);
          box(sl, gx, gy, gw, gh, { fill: col.card, line: gcol[gi % 4], dash: "dash" });
          sl.addShape(S.rect, { x: gx, y: gy, w: gw, h: 0.5, fill: { color: gcol[gi % 4] }, line: { type: "none" } });
          T(sl, g, { x: gx, y: gy, w: gw, h: 0.5, fontSize: fit(g, gw, 0.5, 17, 11), bold: true, color: "FFFFFF", align: "center", valign: "middle" });
        });
        const kS = click(sl);
        groups.forEach((g, gi) => {
          const its = items.map((it, i) => ({ t: `${i + 1}. ${plain(it.text)}`, g: Number(it.group) || 0 })).filter((x) => x.g === gi);
          if (!its.length) return;
          const gx = MX + gi * (gw + 0.2);
          anim(sl, kS, "appear", () => {
            T(sl, its.map((x, j) => ({ text: x.t, options: { breakLine: j < its.length - 1, bullet: false, paraSpaceAfter: 4 } })), { x: gx + 0.15, y: gy + 0.58, w: gw - 0.3, h: gh - 0.66, fontSize: fit(its.map((x) => x.t).join("\n"), gw - 0.3, gh - 0.66, 16, 10), color: "0F2742" });
          });
        });
      } else if (q.kind === "short") {
        box(sl, MX, optTop + 0.15, ow, 1.1, { fill: col.card, line: col.accent, dash: "dash" });
        T(sl, `Trả lời ngắn${q.unit ? " (đơn vị: " + q.unit + ")" : ""}: ……………………………`, { x: MX + 0.25, y: optTop + 0.15, w: ow - 0.5, h: 1.1, fontSize: 22, color: col.muted, valign: "middle" });
        anim(sl, click(sl), "appear", () => {
          box(sl, MX, optTop + 0.15, ow, 1.1, { fill: "E3F4EB", line: "1E8E5A", lw: 1.5 });
          T(sl, [{ text: "Đáp án: ", options: { color: "1E8E5A" } }, { text: String(q.answer == null ? "" : q.answer) + (q.unit ? " " + q.unit : ""), options: { color: "0F2742" } }], { x: MX + 0.25, y: optTop + 0.15, w: ow - 0.5, h: 1.1, fontSize: 26, bold: true, valign: "middle" });
        });
      } else {
        const op = arr(q.options);
        const two = op.length > 2 && op.every((o) => plain(o).length < (hasImg ? 45 : 80));
        const cols = two ? 2 : 1;
        const rows = Math.ceil(op.length / cols);
        const ohh = Math.min(1.25, (optBottom - optTop - (rows - 1) * 0.15) / rows);
        const cw = (ow - (cols - 1) * 0.2) / cols;
        // Mọi phương án cùng một cỡ chữ (cỡ nhỏ nhất vừa khung của cả 4 phương án).
        const ofs = Math.max(14, Math.min(...op.map((o) => fit(plain(o), cw - 0.95, ohh, 22, 14))));
        const colors = ["E8930C", "2F6FDB", "1E8E5A", "D2453B", "0C9A9A", "8A5A2B"];
        op.forEach((o, i) => {
          const x = MX + (i % cols) * (cw + 0.2);
          const y = optTop + Math.floor(i / cols) * (ohh + 0.15);
          box(sl, x, y, cw, ohh, { fill: col.card, line: col.line });
          sl.addShape(S.roundRect, { x: x + 0.12, y: y + ohh / 2 - 0.27, w: 0.54, h: 0.54, rectRadius: 0.1, fill: { color: colors[i % 6] }, line: { type: "none" } });
          T(sl, LET[i], { x: x + 0.12, y: y + ohh / 2 - 0.27, w: 0.54, h: 0.54, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
          T(sl, plain(o), { x: x + 0.8, y, w: cw - 0.95, h: ohh, fontSize: ofs, valign: "middle", fit: "shrink" });
        });
        // Bấm: khoanh đáp án đúng (câu hỏi ý kiến thì không có đáp án).
        const ai = Number(q.answer);
        if (!q.opinion && q.answer != null && ai >= 0 && ai < op.length)
          anim(sl, click(sl), "appear", () => {
            const x = MX + (ai % cols) * (cw + 0.2);
            const y = optTop + Math.floor(ai / cols) * (ohh + 0.15);
            sl.addShape(S.roundRect, { x: x - 0.04, y: y - 0.04, w: cw + 0.08, h: ohh + 0.08, rectRadius: 0.14, fill: { type: "none" }, line: { color: "1E8E5A", width: 4 } });
            sl.addShape(S.ellipse, { x: x + cw - 0.5, y: y + ohh / 2 - 0.2, w: 0.4, h: 0.4, fill: { color: "1E8E5A" }, line: { type: "none" } });
            T(sl, "✓", { x: x + cw - 0.5, y: y + ohh / 2 - 0.2, w: 0.4, h: 0.4, fontSize: 15, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
          });
      }
      // Bấm tiếp: giải thích.
      if (q.explain && !q.opinion)
        anim(sl, click(sl), "fade", () => {
          const ex = plain(q.explain);
          box(sl, MX, H - 1.12, W - 2 * MX, 0.62, { fill: "E3F4EB", line: "1E8E5A" });
          T(sl, [{ text: "Giải thích: ", options: { bold: true, color: "1E8E5A" } }, { text: ex, options: { color: "123B2A" } }], { x: MX + 0.15, y: H - 1.12, w: W - 2 * MX - 0.3, h: 0.62, fontSize: fit(ex + "Giải thích: ", W - 2 * MX - 0.3, 0.62, 15, 11), valign: "middle", fit: "shrink" });
        });
      footer(sl, d.p, n);
    };
    R.qans = (sl, d, n) => {
      header(sl, d.s.phase, d.s.title + " – Đáp án", { chip: "Đáp án" });
      const rows = [[{ text: "Câu", options: { bold: true, color: "FFFFFF", fill: { color: col.accent }, align: "center" } }, { text: "Đáp án", options: { bold: true, color: "FFFFFF", fill: { color: col.accent } } }, { text: "Giải thích", options: { bold: true, color: "FFFFFF", fill: { color: col.accent } } }]].concat(
        d.qs.map((q, i) => {
          const a = q.kind === "tf" ? arr(q.statements).map((x, j) => `${"abcd"[j]}) ${x.answer ? "Đúng" : "Sai"}`).join("; ") : q.kind === "short" ? String(q.answer) : q.kind === "fill" ? L360.fillParse(q.text).blanks.map((b, j) => `(${j + 1}) ${b.answer}`).join("; ") : q.kind === "sort" ? arr(q.items).map((x, j) => `${j + 1}→${plain(arr(q.groups)[Number(x.group) || 0] || "")}`).join("; ") : `${LET[Number(q.answer) || 0]}. ${plain(arr(q.options)[Number(q.answer) || 0] || "")}`;
          const f = { fill: { color: i % 2 ? col.card : col.soft }, color: dark ? "0F1B2D" : col.ink };
          return [{ text: String(i + 1), options: Object.assign({ align: "center", bold: true }, f) }, { text: a, options: Object.assign({ bold: true }, f) }, { text: plain(q.explain || ""), options: f }];
        })
      );
      const txt = rows.map((r) => r.map((c) => c.text).join(" ")).join("\n");
      sl.addTable(rows, { x: MX, y: 1.95, w: W - 2 * MX, colW: [0.8, 4.2, W - 2 * MX - 5], fontFace: FONT, fontSize: fit(txt, (W - 2 * MX) * 0.9, 4.9, 16, 11), border: { type: "solid", pt: 0.75, color: col.line }, valign: "middle", margin: 0.06, autoPage: false });
      footer(sl, d.p, n);
    };
    R.cw = (sl, d, n) => {
      const s = d.s;
      const rows = arr(s.rows);
      header(sl, s.phase, s.title, { chip: `${rows.length} hàng ngang` });
      const keyCol = Math.max(0, ...rows.map((r) => (r.key >= 0 ? r.key : 0)));
      const left = rows.map((r) => keyCol - Math.max(0, r.key));
      const width = Math.max(...rows.map((r, i) => left[i] + r.answer.length), 1);
      // Ô chữ dùng tối đa phần ngang còn lại (chừa ≥ 3,9 inch cho gợi ý); ô không nhỏ hơn 0,34 inch.
      const cell = Math.max(0.34, Math.min(0.55, (W - 2 * MX - 0.5 - 4.2) / (width + 0.5), 4.3 / Math.max(rows.length, 1)));
      const gx = MX + 0.5;
      const gy = 1.95;
      const CX = Math.max(5.2, Math.min(7.6, gx + width * cell + 0.35));
      rows.forEach((r, i) => {
        T(sl, String(i + 1), { x: gx - 0.5, y: gy + i * cell, w: 0.4, h: cell, fontSize: Math.max(10, Math.min(14, cell * 26)), bold: true, color: col.accent2, align: "right", valign: "middle" });
        r.answer.split("").forEach((ch, j) => {
          const isKey = left[i] + j === keyCol;
          sl.addShape(S.rect, { x: gx + (left[i] + j) * cell, y: gy + i * cell, w: cell, h: cell, fill: { color: isKey ? col.soft : col.card }, line: { color: col.accent2, width: 1 } });
        });
      });
      const cl = rows.map((r, i) => `${i + 1}. ${plain(r.clue)}`).join("\n") + (s.keyClue ? `\nTừ khoá: ${plain(s.keyClue)}` : "");
      T(sl, cl, { x: CX, y: 1.95, w: W - CX - MX, h: 4.0, fontSize: fit(cl, W - CX - MX, 4.0, 17, 11), paraSpaceAfter: 5 });
      // Mỗi lần bấm lật một hàng ngang; lần bấm cuối hiện từ khoá.
      rows.forEach((r, i) =>
        anim(sl, click(sl), "fade", () =>
          r.answer.split("").forEach((ch, j) => {
            const isKey = left[i] + j === keyCol;
            sl.addShape(S.rect, { x: gx + (left[i] + j) * cell, y: gy + i * cell, w: cell, h: cell, fill: { color: isKey ? col.accent : col.card }, line: { color: col.accent2, width: 1 } });
            T(sl, ch, { x: gx + (left[i] + j) * cell, y: gy + i * cell, w: cell, h: cell, fontSize: Math.max(10, Math.min(20, cell * 30)), bold: true, align: "center", valign: "middle", color: isKey ? "FFFFFF" : col.ink, margin: 0 });
          })
        )
      );
      anim(sl, click(sl), "wipe", () => {
        box(sl, CX, 6.05, W - CX - MX, 0.6, { fill: col.accent });
        T(sl, [{ text: "Từ khoá: ", options: { bold: true, color: "FFFFFF" } }, { text: s.keyword, options: { bold: true, color: "FFFFFF" } }], { x: CX + 0.1, y: 6.05, w: W - CX - 0.1 - MX, h: 0.6, fontSize: 20, valign: "middle" });
      });
      timerBar(sl, s.minutes);
      footer(sl, d.p, n);
    };
    R.match = (sl, d, n) => {
      const s = d.s;
      const pairs = arr(s.pairs);
      header(sl, s.phase, s.title, { chip: "Ghép nối" });
      T(sl, plain(s.question), { x: MX, y: 1.9, w: W - 2 * MX, h: 0.5, fontSize: 18, italic: true });
      const order = shuffle(pairs.map((p) => p.right), s.id);
      const rh = Math.min(0.85, 4.1 / Math.max(1, pairs.length));
      const cw = (W - 2 * MX - 1.2) / 2;
      pairs.forEach((p, i) => {
        const y = 2.5 + i * (rh + 0.08);
        box(sl, MX, y, cw, rh, { fill: col.soft });
        T(sl, `${i + 1}. ${plain(p.left)}`, { x: MX + 0.12, y, w: cw - 0.24, h: rh, fontSize: fit(plain(p.left), cw - 0.24, rh, 17, 10), valign: "middle", bold: true });
        const right = `${LET[i]}. ${plain(order[i][0])}`;
        box(sl, MX + cw + 1.2, y, cw, rh, { fill: col.card, line: col.line });
        T(sl, right, { x: MX + cw + 1.32, y, w: cw - 0.24, h: rh, fontSize: fit(right, cw - 0.24, rh, 17, 10), valign: "middle" });
      });
      // Mỗi lần bấm hiện đáp án của một cặp.
      pairs.forEach((p, i) =>
        anim(sl, click(sl), "fade", () => {
          const y = 2.5 + i * (rh + 0.08);
          const L = LET[order.findIndex((o) => o[1] === i)];
          sl.addShape(S.roundRect, { x: MX + cw + 0.2, y: y + rh / 2 - 0.25, w: 0.8, h: 0.5, rectRadius: 0.12, fill: { color: "1E8E5A" }, line: { type: "none" } });
          T(sl, "→ " + L, { x: MX + cw + 0.2, y: y + rh / 2 - 0.25, w: 0.8, h: 0.5, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
        })
      );
      if (s.explain) anim(sl, click(sl), "fade", () => T(sl, plain(s.explain), { x: MX, y: H - 1.0, w: W - 2 * MX, h: 0.5, fontSize: 14, italic: true, color: col.accent2 }));
      footer(sl, d.p, n);
    };
    R.order = (sl, d, n) => {
      const s = d.s;
      const items = arr(s.items).map((x) => (typeof x === "string" ? x : x.text));
      header(sl, s.phase, s.title, { chip: "Sắp xếp" });
      T(sl, plain(s.question), { x: MX, y: 1.9, w: W - 2 * MX, h: 0.5, fontSize: 18, italic: true });
      const list = shuffle(items, s.id);
      const rh = Math.min(0.85, 4.1 / Math.max(1, list.length));
      list.forEach(([t], i) => {
        const y = 2.5 + i * (rh + 0.08);
        box(sl, MX, y, W - 2 * MX - 1.1, rh, { fill: col.card, line: col.line });
        sl.addShape(S.roundRect, { x: MX + 0.12, y: y + rh / 2 - 0.25, w: 0.5, h: 0.5, rectRadius: 0.08, fill: { color: col.card }, line: { color: col.accent, width: 1 } });
        T(sl, LET[i], { x: MX + 0.12, y: y + rh / 2 - 0.25, w: 0.5, h: 0.5, fontSize: 16, bold: true, align: "center", valign: "middle", color: col.accent2, margin: 0 });
        T(sl, plain(t), { x: MX + 0.8, y, w: W - 2 * MX - 2.1, h: rh, fontSize: fit(plain(t), W - 2 * MX - 2.1, rh, 18, 10), valign: "middle" });
      });
      // Bấm theo thứ tự đúng: số thứ tự hiện cạnh từng mục.
      items.forEach((t, pos) =>
        anim(sl, click(sl), "appear", () => {
          const i = list.findIndex((x) => x[1] === pos);
          const y = 2.5 + i * (rh + 0.08);
          sl.addShape(S.ellipse, { x: W - MX - 0.85, y: y + rh / 2 - 0.3, w: 0.6, h: 0.6, fill: { color: "1E8E5A" }, line: { type: "none" } });
          T(sl, String(pos + 1), { x: W - MX - 0.85, y: y + rh / 2 - 0.3, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
        })
      );
      footer(sl, d.p, n);
    };
    R.cards = (sl, d, n) => {
      const s = d.s;
      header(sl, s.phase, s.title, { chip: `Chọn tối đa ${s.maxPick || 3} thẻ` });
      T(sl, plain(s.question), { x: MX, y: 1.95, w: W - 2 * MX, h: 0.9, fontSize: fit(plain(s.question), W - 2 * MX, 0.9, 24, 14), bold: true });
      const cards = arr(s.cards);
      const cols = cards.length > 6 ? 4 : 3;
      const cw = (W - 2 * MX - (cols - 1) * 0.2) / cols;
      const rows = Math.ceil(cards.length / cols);
      const ch = Math.min(1.1, (2.9 - (rows - 1) * 0.15) / Math.max(1, rows));
      cards.forEach((c, i) => {
        const x = MX + (i % cols) * (cw + 0.2);
        const y = 3.05 + Math.floor(i / cols) * (ch + 0.15);
        box(sl, x, y, cw, ch, { fill: col.soft, line: col.accent, lw: 1 });
        const ct = plain(typeof c === "object" ? c.title || c.text || c.label || "" : c);
        T(sl, ct, { x: x + 0.1, y, w: cw - 0.2, h: ch, fontSize: fit(ct, cw - 0.2, ch, 18, 11), align: "center", valign: "middle", bold: true });
      });
      if (s.textPrompt) T(sl, "✎ " + plain(s.textPrompt), { x: MX, y: H - 1.4, w: W - 2 * MX, h: 0.45, fontSize: 15, italic: true, color: col.muted });
      timerBar(sl, d.s.minutes);
      footer(sl, d.p, n);
    };
    R.auction = (sl, d, n) => {
      const s = d.s;
      header(sl, s.phase, s.title, { chip: `Ngân sách ${s.budget || 100}` });
      const aq = plain(s.question).replace(/\s+/g, " ").trim();
      T(sl, aq, { x: MX, y: 1.95, w: W - 2 * MX, h: 0.7, fontSize: fit(aq, W - 2 * MX, 0.7, 20, 13), bold: true });
      const it = arr(s.items);
      const cw = (W - 2 * MX - (it.length - 1) * 0.2) / Math.max(1, it.length);
      const tfs = Math.min(18, ...it.map((x) => fit(plain(x.title), cw - 0.3, 0.62, 18, 11)));
      it.forEach((x, i) => {
        const bx = MX + i * (cw + 0.2);
        box(sl, bx, 2.85, cw, 3.55, { fill: col.card, line: col.accent, lw: 1.25, shadow: true });
        const hasIm = x.image && imgs[x.image];
        if (hasIm) img(sl, x.image, bx + 0.1, 2.95, cw - 0.2, 1.6, { cover: false });
        const ty = hasIm ? 4.62 : 2.95;
        T(sl, plain(x.title), { x: bx + 0.15, y: ty, w: cw - 0.3, h: 0.62, fontSize: tfs, bold: true, color: col.accent2 });
        T(sl, plain(x.text || ""), { x: bx + 0.15, y: ty + 0.66, w: cw - 0.3, h: 6.3 - ty - 0.66, fontSize: fit(plain(x.text || ""), cw - 0.3, 6.3 - ty - 0.66, 16, 11) });
      });
      timerBar(sl, d.s.minutes);
      footer(sl, d.p, n);
    };
    R.group = (sl, d, n) => {
      const s = d.s;
      header(sl, s.phase, s.title, { chip: "Nhiệm vụ nhóm" });
      const task = plain(s.task || s.instructions || "");
      box(sl, MX, 1.95, W - 2 * MX, 1.5, { fill: col.soft });
      T(sl, task, { x: MX + 0.25, y: 1.98, w: W - 2 * MX - 0.5, h: 1.45, fontSize: fit(task, W - 2 * MX - 0.5, 1.45, 22, 12), bold: true, valign: "middle" });
      T(sl, "Vai trò trong nhóm", { x: MX, y: 3.65, w: 5.5, h: 0.4, fontSize: 15, bold: true, color: col.accent2 });
      const roles = arr(s.roles);
      const rc = roles.length > 4 ? 2 : 1;
      const rpc = Math.ceil(roles.length / rc);
      const rw = (5.5 - (rc - 1) * 0.12) / rc;
      const rh = Math.min(0.52, (H - 1.05 - 4.1) / Math.max(1, rpc) - 0.08);
      const rfs = Math.min(...roles.map((r, i) => fit(`${i + 1}. ${plain(r)}`, rw - 0.25, rh, 15, 11)).concat([15]));
      roles.forEach((r, i) => {
        const rx = MX + Math.floor(i / rpc) * (rw + 0.12);
        const ry = 4.1 + (i % rpc) * (rh + 0.08);
        box(sl, rx, ry, rw, rh, { fill: col.card, line: col.line });
        T(sl, `${i + 1}. ${plain(r)}`, { x: rx + 0.12, y: ry, w: rw - 0.2, h: rh, fontSize: rfs, valign: "middle" });
      });
      // Tư liệu: rút gọn để luôn vừa khung (chi tiết đầy đủ nằm ở phiếu học tập).
      let resL = arr(s.resources).map((r) => `• ${plain(r.title)}${r.body ? ": " + plain(r.body).replace(/\s+/g, " ").slice(0, 160) : ""}`);
      const fitsAt11 = (L) => L.reduce((a, t) => a + Math.max(1, Math.ceil(t.length / Math.floor((W - 6.6 - MX - 0.2) / ((11 * 0.52) / 72)))), 0) * (11 * 1.3) / 72 <= 2.3;
      while (resL.length && !fitsAt11(resL)) {
        const i = resL.reduce((bi, t, j) => (t.length > resL[bi].length ? j : bi), 0);
        if (resL[i].length > 60) resL[i] = resL[i].slice(0, Math.floor(resL[i].length * 0.75)).replace(/\s+\S*$/, "") + "…";
        else resL.pop();
      }
      const res = resL.join("\n");
      if (res) {
        T(sl, "Tư liệu", { x: 6.6, y: 3.65, w: W - 6.6 - MX, h: 0.4, fontSize: 15, bold: true, color: col.accent2 });
        T(sl, res, { x: 6.6, y: 4.1, w: W - 6.6 - MX, h: 2.35, fontSize: fit(res, W - 6.6 - MX, 2.35, 15, 11) });
      }
      timerBar(sl, d.s.minutes);
      footer(sl, d.p, n);
    };
    R.sheet = (sl, d, n) => {
      const s = d.s;
      header(sl, s.phase, "Phiếu học tập – " + s.title, { chip: "Hồ sơ nhóm" });
      const f = arr(s.fields);
      const rows = [[{ text: "Mục", options: { bold: true, color: "FFFFFF", fill: { color: col.accent } } }, { text: "Nội dung của nhóm", options: { bold: true, color: "FFFFFF", fill: { color: col.accent } } }]].concat(
        f.map((x) => [{ text: `${x.key}. ${plain(x.label)}`, options: { bold: true, fill: { color: col.soft }, color: dark ? "0F1B2D" : col.ink } }, { text: "", options: { fill: { color: "FFFFFF" } } }])
      );
      const rh = Math.min(1.2, 4.6 / Math.max(1, f.length));
      sl.addTable(rows, { x: MX, y: 1.95, w: W - 2 * MX, colW: [4, W - 2 * MX - 4], rowH: [0.45].concat(f.map(() => rh)), fontFace: FONT, fontSize: 15, border: { type: "solid", pt: 0.75, color: col.line }, valign: "middle", autoPage: false });
      footer(sl, d.p, n);
    };
    R.task = (sl, d, n) => {
      const s = d.s;
      const T0 = L360.types[s.type] || {};
      header(sl, s.phase, s.title, { chip: T0.label || "" });
      const q = plain(s.question || s.mission || s.instructions || "");
      box(sl, MX, 1.95, W - 2 * MX, 2.6, { fill: col.soft, line: col.accent, lw: 1.25 });
      T(sl, q, { x: MX + 0.3, y: 2.0, w: W - 2 * MX - 0.6, h: 2.5, fontSize: fit(q, W - 2 * MX - 0.6, 2.5, 30, 14), bold: true, valign: "middle" });
      const meta = [s.maxWords ? `Tối đa ${s.maxWords} chữ.` : "", s.type === "text" && s.selfAssess ? "Tự đánh giá mức độ hiểu bài." : "", s.instructions && s.instructions !== q ? plain(s.instructions) : ""].filter(Boolean).join("  ");
      if (meta) T(sl, meta, { x: MX, y: 4.75, w: W - 2 * MX, h: 0.6, fontSize: 16, color: col.muted, italic: true });
      if (s.type === "explore" && L360.cfg && L360.cfg.heritageLensUrl) T(sl, [{ text: "Mở Heritage Lens ↗", options: { hyperlink: { url: L360.cfg.heritageLensUrl }, bold: true, color: col.accent } }], { x: MX, y: 5.5, w: 5, h: 0.5, fontSize: 16 });
      if (s.type === "text" || s.type === "expo") {
        for (let i = 0; i < 3; i++) sl.addShape(S.line, { x: MX, y: 5.75 + i * 0.4, w: W - 2 * MX, h: 0, line: { color: col.line, width: 1, dashType: "dash" } });
      }
      timerBar(sl, d.s.minutes);
      footer(sl, d.p, n);
    };
    R.recap = (sl, d, n) => {
      header(sl, "", "Ghi nhớ", { ghi: true, label: "TỔNG KẾT", chip: d.part || "" });
      const t = d.notes.map((x) => plain(x).replace(/^\s*-\s*/gm, "").replace(/\n+/g, " ")).filter(Boolean);
      box(sl, MX, 1.95, W - 2 * MX, 4.85, { fill: dark ? "3A3214" : "FFF8E1", line: "E0A100", lw: 1.5, dash: "dash" });
      const wts = t.map((x) => 1 + x.length / 90);
      const sum = wts.reduce((a, b) => a + b, 0) || 1;
      const fs = Math.max(16, Math.min(...t.map((x, i) => fit(x, W - 2 * MX - 1.3, (4.55 * wts[i]) / sum, 24, 16))));
      let y = 2.1;
      t.forEach((x, i) => {
        const h = (4.55 * wts[i]) / sum;
        anim(sl, click(sl), "fade", () => {
          sl.addShape(S.ellipse, { x: MX + 0.3, y: y + 0.05, w: 0.42, h: 0.42, fill: { color: "E0A100" }, line: { type: "none" } });
          T(sl, String(i + 1), { x: MX + 0.3, y: y + 0.05, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
          T(sl, x, { x: MX + 0.9, y, w: W - 2 * MX - 1.2, h, fontSize: fs, color: col.ink, valign: "top" });
        });
        y += h;
      });
      footer(sl, d.p, n);
    };
    // Trang kết: lời cảm ơn, nhiệm vụ về nhà – chuẩn bị tiết sau, logo ứng dụng.
    R.end = (sl, d, n) => {
      sl.background = { color: col.accent };
      // Hoạ tiết: các vòng tròn lớn mờ và dải màu bốn pha ở đáy.
      [[W - 3.2, -2.2, 6.4, 18], [W - 5.6, 3.6, 5.2, 12], [-1.6, 4.8, 4.2, 14]].forEach(([x, y, r, t]) => sl.addShape(S.ellipse, { x, y, w: r, h: r, fill: { color: "FFFFFF", transparency: 100 - t }, line: { type: "none" } }));
      sl.addShape(S.ellipse, { x: W - 4.3, y: -1.1, w: 4.2, h: 4.2, fill: { type: "none" }, line: { color: "FFFFFF", width: 1.5, transparency: 55 } });
      const PH = ["E8930C", "2F6FDB", "1E8E5A", "D2453B"];
      PH.forEach((c, i) => sl.addShape(S.rect, { x: (W / 4) * i, y: H - 0.12, w: W / 4, h: 0.12, fill: { color: c }, line: { type: "none" } }));
      // Bên trái: lời cảm ơn.
      pill(sl, "KẾT THÚC TIẾT HỌC", MX, 1.0, "FFFFFF", { color: col.accent2, size: 12 });
      T(sl, "Cảm ơn các em!", { x: MX, y: 1.5, w: 6.4, h: 1.35, fontFace: HFONT, fontSize: 50, bold: true, color: "FFFFFF", valign: "middle" });
      T(sl, "Hẹn gặp lại các em ở tiết học sau.", { x: MX, y: 2.85, w: 6.4, h: 0.55, fontSize: 20, color: "FFFFFF", transparency: 10 });
      const lbl = [L360.Pack.label(d.p), d.p.bai && d.p.bai.ten].filter(Boolean).join(" · ");
      T(sl, lbl, { x: MX, y: 3.5, w: 6.4, h: 0.8, fontSize: fit(lbl, 6.4, 0.8, 16, 11), color: "FFFFFF", transparency: 25 });
      // Bên phải: thẻ nhiệm vụ về nhà / chuẩn bị bài.
      const hw = d.hw || {};
      const tasks = arr(hw.tasks).map(plain).filter(Boolean);
      if (!tasks.length && d.vd) tasks.push(plain(d.vd.question || d.vd.task || d.vd.instructions || d.vd.title));
      const prep = plain(hw.prepare || "");
      const cx = 7.35, cy = 0.95, cw = W - MX - cx, ch = 4.75;
      box(sl, cx, cy, cw, ch, { fill: "FFFFFF", shadow: true });
      sl.addShape(S.rect, { x: cx, y: cy + 0.35, w: 0.09, h: 0.5, fill: { color: "E8930C" }, line: { type: "none" } });
      T(sl, "✎  NHIỆM VỤ VỀ NHÀ", { x: cx + 0.3, y: cy + 0.3, w: cw - 0.5, h: 0.6, fontSize: 18, bold: true, color: col.accent2, valign: "middle" });
      const list = tasks.length ? tasks : (d.notes || []).map(plain).slice(0, 3);
      const body = list.slice(0, 4).map((t, i) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < Math.min(4, list.length) - 1, paraSpaceAfter: 6 } }));
      const bh = prep ? 2.15 : 3.6;
      T(sl, body.length ? body : "Ôn lại nội dung đã ghi vở.", { x: cx + 0.3, y: cy + 0.95, w: cw - 0.6, h: bh, fontSize: fit(list.join("\n"), cw - 0.6, bh, 17, 11), color: "0F2742" });
      if (prep) {
        sl.addShape(S.line, { x: cx + 0.3, y: cy + 3.2, w: cw - 0.6, h: 0, line: { color: "DCE2EA", width: 1 } });
        T(sl, "➜  CHUẨN BỊ CHO TIẾT SAU", { x: cx + 0.3, y: cy + 3.3, w: cw - 0.5, h: 0.45, fontSize: 14, bold: true, color: "1E8E5A", valign: "middle" });
        T(sl, prep, { x: cx + 0.3, y: cy + 3.75, w: cw - 0.6, h: 0.9, fontSize: fit(prep, cw - 0.6, 0.9, 15, 10), color: "0F2742" });
      }
      // Logo ứng dụng và thương hiệu giáo viên.
      box(sl, MX, H - 1.5, 6.4, 0.95, { fill: "FFFFFF" });
      const la = imgs[LOGO_A], lb = imgs[LOGO_B];
      const logo = (im, x, w, maxH) => {
        let lw = w, lh = (w * im.h) / im.w;
        if (lh > maxH) (lh = maxH), (lw = (maxH * im.w) / im.h);
        sl.addImage({ data: im.data.replace(/^data:/, ""), x, y: H - 1.5 + (0.95 - lh) / 2, w: lw, h: lh });
      };
      if (la) logo(la, MX + 0.25, 2.9, 0.62);
      if (lb) sl.addShape(S.line, { x: MX + 3.3, y: H - 1.32, w: 0, h: 0.6, line: { color: "DCE2EA", width: 1 } });
      if (lb) logo(lb, MX + 3.5, 2.6, 0.7);
      if (!la && !lb) T(sl, "Lesson 360° Studio", { x: MX + 0.2, y: H - 1.5, w: 6, h: 0.95, fontSize: 18, bold: true, color: col.accent2, valign: "middle" });
      T(sl, "Bài giảng tạo bằng Lesson 360° Studio", { x: cx, y: H - 1.25, w: cw, h: 0.4, fontSize: 11, color: "FFFFFF", transparency: 30, align: "right" });
      footer(sl, d.p, n, true);
    };

    // Ghi chú cho giáo viên (lời dẫn, đáp án).
    function notes(d) {
      const s = d.s;
      const out = [];
      if (s) {
        if (s.script) out.push("Lời dẫn: " + plain(s.script));
        if (s.instructions) out.push("Nhiệm vụ HS: " + plain(s.instructions));
        if (s.minutes) out.push(`Thời lượng: ${s.minutes} phút.`);
      }
      if (d.k === "q" && L360.Khbd) out.push("Đáp án: " + L360.Khbd.qLine(d.q, d.i) + (d.q.explain ? "\nGiải thích: " + plain(d.q.explain) : ""));
      if (d.k === "page") L360.blocks.notes(d.pg).forEach((x) => out.push(`${x.title}: ${plain(x.text)}`));
      // Nguồn ảnh ghi trong phần ghi chú (không chèn lên trang chiếu).
      if (d.k === "page") {
        const cr = [];
        arr(d.pg.blocks).forEach((b) => (b.kind === "gallery" ? arr(b.images) : [b]).forEach((im) => im.credit && cr.push(`${plain(L360.shortCap ? L360.shortCap(im.caption || "Ảnh") : im.caption || "Ảnh")} – ${plain(im.credit)}`)));
        if (cr.length) out.push("Nguồn ảnh: " + cr.join("; "));
      }
      if (d.k === "cw" && !d.reveal) out.push("Đáp án: " + arr(s.rows).map((r, i) => `${i + 1}) ${r.answer}`).join("; ") + `; từ khoá ${s.keyword}`);
      if (s && s.ghiBai) out.push("HS ghi vở: " + plain(s.ghiBai));
      return out.join("\n");
    }

    let animSeq = 0;
    pl.slides.forEach((d, i) => {
      if (opt.only && !opt.only.includes(i)) return;
      const sl = pptx.addSlide();
      sl._click = 0;
      sl._trig = 0;
      sl._an = null;
      // Gắn tên đánh dấu hiệu ứng vào hình được vẽ khi đang trong anim(…).
      const tag = (o) => (sl._an ? Object.assign({}, o, { objectName: `L360A|${sl._an.k}|${sl._an.fx}|${sl._an.dur}|${++animSeq}` }) : o);
      ["addText", "addShape"].forEach((fn) => {
        const f = sl[fn].bind(sl);
        sl[fn] = (a, o) => f(a, tag(o || {}));
      });
      const fi = sl.addImage.bind(sl);
      sl.addImage = (o) => fi(tag(o));
      try {
        R[d.k](sl, d, i + 1);
      } catch (e) {
        console.warn("PPT slide lỗi", d.k, e);
        T(sl, "(Không dựng được trang này)", { x: MX, y: 3, w: 8, h: 1, fontSize: 18 });
      }
      const nt = notes(d);
      if (nt) sl.addNotes(nt);
    });
    return { pptx, count: pl.slides.length };
  }

  /* ---------- Hiệu ứng PowerPoint: dựng <p:transition> + <p:timing> từ các hình đã đánh dấu ---------- */
  function timingXml(items, buttons = {}) {
    let id = 2;
    const nid = () => ++id;
    const tgt = (spid) => `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`;
    const vis = (spid, val, delay) =>
      `<p:set><p:cBhvr><p:cTn id="${nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="${delay || 0}"/></p:stCondLst></p:cTn>${tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="${val}"/></p:to></p:set>`;
    const effect = (it, node) => {
      const head = (preset, cls, sub) => `<p:par><p:cTn id="${nid()}" presetID="${preset}" presetClass="${cls}" presetSubtype="${sub}" fill="hold" grpId="0" nodeType="${node}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>`;
      const tail = `</p:childTnLst></p:cTn></p:par>`;
      if (it.fx === "timer") {
        const ms = Math.max(1000, it.dur || 60000);
        return head(22, "exit", 2) + `<p:animEffect transition="out" filter="wipe(right)"><p:cBhvr><p:cTn id="${nid()}" dur="${ms}"/>${tgt(it.id)}</p:cBhvr></p:animEffect>` + vis(it.id, "hidden", ms - 1) + tail;
      }
      if (it.fx === "appear" || it.fx === "after") return head(1, "entr", 0) + vis(it.id, "visible") + tail;
      if (it.fx === "wipe") return head(22, "entr", 4) + vis(it.id, "visible") + `<p:animEffect transition="in" filter="wipe(down)"><p:cBhvr><p:cTn id="${nid()}" dur="500"/>${tgt(it.id)}</p:cBhvr></p:animEffect>` + tail;
      return head(10, "entr", 0) + vis(it.id, "visible") + `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${nid()}" dur="500"/>${tgt(it.id)}</p:cBhvr></p:animEffect>` + tail;
    };
    // Một nhóm bấm: các hiệu ứng chạy ngay (bấm/cùng lúc) rồi các hiệu ứng "sau" (chờ hiệu ứng trước xong).
    const group = (g, start) => {
      const now = g.filter((x) => x.fx !== "after");
      const later = g.filter((x) => x.fx === "after");
      const outer = nid();
      let inner = "";
      if (now.length) inner += `<p:par><p:cTn id="${nid()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${now.map((x, i) => effect(x, i ? "withEffect" : "clickEffect")).join("")}</p:childTnLst></p:cTn></p:par>`;
      if (later.length) {
        const wait = Math.max(0, ...now.map((x) => (x.fx === "timer" ? Math.max(1000, x.dur || 60000) : 500)));
        inner += `<p:par><p:cTn id="${nid()}" fill="hold"><p:stCondLst><p:cond delay="${now.length ? wait : 0}"/></p:stCondLst><p:childTnLst>${later.map((x, i) => effect(x, i ? "withEffect" : now.length ? "afterEffect" : "clickEffect")).join("")}</p:childTnLst></p:cTn></p:par>`;
      }
      return `<p:par><p:cTn id="${outer}" fill="hold"><p:stCondLst><p:cond delay="${start}"/></p:stCondLst><p:childTnLst>${inner}</p:childTnLst></p:cTn></p:par>`;
    };
    const byK = {};
    items.forEach((it) => (byK[it.k] = byK[it.k] || []).push(it));
    const keys = Object.keys(byK).map(Number).sort((a, b) => a - b);
    // nhóm có nút bấm riêng (trigger) chạy thành chuỗi độc lập; còn lại theo thứ tự bấm của trang
    const trig = keys.filter((k) => buttons[k]);
    const main = keys.filter((k) => !buttons[k]);
    const mainXml = main.length
      ? `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${main.map((k) => group(byK[k], "indefinite")).join("")}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`
      : "";
    const trigXml = trig
      .map((k) => {
        const b = `<p:tgtEl><p:spTgt spid="${buttons[k]}"/></p:tgtEl>`;
        return `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${nid()}" restart="whenNotActive" fill="hold" evtFilter="cancelBubble" nodeType="interactiveSeq"><p:stCondLst><p:cond evt="onClick" delay="0">${b}</p:cond></p:stCondLst><p:endSync evt="end" delay="0"><p:rtn val="all"/></p:endSync><p:childTnLst>${group(byK[k], "0")}</p:childTnLst></p:cTn><p:nextCondLst><p:cond evt="onClick" delay="0">${b}</p:cond></p:nextCondLst></p:seq>`;
      })
      .join("");
    const bld = items.filter((x) => x.sp).map((x) => `<p:bldP spid="${x.id}" grpId="0" animBg="1"/>`);
    return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>${mainXml}${trigXml}</p:childTnLst></p:cTn></p:par></p:tnLst>${
      bld.length ? `<p:bldLst>${bld.join("")}</p:bldLst>` : ""
    }</p:timing>`;
  }
  async function animateZip(buf) {
    const zip = await window.JSZip.loadAsync(buf);
    const files = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    let total = 0;
    for (const f of files) {
      let xml = await zip.file(f).async("string");
      // Id hình phải duy nhất trong một trang (PptxGenJS đôi khi cấp trùng id cho bảng) – trùng là PowerPoint báo lỗi cần sửa tệp.
      let nid = 0;
      xml = xml.replace(/<p:cNvPr id="\d+"/g, () => `<p:cNvPr id="${++nid}"`);
      const items = [];
      const buttons = {};
      xml = xml.replace(/<p:cNvPr id="(\d+)" name="L360A\|(\d+)\|(\w+)\|(\d+)\|(\d+)"/g, (m, id, k, fx, dur, seq, off) => {
        // PowerPoint chỉ ghi bldP cho hình có chữ; hình không có chữ, ảnh, đường nối thì không.
        const before = xml.slice(Math.max(0, off - 400), off);
        const isSp = before.lastIndexOf("<p:sp>") > Math.max(before.lastIndexOf("<p:pic>"), before.lastIndexOf("<p:cxnSp>"));
        const end = xml.indexOf("</p:sp>", off);
        const body = isSp && end > 0 ? xml.slice(off, end) : "";
        const sp = isSp && /<a:t>[^<]*\S[^<]*<\/a:t>/.test(body) && body.indexOf("<p:pic>") < 0;
        if (fx === "button") {
          buttons[k] = id;
          return `<p:cNvPr id="${id}" name="Nút bắt đầu đồng hồ ${k - 900}"`;
        }
        items.push({ id, k: Number(k), fx, dur: Number(dur), sp });
        return `<p:cNvPr id="${id}" name="${Number(k) >= 900 ? "Đồng hồ " + (k - 900) : "Hiệu ứng " + k}.${seq}"`;
      });
      const tr = `<p:transition spd="med"><p:fade/></p:transition>`;
      const tm = items.length ? timingXml(items, buttons) : "";
      total += items.length;
      xml = xml.replace(/<\/p:clrMapOvr>/, `</p:clrMapOvr>${tr}${tm}`);
      zip.file(f, xml);
    }
    // Bỏ các mục thư mục trong gói (một số dịch vụ đám mây không mở được tệp có mục thư mục).
    Object.keys(zip.files).forEach((k) => zip.files[k].dir && delete zip.files[k]);
    return { blob: await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", compression: "DEFLATE" }), total };
  }

  async function download(packs, opt = {}) {
    const { pptx, count } = await build(packs, opt);
    const p = plan(packs).packs[0];
    const b = p.bai || {};
    const cut = (t, n) => (t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, "").replace(/[\s.,;:–-]+$/, ""));
    const name = `${b.so ? "Bài " + b.so + " - " : ""}${cut((b.ten || p.title).replace(/[\\/:*?"<>|]+/g, " "), 90)}${packs.length === 1 && p.tiet.tong > 1 ? ` - Tiết ${p.tiet.so}` : ""}.pptx`;
    const buf = await pptx.write({ outputType: "arraybuffer" });
    const { blob } = await animateZip(buf);
    u.downloadBlob(opt.fileName || name, blob);
    return count;
  }

  L360.Pptx = { plan, build, download, fit, animateZip };
})();
