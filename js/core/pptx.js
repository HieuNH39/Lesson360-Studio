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
  const plain = (s) =>
    String(s == null ? "" : s)
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
  function plan(packs) {
    packs = arr(packs)
      .map((p) => (p.schema === "l360-pack/2" && p.steps ? p : L360.Pack.normalize(p)))
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
        if (T === "slide") (s.pages || []).forEach((pg, i) => add({ k: "page", p, s, pg, i, n: s.pages.length }));
        else if (T === "quiz" || T === "video") {
          if (T === "video") add({ k: "video", p, s });
          const qs = s.questions || [];
          qs.forEach((q, i) => add({ k: "q", p, s, q, i, n: qs.length }));
          if (qs.length) add({ k: "qans", p, s, qs });
        } else if (T === "poll2") {
          const q = { kind: "mcq", q: s.question, options: s.options || [], answer: s.answer, explain: s.explain };
          add({ k: "q", p, s, q, i: 0, n: 1 });
          add({ k: "qans", p, s, qs: [q] });
        } else if (T === "crossword") {
          add({ k: "cw", p, s, reveal: false });
          add({ k: "cw", p, s, reveal: true });
        } else if (T === "match" || T === "order") {
          add({ k: T, p, s, reveal: false });
          add({ k: T, p, s, reveal: true });
        } else if (T === "groupwork") {
          add({ k: "group", p, s });
          add({ k: "sheet", p, s });
        } else if (T === "cards" || T === "auction") add({ k: T, p, s });
        else add({ k: "task", p, s });
        range[s.id] = [from, slides.length];
        const d = L360.describeStep ? L360.describeStep(s) : { notes: [] };
        notes = notes.concat(d.notes.filter(Boolean));
      });
      if (notes.length) add({ k: "recap", p, notes });
      if (pi === packs.length - 1) add({ k: "end", p, vd: p.steps.find((s) => s.phase === "van-dung") });
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
    const FONT = opt.font || "Calibri";
    const HFONT = opt.font || (D.id === "su-lieu" ? "Cambria" : "Calibri");
    const decor = ["su-lieu", "dong-ho"].includes(D.id) ? "frame" : ["ban-do", "so-tay", "thien-nhien"].includes(D.id) ? "band" : "circles";

    const imgs = {};
    const srcs = imageSrcs(packs);
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
      const w = Math.max(1.1, 0.13 * text.length * ((o.size || 11) / 11) + 0.4);
      sl.addShape(S.roundRect, { x, y, w, h: o.h || 0.32, rectRadius: 0.16, fill: { color }, line: { type: "none" } });
      T(sl, text, { x, y, w, h: o.h || 0.32, fontSize: o.size || 11, bold: true, color: o.color || "FFFFFF", align: "center", valign: "middle", charSpacing: 1 });
      return w;
    };
    const img = (sl, src, x, y, w, h, o = {}) => {
      const im = imgs[src];
      if (!im) {
        box(sl, x, y, w, h, { fill: col.soft });
        T(sl, o.alt || "Ảnh", { x, y, w, h, fontSize: 12, color: col.muted, align: "center", valign: "middle", italic: true });
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
    const decorate = (sl, strong) => {
      if (decor === "circles") {
        sl.addShape(S.ellipse, { x: W - 2.4, y: -1.4, w: 3.6, h: 3.6, fill: { color: strong ? col.accent2 : col.soft, transparency: strong ? 40 : 10 }, line: { type: "none" } });
        sl.addShape(S.ellipse, { x: W - 1.25, y: 1.75, w: 0.7, h: 0.7, fill: { color: col.accent, transparency: 55 }, line: { type: "none" } });
      } else if (decor === "frame") {
        sl.addShape(S.rect, { x: 0.2, y: 0.2, w: W - 0.4, h: H - 0.4, fill: { type: "none" }, line: { color: strong ? "FFFFFF" : col.accent, width: 1.25, transparency: strong ? 40 : 0 } });
        sl.addShape(S.rect, { x: 0.28, y: 0.28, w: W - 0.56, h: H - 0.56, fill: { type: "none" }, line: { color: strong ? "FFFFFF" : col.accent2, width: 0.5, transparency: strong ? 60 : 30 } });
      } else {
        sl.addShape(S.rect, { x: 0, y: 0, w: 0.16, h: H, fill: { color: strong ? col.accent2 : col.accent }, line: { type: "none" } });
        sl.addShape(S.rect, { x: W - 3.2, y: 0, w: 3.2, h: 0.08, fill: { color: strong ? "FFFFFF" : col.accent, transparency: 30 }, line: { type: "none" } });
      }
    };
    const footer = (sl, p, n, light) => {
      const lbl = [L360.Pack.label(p), p.bai && p.bai.ten ? p.bai.ten : p.title].filter(Boolean).join(" · ");
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
          return 4.2;
        case "flow":
          return 1.9;
        case "stats":
          return 1.6;
        case "compare":
          return 1 + arr(b.rows).length * 0.55;
        case "video":
          return 1.5;
        default:
          return 0.9 + Math.min(4, t.length / 110) + (b.title ? 0.35 : 0);
      }
    };
    function blockTitle(sl, b, x, y, w, def) {
      const t = plain(b.title || def || "");
      if (!t) return 0;
      T(sl, t, { x, y, w, h: 0.36, fontSize: 14, bold: true, color: col.accent2 });
      return 0.38;
    }
    function drawBlock(sl, b, x, y, w, h) {
      const k = b.kind;
      if (k === "image") {
        const capH = b.caption || b.credit ? 0.42 : 0;
        const r = img(sl, b.src, x, y, w, h - capH, { alt: b.query || b.caption });
        if (capH) {
          T(sl, [{ text: plain(b.caption || ""), options: { fontSize: 11, italic: true, color: col.ink } }].concat(b.credit ? [{ text: (b.caption ? "  ·  " : "") + "Nguồn: " + b.credit, options: { fontSize: 8, color: col.muted } }] : []), {
            x,
            y: r.y + r.h + 0.04,
            w,
            h: capH - 0.04,
            align: "center"
          });
        }
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
          T(sl, plain(im.caption || ""), { x: cx, y: r.y + r.h + 0.02, w: gw, h: 0.28, fontSize: 10, italic: true, align: "center", color: col.ink });
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
          T(sl, lt, { x: x + w - legW, y, w: legW, h: h - 0.3, fontSize: fit(lt, legW, h - 0.3, 15, 9), color: col.ink, paraSpaceAfter: 4 });
        }
        if (b.caption || b.credit) T(sl, plain(b.caption || "") + (b.credit ? "  ·  Nguồn: " + b.credit : ""), { x, y: y + h - 0.28, w, h: 0.28, fontSize: 9, italic: true, color: col.muted });
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
        const fs = fit(it.map((t) => plain(t.label || t.title || "")).join("\n"), cw * n, (h - ty) * 0.55 * 2, 15, 10);
        it.forEach((t, i) => {
          const cx = x + i * cw;
          sl.addShape(S.ellipse, { x: cx + cw / 2 - 0.13, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: col.card }, line: { color: col.accent, width: 2.5 } });
          T(sl, plain(t.time || t.year || ""), { x: cx + 0.04, y: ly - 0.62, w: cw - 0.08, h: 0.44, fontSize: Math.min(18, fs + 3), bold: true, color: col.accent2, align: "center", valign: "bottom" });
          const body = [{ text: plain(t.label || t.title || ""), options: { bold: true, breakLine: !!t.desc } }].concat(t.desc ? [{ text: plain(t.desc), options: { fontSize: Math.max(9, fs - 3), color: col.muted } }] : []);
          T(sl, body, { x: cx + 0.04, y: ly + 0.2, w: cw - 0.08, h: y + h - ly - 0.2, fontSize: fs, align: "center", color: col.ink });
        });
        return;
      }
      if (k === "mindmap") {
        const br = arr(b.branches).slice(0, 6);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const cw = Math.min(2.8, w * 0.3);
        const chh = 0.9;
        const left = br.filter((_, i) => i % 2 === 0);
        const right = br.filter((_, i) => i % 2 === 1);
        const bw = Math.min(3.6, (w - cw) / 2 - 0.35);
        const side = (list, isRight) => {
          const bh = Math.min(1.7, (h - (list.length - 1) * 0.15) / Math.max(1, list.length));
          const total = list.length * bh + (list.length - 1) * 0.15;
          list.forEach((bb, i) => {
            const bx = isRight ? x + w - bw : x;
            const by = cy - total / 2 + i * (bh + 0.15);
            sl.addShape(S.line, { x: isRight ? cx + cw / 2 : bx + bw, y: Math.min(cy, by + bh / 2), w: Math.abs((isRight ? bx : cx - cw / 2) - (isRight ? cx + cw / 2 : bx + bw)), h: Math.max(0.001, Math.abs(by + bh / 2 - cy)), line: { color: col.accent, width: 1.5 }, flipV: by + bh / 2 < cy });
            box(sl, bx, by, bw, bh, { fill: col.card, line: col.accent, lw: 1.25 });
            const items = arr(bb.items).map((s) => "• " + plain(s));
            const txt = [plain(bb.label)].concat(items).join("\n");
            const fs = fit(txt, bw - 0.2, bh - 0.1, 14, 9);
            T(sl, [{ text: plain(bb.label), options: { bold: true, color: col.accent2, breakLine: items.length > 0 } }].concat(items.map((s, j) => ({ text: s, options: { fontSize: Math.max(8, fs - 1), breakLine: j < items.length - 1 } }))), {
              x: bx + 0.1,
              y: by + 0.05,
              w: bw - 0.2,
              h: bh - 0.1,
              fontSize: fs,
              valign: "middle"
            });
          });
        };
        side(left, false);
        side(right, true);
        sl.addShape(S.roundRect, { x: cx - cw / 2, y: cy - chh / 2, w: cw, h: chh, rectRadius: 0.45, fill: { color: col.accent }, line: { type: "none" } });
        const ct = plain(b.center || b.title || "");
        T(sl, ct, { x: cx - cw / 2 + 0.1, y: cy - chh / 2, w: cw - 0.2, h: chh, fontSize: fit(ct, cw - 0.2, chh, 18, 11), bold: true, color: "FFFFFF", align: "center", valign: "middle" });
        return;
      }
      if (k === "compare") {
        const cols = arr(b.columns);
        const rows = arr(b.rows);
        const ty = blockTitle(sl, b, x, y, w);
        const all = [cols].concat(rows).map((r) => arr(r).map(plain).join(" "));
        const fs = fit(all.join("\n"), w * 0.9, h - ty, 16, 9);
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
          const fs = fit(txt, bw * n, bh * 1.6, 15, 9);
          st.forEach((s, i) => {
            const bx = x + i * (bw + gap);
            box(sl, bx, by, bw, bh, { fill: i % 2 ? col.soft : col.card, line: col.accent, lw: 1.25 });
            sl.addShape(S.ellipse, { x: bx + bw / 2 - 0.2, y: by - 0.2, w: 0.4, h: 0.4, fill: { color: col.accent }, line: { color: col.bg, width: 2 } });
            T(sl, String(i + 1), { x: bx + bw / 2 - 0.2, y: by - 0.2, w: 0.4, h: 0.4, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
            T(sl, [{ text: plain(s.label), options: { bold: true, breakLine: !!s.desc } }].concat(s.desc ? [{ text: plain(s.desc), options: { fontSize: Math.max(8, fs - 2), color: col.muted } }] : []), {
              x: bx + 0.08,
              y: by + 0.22,
              w: bw - 0.16,
              h: bh - 0.3,
              fontSize: fs,
              align: "center",
              valign: "middle"
            });
            if (i < n - 1) sl.addShape(S.rightArrow, { x: bx + bw + 0.04, y: by + bh / 2 - 0.12, w: gap - 0.08, h: 0.24, fill: { color: col.accent }, line: { type: "none" } });
          });
        } else {
          const cx = x + w / 2;
          const cy = y + ty + (h - ty) / 2;
          const R = Math.min(w, h - ty) / 2 - 0.55;
          sl.addShape(S.ellipse, { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R, fill: { type: "none" }, line: { color: col.accent, width: 2, dashType: "dash" } });
          if (b.center) T(sl, plain(b.center), { x: cx - R * 0.6, y: cy - 0.5, w: R * 1.2, h: 1, fontSize: 16, bold: true, align: "center", valign: "middle", color: col.accent2 });
          const nw = Math.min(2.4, R * 1.15);
          st.forEach((s, i) => {
            const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
            const nx = cx + R * Math.cos(a) - nw / 2;
            const ny = cy + R * Math.sin(a) - 0.42;
            box(sl, nx, ny, nw, 0.84, { fill: col.card, line: col.accent, lw: 1.25 });
            const t = `${i + 1}. ${plain(s.label)}`;
            T(sl, t, { x: nx + 0.06, y: ny, w: nw - 0.12, h: 0.84, fontSize: fit(t, nw - 0.12, 0.84, 13, 8), bold: true, align: "center", valign: "middle" });
          });
        }
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
          T(sl, plain(s.label), { x: sx + 0.1, y: y + ty + (h - ty) * 0.6, w: cw - 0.2, h: (h - ty) * 0.38, fontSize: fit(plain(s.label), cw - 0.2, (h - ty) * 0.38, 14, 8), align: "center", color: col.ink });
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
          { x, y: y + ty, w, h: h - ty, fontSize: fit(txt, w, h - ty, 18, 10), paraSpaceAfter: 6 }
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
          fontSize: fit(txt + (b.source ? "\n" + b.source : ""), w - 0.45, h - 0.5, 20, 10),
          fontFace: HFONT
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
        T(sl, plain(cfg.title).toUpperCase(), { x: x + 0.62, y: y + 0.12, w: w - 0.8, h: 0.38, fontSize: 12, bold: true, color: cfg.tc, valign: "middle", charSpacing: 1 });
        const txt = String(b.text || "");
        T(sl, runs(txt), { x: x + 0.2, y: y + 0.56, w: w - 0.4, h: h - 0.66, fontSize: fit(plain(txt), w - 0.4, h - 0.66, k === "note" ? 18 : 20, 10), color: dark && k !== "conclusion" ? col.ink : col.ink, paraSpaceAfter: 4 });
        return;
      }
      // text, list và mặc định
      const ty = blockTitle(sl, b, x, y, w);
      const md = k === "list" ? arr(b.items).map((it) => "- " + (typeof it === "string" ? it : it.text)).join("\n") : b.md || b.text || L360.blocks.plain(b) || "";
      T(sl, runs(md), { x, y: y + ty, w, h: h - ty, fontSize: fit(plain(md), w, h - ty, 22, 11), paraSpaceAfter: 6, lineSpacingMultiple: 1.05 });
    }
    function stackBlocks(sl, list, x, y, w, h) {
      if (!list.length) return;
      const gap = 0.18;
      const ws = list.map(weight);
      const sum = ws.reduce((a, b) => a + b, 0);
      let cy = y;
      list.forEach((b, i) => {
        const bh = ((h - gap * (list.length - 1)) * ws[i]) / sum;
        drawBlock(sl, b, x, cy, w, bh);
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
      g.forEach((o, i) => {
        const y = 1.95 + i * (rowH + 0.08);
        box(sl, MX, y, W - 2 * MX, rowH, { fill: col.card, line: col.line });
        sl.addShape(S.ellipse, { x: MX + 0.18, y: y + rowH / 2 - 0.2, w: 0.4, h: 0.4, fill: { color: col.accent }, line: { type: "none" } });
        T(sl, "✓", { x: MX + 0.18, y: y + rowH / 2 - 0.2, w: 0.4, h: 0.4, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
        T(sl, plain(o), { x: MX + 0.75, y, w: W - 2 * MX - 0.9, h: rowH, fontSize: fit(plain(o), W - 2 * MX - 0.9, rowH, 20, 12), valign: "middle" });
      });
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
      const list = d.steps.map((s) => `${plain(s.title)}${s.minutes ? `  ·  ${s.minutes} phút` : ""}`);
      T(sl, list.map((t, i) => ({ text: t, options: { bullet: { code: "25CF" }, breakLine: i < list.length - 1 } })), { x: MX + 0.1, y: 4.0, w: W - 2 * MX - 3, h: 2.6, fontSize: fit(list.join("\n"), W - 2 * MX - 3, 2.6, 22, 12), color: "FFFFFF", paraSpaceAfter: 6 });
      footer(sl, d.p, n, true);
    };
    R.page = (sl, d, n) => {
      const pg = d.pg;
      const bl = arr(pg.blocks);
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
        stackBlocks(sl, rest, MX + lw + 0.3, y, W - 2 * MX - lw - 0.3, h);
      } else stackBlocks(sl, bl, MX, y, W - 2 * MX, h);
      footer(sl, d.p, n);
    };
    R.video = (sl, d, n) => {
      header(sl, d.s.phase, d.s.title, { chip: "Video" });
      const v = L360.videoSource ? L360.videoSource(d.s.source || {}) : {};
      const qs = arr(d.s.questions);
      drawBlock(sl, { kind: "video", src: (d.s.source || {}).url, edu: (d.s.source || {}).edu, caption: v.title || d.s.title }, MX, 1.95, W - 2 * MX, 1.6);
      if (d.s.instructions) T(sl, plain(d.s.instructions), { x: MX, y: 3.75, w: W - 2 * MX, h: 0.6, fontSize: 18, italic: true });
      const lines = qs.map((q, i) => `${q.t != null ? u.fmtSec(q.t) + " – " : ""}Câu ${i + 1}: ${plain(q.q)}`);
      T(sl, lines.join("\n"), { x: MX, y: 4.45, w: W - 2 * MX, h: 2.3, fontSize: fit(lines.join("\n"), W - 2 * MX, 2.3, 18, 11), paraSpaceAfter: 6 });
      footer(sl, d.p, n);
    };
    R.q = (sl, d, n) => {
      const q = d.q;
      header(sl, d.s.phase, d.s.title, { chip: d.n > 1 ? `Câu ${d.i + 1}/${d.n}` : "Câu hỏi" });
      const qt = plain(q.q);
      const hasImg = q.image && imgs[q.image];
      const qw = hasImg ? 7.4 : W - 2 * MX;
      box(sl, MX, 1.95, qw, 1.45, { fill: col.card, line: col.line, shadow: true });
      T(sl, qt, { x: MX + 0.2, y: 1.98, w: qw - 0.4, h: 1.4, fontSize: fit(qt, qw - 0.4, 1.4, 26, 14), bold: true, valign: "middle" });
      if (hasImg) img(sl, q.image, MX + qw + 0.25, 1.95, W - 2 * MX - qw - 0.25, 4.8);
      const ow = hasImg ? qw : W - 2 * MX;
      if (q.kind === "tf") {
        const st = arr(q.statements);
        st.forEach((x, i) => {
          const y = 3.6 + i * 0.8;
          box(sl, MX, y, ow, 0.68, { fill: col.soft });
          T(sl, "abcd"[i] + ")", { x: MX + 0.15, y, w: 0.5, h: 0.68, fontSize: 18, bold: true, color: col.accent2, valign: "middle" });
          T(sl, plain(x.text), { x: MX + 0.65, y, w: ow - 2.3, h: 0.68, fontSize: fit(plain(x.text), ow - 2.3, 0.68, 18, 10), valign: "middle" });
          ["Đ", "S"].forEach((lab, j) => {
            sl.addShape(S.roundRect, { x: MX + ow - 1.5 + j * 0.7, y: y + 0.12, w: 0.55, h: 0.44, rectRadius: 0.08, fill: { color: col.card }, line: { color: col.accent, width: 1 } });
            T(sl, lab, { x: MX + ow - 1.5 + j * 0.7, y: y + 0.12, w: 0.55, h: 0.44, fontSize: 14, bold: true, align: "center", valign: "middle", color: col.accent2, margin: 0 });
          });
        });
      } else if (q.kind === "short") {
        box(sl, MX, 3.75, ow, 1.1, { fill: col.card, line: col.accent, dash: "dash" });
        T(sl, `Trả lời ngắn${q.unit ? " (đơn vị: " + q.unit + ")" : ""}: ……………………………`, { x: MX + 0.25, y: 3.75, w: ow - 0.5, h: 1.1, fontSize: 22, color: col.muted, valign: "middle" });
      } else {
        const op = arr(q.options);
        const two = op.length > 2 && op.every((o) => plain(o).length < 60);
        const cols = two ? 2 : 1;
        const rows = Math.ceil(op.length / cols);
        const ohh = Math.min(1.25, (3.2 - (rows - 1) * 0.15) / rows);
        const cw = (ow - (cols - 1) * 0.2) / cols;
        const colors = ["E8930C", "2F6FDB", "1E8E5A", "D2453B", "0C9A9A", "8A5A2B"];
        op.forEach((o, i) => {
          const x = MX + (i % cols) * (cw + 0.2);
          const y = 3.6 + Math.floor(i / cols) * (ohh + 0.15);
          box(sl, x, y, cw, ohh, { fill: col.card, line: col.line });
          sl.addShape(S.roundRect, { x: x + 0.12, y: y + ohh / 2 - 0.27, w: 0.54, h: 0.54, rectRadius: 0.1, fill: { color: colors[i % 6] }, line: { type: "none" } });
          T(sl, LET[i], { x: x + 0.12, y: y + ohh / 2 - 0.27, w: 0.54, h: 0.54, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
          T(sl, plain(o), { x: x + 0.8, y, w: cw - 0.95, h: ohh, fontSize: fit(plain(o), cw - 0.95, ohh, 20, 10), valign: "middle" });
        });
      }
      footer(sl, d.p, n);
    };
    R.qans = (sl, d, n) => {
      header(sl, d.s.phase, d.s.title + " – Đáp án", { chip: "Đáp án" });
      const rows = [[{ text: "Câu", options: { bold: true, color: "FFFFFF", fill: { color: col.accent }, align: "center" } }, { text: "Đáp án", options: { bold: true, color: "FFFFFF", fill: { color: col.accent } } }, { text: "Giải thích", options: { bold: true, color: "FFFFFF", fill: { color: col.accent } } }]].concat(
        d.qs.map((q, i) => {
          const a = q.kind === "tf" ? arr(q.statements).map((x, j) => `${"abcd"[j]}) ${x.answer ? "Đúng" : "Sai"}`).join("; ") : q.kind === "short" ? String(q.answer) : `${LET[Number(q.answer) || 0]}. ${plain(arr(q.options)[Number(q.answer) || 0] || "")}`;
          const f = { fill: { color: i % 2 ? col.card : col.soft }, color: dark ? "0F1B2D" : col.ink };
          return [{ text: String(i + 1), options: Object.assign({ align: "center", bold: true }, f) }, { text: a, options: Object.assign({ bold: true }, f) }, { text: plain(q.explain || ""), options: f }];
        })
      );
      const txt = rows.map((r) => r.map((c) => c.text).join(" ")).join("\n");
      sl.addTable(rows, { x: MX, y: 1.95, w: W - 2 * MX, colW: [0.8, 4.2, W - 2 * MX - 5], fontFace: FONT, fontSize: fit(txt, (W - 2 * MX) * 0.9, 4.9, 16, 9), border: { type: "solid", pt: 0.75, color: col.line }, valign: "middle", margin: 0.06, autoPage: false });
      footer(sl, d.p, n);
    };
    R.cw = (sl, d, n) => {
      const s = d.s;
      const rows = arr(s.rows);
      header(sl, s.phase, s.title + (d.reveal ? " – Đáp án" : ""), { chip: d.reveal ? "Đáp án" : `${rows.length} hàng ngang` });
      const keyCol = Math.max(0, ...rows.map((r) => (r.key >= 0 ? r.key : 0)));
      const left = rows.map((r) => keyCol - Math.max(0, r.key));
      const width = Math.max(...rows.map((r, i) => left[i] + r.answer.length), 1);
      const gridW = d.reveal ? W - 2 * MX - 0.5 : 6.6;
      const cell = Math.min(0.55, gridW / (width + 1), 4.8 / Math.max(rows.length, 1));
      const gx = MX + 0.5;
      const gy = 1.95;
      rows.forEach((r, i) => {
        T(sl, String(i + 1), { x: gx - 0.5, y: gy + i * cell, w: 0.4, h: cell, fontSize: Math.min(14, cell * 26), bold: true, color: col.accent2, align: "right", valign: "middle" });
        r.answer.split("").forEach((ch, j) => {
          const isKey = left[i] + j === keyCol;
          sl.addShape(S.rect, { x: gx + (left[i] + j) * cell, y: gy + i * cell, w: cell, h: cell, fill: { color: isKey ? col.accent : col.card }, line: { color: col.accent2, width: 1 } });
          if (d.reveal) T(sl, ch, { x: gx + (left[i] + j) * cell, y: gy + i * cell, w: cell, h: cell, fontSize: Math.min(20, cell * 30), bold: true, align: "center", valign: "middle", color: isKey ? "FFFFFF" : col.ink, margin: 0 });
        });
      });
      if (d.reveal) T(sl, [{ text: "Từ khoá: ", options: { bold: true } }, { text: s.keyword, options: { bold: true, color: col.accent } }, { text: s.keyClue ? "  –  " + plain(s.keyClue) : "", options: { color: col.muted } }], { x: MX, y: H - 1.05, w: W - 2 * MX, h: 0.5, fontSize: 20 });
      else {
        const cl = rows.map((r, i) => `${i + 1}. ${plain(r.clue)}`).join("\n") + (s.keyClue ? `\nTừ khoá: ${plain(s.keyClue)}` : "");
        T(sl, cl, { x: 7.6, y: 1.95, w: W - 7.6 - MX, h: 4.85, fontSize: fit(cl, W - 7.6 - MX, 4.85, 17, 9), paraSpaceAfter: 5 });
      }
      footer(sl, d.p, n);
    };
    R.match = (sl, d, n) => {
      const s = d.s;
      const pairs = arr(s.pairs);
      header(sl, s.phase, s.title + (d.reveal ? " – Đáp án" : ""), { chip: d.reveal ? "Đáp án" : "Ghép nối" });
      T(sl, plain(s.question), { x: MX, y: 1.9, w: W - 2 * MX, h: 0.5, fontSize: 18, italic: true });
      const order = shuffle(pairs.map((p) => p.right), s.id);
      const rh = Math.min(0.85, 4.3 / Math.max(1, pairs.length));
      const cw = (W - 2 * MX - 0.8) / 2;
      pairs.forEach((p, i) => {
        const y = 2.5 + i * (rh + 0.08);
        box(sl, MX, y, cw, rh, { fill: col.soft });
        T(sl, `${i + 1}. ${plain(p.left)}`, { x: MX + 0.12, y, w: cw - 0.24, h: rh, fontSize: fit(plain(p.left), cw - 0.24, rh, 17, 9), valign: "middle", bold: true });
        const right = d.reveal ? `${LET[order.findIndex((o) => o[1] === i)]}. ${plain(p.right)}` : `${LET[i]}. ${plain(order[i][0])}`;
        box(sl, MX + cw + 0.8, y, cw, rh, { fill: col.card, line: col.line });
        T(sl, right, { x: MX + cw + 0.92, y, w: cw - 0.24, h: rh, fontSize: fit(right, cw - 0.24, rh, 17, 9), valign: "middle" });
        if (d.reveal) sl.addShape(S.rightArrow, { x: MX + cw + 0.15, y: y + rh / 2 - 0.12, w: 0.5, h: 0.24, fill: { color: col.accent }, line: { type: "none" } });
      });
      if (d.reveal && s.explain) T(sl, plain(s.explain), { x: MX, y: H - 0.95, w: W - 2 * MX, h: 0.5, fontSize: 13, italic: true, color: col.muted });
      footer(sl, d.p, n);
    };
    R.order = (sl, d, n) => {
      const s = d.s;
      const items = arr(s.items).map((x) => (typeof x === "string" ? x : x.text));
      header(sl, s.phase, s.title + (d.reveal ? " – Đáp án" : ""), { chip: d.reveal ? "Thứ tự đúng" : "Sắp xếp" });
      T(sl, plain(s.question), { x: MX, y: 1.9, w: W - 2 * MX, h: 0.5, fontSize: 18, italic: true });
      const list = d.reveal ? items.map((t, i) => [t, i]) : shuffle(items, s.id);
      const rh = Math.min(0.85, 4.3 / Math.max(1, list.length));
      list.forEach(([t], i) => {
        const y = 2.5 + i * (rh + 0.08);
        box(sl, MX, y, W - 2 * MX, rh, { fill: d.reveal ? col.soft : col.card, line: col.line });
        sl.addShape(S.roundRect, { x: MX + 0.12, y: y + rh / 2 - 0.25, w: 0.5, h: 0.5, rectRadius: 0.08, fill: { color: d.reveal ? col.accent : col.card }, line: { color: col.accent, width: 1 } });
        T(sl, d.reveal ? String(i + 1) : LET[i], { x: MX + 0.12, y: y + rh / 2 - 0.25, w: 0.5, h: 0.5, fontSize: 16, bold: true, align: "center", valign: "middle", color: d.reveal ? "FFFFFF" : col.accent2, margin: 0 });
        T(sl, plain(t), { x: MX + 0.8, y, w: W - 2 * MX - 1, h: rh, fontSize: fit(plain(t), W - 2 * MX - 1, rh, 18, 10), valign: "middle" });
      });
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
      const ch = Math.min(1.1, (3.4 - (rows - 1) * 0.15) / Math.max(1, rows));
      cards.forEach((c, i) => {
        const x = MX + (i % cols) * (cw + 0.2);
        const y = 3.05 + Math.floor(i / cols) * (ch + 0.15);
        box(sl, x, y, cw, ch, { fill: col.soft, line: col.accent, lw: 1 });
        T(sl, plain(c), { x: x + 0.1, y, w: cw - 0.2, h: ch, fontSize: fit(plain(c), cw - 0.2, ch, 18, 10), align: "center", valign: "middle", bold: true });
      });
      if (s.textPrompt) T(sl, "✎ " + plain(s.textPrompt), { x: MX, y: H - 0.95, w: W - 2 * MX, h: 0.45, fontSize: 15, italic: true, color: col.muted });
      footer(sl, d.p, n);
    };
    R.auction = (sl, d, n) => {
      const s = d.s;
      header(sl, s.phase, s.title, { chip: `Ngân sách ${s.budget || 100}` });
      T(sl, plain(s.question), { x: MX, y: 1.95, w: W - 2 * MX, h: 0.7, fontSize: 20, bold: true });
      const it = arr(s.items);
      const cw = (W - 2 * MX - (it.length - 1) * 0.2) / Math.max(1, it.length);
      const tfs = Math.min(18, ...it.map((x) => fit(plain(x.title), cw - 0.3, 0.62, 18, 11)));
      it.forEach((x, i) => {
        const bx = MX + i * (cw + 0.2);
        box(sl, bx, 2.85, cw, 3.8, { fill: col.card, line: col.accent, lw: 1.25, shadow: true });
        const hasIm = x.image && imgs[x.image];
        if (hasIm) img(sl, x.image, bx + 0.1, 2.95, cw - 0.2, 1.6, { cover: false });
        const ty = hasIm ? 4.62 : 2.95;
        T(sl, plain(x.title), { x: bx + 0.15, y: ty, w: cw - 0.3, h: 0.62, fontSize: tfs, bold: true, color: col.accent2 });
        T(sl, plain(x.text || ""), { x: bx + 0.15, y: ty + 0.66, w: cw - 0.3, h: 6.55 - ty - 0.66, fontSize: fit(plain(x.text || ""), cw - 0.3, 6.55 - ty - 0.66, 16, 9) });
      });
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
      const rh = Math.min(0.52, (H - 0.65 - 4.1) / Math.max(1, roles.length) - 0.08);
      roles.forEach((r, i) => {
        box(sl, MX, 4.1 + i * (rh + 0.08), 5.5, rh, { fill: col.card, line: col.line });
        T(sl, `${i + 1}. ${plain(r)}`, { x: MX + 0.15, y: 4.1 + i * (rh + 0.08), w: 5.2, h: rh, fontSize: Math.min(15, rh * 30), valign: "middle" });
      });
      const res = arr(s.resources).map((r) => `• ${plain(r.title)}${r.body ? ": " + plain(r.body).slice(0, 160) : ""}`).join("\n");
      if (res) {
        T(sl, "Tư liệu", { x: 6.6, y: 3.65, w: W - 6.6 - MX, h: 0.4, fontSize: 15, bold: true, color: col.accent2 });
        T(sl, res, { x: 6.6, y: 4.1, w: W - 6.6 - MX, h: 2.7, fontSize: fit(res, W - 6.6 - MX, 2.7, 15, 9) });
      }
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
      footer(sl, d.p, n);
    };
    R.recap = (sl, d, n) => {
      header(sl, "", "Ghi nhớ", { ghi: true, label: "TỔNG KẾT" });
      const t = d.notes.map((x) => plain(x).replace(/^\s*-\s*/gm, "")).filter(Boolean);
      const txt = t.join("\n");
      box(sl, MX, 1.95, W - 2 * MX, 4.85, { fill: dark ? "3A3214" : "FFF8E1", line: "E0A100", lw: 1.5, dash: "dash" });
      T(sl, t.map((x, i) => ({ text: x, options: { bullet: { type: "number" }, breakLine: i < t.length - 1 } })), { x: MX + 0.3, y: 2.1, w: W - 2 * MX - 0.6, h: 4.55, fontSize: fit(txt, W - 2 * MX - 0.9, 4.55, 22, 10), paraSpaceAfter: 8 });
      footer(sl, d.p, n);
    };
    R.end = (sl, d, n) => {
      sl.background = { color: col.accent };
      decorate(sl, true);
      T(sl, d.vd ? "Nhiệm vụ về nhà" : "Cảm ơn các em!", { x: MX, y: 1.6, w: W - 2 * MX, h: 1.1, fontSize: 44, bold: true, color: "FFFFFF", fontFace: HFONT });
      if (d.vd) {
        const t = plain(d.vd.question || d.vd.task || d.vd.instructions || d.vd.title);
        T(sl, t, { x: MX, y: 2.9, w: W - 2 * MX - 1, h: 2.6, fontSize: fit(t, W - 2 * MX - 1, 2.6, 26, 14), color: "FFFFFF" });
      }
      T(sl, "Lesson 360° Studio", { x: MX, y: H - 1.0, w: 6, h: 0.4, fontSize: 12, color: "FFFFFF", transparency: 30 });
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
      if (d.k === "cw" && !d.reveal) out.push("Đáp án: " + arr(s.rows).map((r, i) => `${i + 1}) ${r.answer}`).join("; ") + `; từ khoá ${s.keyword}`);
      if (s && s.ghiBai) out.push("HS ghi vở: " + plain(s.ghiBai));
      return out.join("\n");
    }

    pl.slides.forEach((d, i) => {
      if (opt.only && !opt.only.includes(i)) return;
      const sl = pptx.addSlide();
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

  async function download(packs, opt = {}) {
    const { pptx, count } = await build(packs, opt);
    const p = plan(packs).packs[0];
    const b = p.bai || {};
    const cut = (t, n) => (t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, "").replace(/[\s.,;:–-]+$/, ""));
    const name = `${b.so ? "Bài " + b.so + " - " : ""}${cut((b.ten || p.title).replace(/[\\/:*?"<>|]+/g, " "), 90)}${packs.length === 1 && p.tiet.tong > 1 ? ` - Tiết ${p.tiet.so}` : ""}.pptx`;
    await pptx.writeFile({ fileName: opt.fileName || name });
    return count;
  }

  L360.Pptx = { plan, build, download, fit };
})();
