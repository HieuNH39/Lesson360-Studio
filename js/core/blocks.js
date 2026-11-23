/* Khối trực quan cho bài giảng: ảnh, dòng thời gian, sơ đồ tư duy, bảng so sánh, quy trình, vòng tuần hoàn,
   số liệu nổi bật, tư liệu, bản đồ có ghim, kết luận, ghi vào vở, câu hỏi, thuật ngữ, video.
   Dùng chung cho màn chiếu, máy học sinh, bảng điều khiển, phiếu in và xuất PPT. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;

  /* Biểu tượng nét mảnh (24×24). */
  const P = (d, extra = "") => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const icons = {
    ghiBai: P('<path d="M5 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h10"/><path d="M9 8h5M9 11h4"/><path d="M19.5 3.5l1 1-5.5 5.5-1.6.5.5-1.6z"/>'),
    ketLuan: P('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.7V16h5.6v-.5c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3z"/>'),
    cauHoi: P('<path d="M4 5h16v11H9l-4 4z"/><path d="M10 9.2a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2"/><path d="M12 14h.01"/>'),
    tuLieu: P('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 11h6M10 14h6M10 17h4"/>'),
    sgk: P('<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>'),
    video: P('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>'),
    soundOn: P('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
    soundOff: P('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9l4 6M21 9l-4 6"/>'),
    dice: P('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01"/>'),
    clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    users: P('<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>'),
    star: P('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    pin: P('<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>'),
    spark: P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
    flag: P('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
    book: P('<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h12"/>'),
    check: P('<path d="M5 12l5 5L20 7"/>'),
    arrow: P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    image: P('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>'),
    layers: P('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    print: P('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
    globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    edit: P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
    trophy: P('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M10 15h4l1 5H9z"/>'),
    home: P('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
    grid: P('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
    chart: P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    copy: P('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    play: P('<path d="M7 5l12 7-12 7z"/>'),
    download: P('<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>'),
    user: P('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    doc: P('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6M10 16h6"/>'),
    slides: P('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/><path d="M7 8h6M7 11h4"/>'),
    upload: P('<path d="M12 20V8M6 13l6-6 6 6M4 4h16"/>'),
    info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    save: P('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'),
    logout: P('<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h11"/>')
  };
  L360.icons = icons;
  L360.icon = (name, cls = "") => `<span class="ic ${cls}">${icons[name] || ""}</span>`;

  /* Văn bản ngắn: dòng "- " là gạch đầu dòng, **đậm**, *nghiêng*. */
  ui.md = (text) => {
    const lines = String(text || "").split(/\r?\n/);
    let out = "";
    let inList = false;
    lines.forEach((ln) => {
      const m = ln.match(/^\s*[-•*]\s+(.*)$/);
      if (m) {
        if (!inList) {
          out += "<ul>";
          inList = true;
        }
        out += `<li>${u.rich(m[1])}</li>`;
      } else {
        if (inList) {
          out += "</ul>";
          inList = false;
        }
        if (ln.trim()) out += `<p>${u.rich(ln)}</p>`;
      }
    });
    if (inList) out += "</ul>";
    return out;
  };

  const esc = u.esc;
  const rich = (s) => u.rich(String(s == null ? "" : s));
  const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  const head = (b, def, icon) => (b.title || def ? `<div class="blk-h">${icon ? L360.icon(icon) : ""}<span>${rich(b.title || def)}</span></div>` : "");
  const credit = (b) => (b.credit ? `<span class="blk-cr">Nguồn: ${esc(b.credit)}</span>` : "");

  const R = {};
  R.text = (b) => `${head(b)}<div class="md">${ui.md(b.md || b.text || "")}</div>`;
  R.list = (b) => `${head(b)}<ul class="blk-ul">${arr(b.items).map((x) => `<li>${rich(typeof x === "string" ? x : x.text)}</li>`).join("")}</ul>`;
  R.image = (b) =>
    `<figure class="blk-fig ${b.fit === "cover" ? "cover" : ""}">${b.src ? `<img src="${esc(b.src)}" alt="${esc(b.caption || b.alt || "")}" loading="lazy">` : `<div class="blk-noimg">${L360.icon("image")}<span>${esc(b.query ? "Ảnh: " + b.query : "Chưa có ảnh")}</span></div>`}${
      b.caption || b.credit ? `<figcaption>${rich(b.caption || "")} ${credit(b)}</figcaption>` : ""
    }</figure>`;
  R.gallery = (b) => `${head(b)}<div class="blk-gal n${Math.min(4, arr(b.images).length)}">${arr(b.images).map((im) => R.image(im)).join("")}</div>`;
  R.timeline = (b) => {
    const items = arr(b.items);
    return `${head(b, "", "clock")}<div class="blk-tl ${items.length > 5 ? "many" : ""}">${items
      .map((it, i) => `<div class="tl-it" style="--i:${i}"><div class="tl-t">${rich(it.time || it.year || "")}</div><div class="tl-dot"></div><div class="tl-b"><b>${rich(it.label || it.title || "")}</b>${it.desc ? `<span>${rich(it.desc)}</span>` : ""}</div></div>`)
      .join("")}</div>`;
  };
  R.mindmap = (b) => {
    const br = arr(b.branches).slice(0, 6);
    const n = br.length || 1;
    const pos = br.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n + (n === 2 ? Math.PI / 2 : 0);
      return { x: 50 + 36 * Math.cos(a), y: 50 + 37 * Math.sin(a) };
    });
    return `${head(b)}<div class="blk-mm"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="mm-lines">${pos
      .map((p) => `<line x1="50" y1="50" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"/>`)
      .join("")}</svg><div class="mm-c">${rich(b.center || b.title || "")}</div>${br
      .map((x, i) => `<div class="mm-b" style="left:${pos[i].x.toFixed(1)}%;top:${pos[i].y.toFixed(1)}%;--i:${i}"><b>${rich(x.label || x.title || "")}</b>${arr(x.items).length ? `<ul>${arr(x.items).map((y) => `<li>${rich(y)}</li>`).join("")}</ul>` : ""}</div>`)
      .join("")}</div>`;
  };
  R.compare = (b) => {
    const cols = arr(b.columns);
    return `${head(b)}<div class="blk-cmp-w"><table class="blk-cmp"><thead><tr>${cols.map((c) => `<th>${rich(c)}</th>`).join("")}</tr></thead><tbody>${arr(b.rows)
      .map((r) => `<tr>${arr(r).map((c, i) => (i === 0 ? `<th>${rich(c)}</th>` : `<td>${rich(c)}</td>`)).join("")}</tr>`)
      .join("")}</tbody></table></div>`;
  };
  R.flow = (b) =>
    `${head(b)}<div class="blk-flow">${arr(b.steps)
      .map((s, i, a) => `<div class="fl-s"><span class="fl-n">${i + 1}</span><b>${rich(s.label || s.title || s)}</b>${s.desc ? `<span>${rich(s.desc)}</span>` : ""}</div>${i < a.length - 1 ? `<div class="fl-a">${icons.arrow}</div>` : ""}`)
      .join("")}</div>`;
  R.cycle = (b) => {
    const it = arr(b.items).slice(0, 6);
    const n = it.length || 1;
    return `${head(b)}<div class="blk-cyc"><svg viewBox="0 0 100 100" class="cyc-ring"><circle cx="50" cy="50" r="34"/></svg>${b.center ? `<div class="cyc-c">${rich(b.center)}</div>` : ""}${it
      .map((x, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return `<div class="cyc-i" style="left:${(50 + 34 * Math.cos(a)).toFixed(1)}%;top:${(50 + 34 * Math.sin(a)).toFixed(1)}%"><span>${i + 1}</span>${rich(x.label || x)}</div>`;
      })
      .join("")}</div>`;
  };
  // Hai vòng giao nhau: điểm riêng của A, của B và điểm giống nhau ở giữa.
  R.venn = (b) =>
    `${head(b)}<div class="blk-venn"><div class="vn-c vn-l"><b>${rich(b.left || "A")}</b><ul>${arr(b.leftItems).map((x) => `<li>${rich(x)}</li>`).join("")}</ul></div><div class="vn-c vn-r"><b>${rich(b.right || "B")}</b><ul>${arr(b.rightItems)
      .map((x) => `<li>${rich(x)}</li>`)
      .join("")}</ul></div><div class="vn-m"><b>${rich(b.bothLabel || "Giống nhau")}</b><ul>${arr(b.both).map((x) => `<li>${rich(x)}</li>`).join("")}</ul></div></div>`;
  // Tháp phân tầng: tầng trên cùng hẹp nhất (thứ bậc xã hội, mức độ, cấp quản lí…).
  R.pyramid = (b) => {
    const it = arr(b.items).slice(0, 6);
    const n = it.length || 1;
    return `${head(b)}<div class="blk-pyr">${it
      .map((x, i) => `<div class="py-t" style="--w:${(38 + (62 * (i + 1)) / n).toFixed(1)}%;--i:${i}"><b>${rich(x.label || x)}</b>${x.desc ? `<span>${rich(x.desc)}</span>` : ""}</div>`)
      .join("")}</div>`;
  };
  R.stats = (b) => `${head(b)}<div class="blk-stats">${arr(b.items).map((x) => `<div class="st-i"><b>${rich(x.value)}</b><span>${rich(x.label || "")}</span></div>`).join("")}</div>`;
  R.quote = (b) => `<div class="blk-quote">${head(b, "Tư liệu", "tuLieu")}<blockquote>${ui.md(b.text || "")}</blockquote>${b.source ? `<div class="q-src">— ${rich(b.source)}</div>` : ""}</div>`;
  R.map = (b) =>
    `${head(b, "", "pin")}<div class="blk-map"><div class="map-w">${b.src ? `<img src="${esc(b.src)}" alt="${esc(b.caption || "")}" loading="lazy">` : `<div class="blk-noimg">${L360.icon("globe")}<span>${esc(b.query || "Bản đồ")}</span></div>`}${arr(b.pins)
      .map((p, i) => `<span class="map-pin" style="left:${Number(p.x) || 0}%;top:${Number(p.y) || 0}%" title="${esc(p.label || "")}">${i + 1}</span>`)
      .join("")}</div>${arr(b.pins).length ? `<ol class="map-leg">${arr(b.pins).map((p) => `<li>${rich(p.label || "")}</li>`).join("")}</ol>` : ""}${b.caption || b.credit ? `<div class="blk-cap">${rich(b.caption || "")} ${credit(b)}</div>` : ""}</div>`;
  R.conclusion = (b) => `<div class="blk-box blk-concl">${head(b, "Kết luận", "ketLuan")}<div class="md">${ui.md(b.text || "")}</div></div>`;
  R.note = (b) => `<div class="blk-box blk-note">${head(b, "Ghi vào vở", "ghiBai")}<div class="md">${ui.md(b.text || "")}</div></div>`;
  R.question = (b) => `<div class="blk-box blk-ask">${head(b, "Câu hỏi", "cauHoi")}<div class="md">${ui.md(b.text || "")}</div></div>`;
  R.keyterms = (b) => `${head(b, "Thuật ngữ", "book")}<div class="blk-terms">${arr(b.items).map((t) => `<div class="kt"><b>${rich(t.term)}</b><span>${rich(t.def || "")}</span></div>`).join("")}</div>`;
  R.video = (b, o) => {
    const v = L360.videoSource ? L360.videoSource(b) : { kind: "link", url: b.src || b.url };
    if (o.mode === "screen" && v.embed) return `${head(b, "", "video")}<div class="blk-vid ${v.vertical ? "vert" : ""}">${v.embed}</div>`;
    return `${head(b, "", "video")}<a class="blk-vlink" href="${esc(v.page || v.url || "#")}" target="_blank" rel="noopener">${v.poster ? `<img src="${esc(v.poster)}" alt="" loading="lazy">` : ""}<span>${L360.icon("play")} ${esc(b.caption || v.title || "Xem video")}</span></a>`;
  };

  const VISUAL = ["image", "gallery", "map", "video"];
  const blocks = {
    kinds: [
      ["text", "Đoạn văn"],
      ["list", "Gạch đầu dòng"],
      ["image", "Ảnh"],
      ["gallery", "Bộ ảnh"],
      ["timeline", "Dòng thời gian"],
      ["mindmap", "Sơ đồ tư duy"],
      ["compare", "Bảng so sánh"],
      ["flow", "Quy trình / diễn biến"],
      ["cycle", "Vòng tuần hoàn"],
      ["venn", "Giống – khác (hai vòng)"],
      ["pyramid", "Tháp phân tầng"],
      ["stats", "Số liệu nổi bật"],
      ["quote", "Tư liệu / trích dẫn"],
      ["map", "Bản đồ có ghim"],
      ["keyterms", "Thuật ngữ"],
      ["question", "Câu hỏi thảo luận"],
      ["conclusion", "Kết luận"],
      ["note", "Ghi vào vở"],
      ["video", "Video"]
    ],
    one(b, o = {}) {
      const f = R[b && b.kind];
      if (!f) return "";
      try {
        return `<div class="blk blk-${b.kind}">${f(b, o)}</div>`;
      } catch (e) {
        return "";
      }
    },
    // Một trang bài giảng: tự chia cột khi có khối hình ảnh và khối chữ.
    page(pg, o = {}) {
      const bl = arr(pg && pg.blocks);
      const vis = bl.filter((b) => VISUAL.includes(b.kind));
      const rest = bl.filter((b) => !VISUAL.includes(b.kind));
      const layout = pg.layout || (vis.length && rest.length ? "split" : "stack");
      const titled = pg.title && !o.noTitle ? `<h2 class="pg-t">${rich(pg.title)}</h2>` : "";
      if (layout === "split")
        return `<div class="pg pg-split">${titled}<div class="pg-cols"><div class="pg-l">${vis.map((b) => blocks.one(b, o)).join("")}</div><div class="pg-r">${rest.map((b) => blocks.one(b, o)).join("")}</div></div></div>`;
      return `<div class="pg pg-stack">${titled}${bl.map((b) => blocks.one(b, o)).join("")}</div>`;
    },
    // Các nội dung cần ghi vở trong một trang.
    notes(pg) {
      return arr(pg && pg.blocks)
        .filter((b) => b.kind === "note" || b.kind === "conclusion")
        .map((b) => ({ kind: b.kind, title: b.title || (b.kind === "note" ? "Ghi vào vở" : "Kết luận"), text: b.text || "" }));
    },
    hasNote: (pg) => arr(pg && pg.blocks).some((b) => b.kind === "note"),
    // Văn bản thô cho PPT/in ấn.
    plain(b) {
      switch (b.kind) {
        case "text":
          return b.md || b.text || "";
        case "list":
          return arr(b.items).map((x) => "- " + (typeof x === "string" ? x : x.text)).join("\n");
        case "timeline":
          return arr(b.items).map((x) => `${x.time || x.year || ""}: ${x.label || ""}${x.desc ? " – " + x.desc : ""}`).join("\n");
        case "mindmap":
          return `${b.center || ""}\n` + arr(b.branches).map((x) => `- ${x.label}: ${arr(x.items).join("; ")}`).join("\n");
        case "compare":
          return [arr(b.columns).join(" | ")].concat(arr(b.rows).map((r) => arr(r).join(" | "))).join("\n");
        case "flow":
          return arr(b.steps).map((s, i) => `${i + 1}. ${s.label || s}`).join("\n");
        case "cycle":
          return arr(b.items).map((s, i) => `${i + 1}. ${s.label || s}`).join("\n");
        case "stats":
          return arr(b.items).map((s) => `${s.value} – ${s.label}`).join("\n");
        case "venn":
          return `${b.left || "A"}: ${arr(b.leftItems).join("; ")}\n${b.right || "B"}: ${arr(b.rightItems).join("; ")}\n${b.bothLabel || "Giống nhau"}: ${arr(b.both).join("; ")}`;
        case "pyramid":
          return arr(b.items).map((s, i) => `${i + 1}. ${s.label || s}${s.desc ? " – " + s.desc : ""}`).join("\n");
        case "keyterms":
          return arr(b.items).map((t) => `${t.term}: ${t.def}`).join("\n");
        case "map":
          return arr(b.pins).map((p, i) => `${i + 1}. ${p.label}`).join("\n");
        default:
          return b.text || b.caption || "";
      }
    }
  };
  L360.blocks = blocks;
})();
