/* Sinh tự động bởi tools/build.js – không sửa tay. */
var window = globalThis; var document = { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, createElement: () => ({ style: {} }) };
var location = { search: "", href: "" }; var localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; var sessionStorage = localStorage;
var requestAnimationFrame = (f) => setTimeout(f, 0); var setInterval = () => 0;
/* js/config.js */
/* Cấu hình Lesson 360° Studio.
   Muốn chạy trực tuyến (nhiều thiết bị): điền 5 giá trị Firebase bên dưới (xem docs/TRIEN-KHAI.md).
   Để trống thì web tự chạy chế độ Diễn tập (1 máy, nhiều tab, không cần Internet). */
window.L360_CONFIG = {
  appName: "Lesson 360° Studio",
  tagline: "Xưởng AI kiến tạo bài học số từ giáo án",
  school: "Trường TH, THCS & THPT FPT Bắc Giang",
  unit: "Tổ Khoa học xã hội",
  author: "Nguyễn Hữu Hiệu",

  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    appId: ""
  },
  dbRoot: "l360",

  heritageLensUrl: "https://hieunh39.github.io/Kinh-Bac-ky-su/",
  defaultClassSize: 30,
  maxClassSize: 45,
  defaultGroupCount: 4
};

/* js/core/util.js */
/* Tiện ích dùng chung – không phụ thuộc thư viện ngoài. */
(function () {
  const L360 = (window.L360 = window.L360 || {});
  const u = {};

  u.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Văn bản nhiều dòng: thoát kí tự rồi đổi xuống dòng thành <br>; hỗ trợ **đậm**.
  u.rich = (s) => u.esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  u.$ = (sel, root) => (root || document).querySelector(sel);
  u.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  u.html = (str) => {
    const t = document.createElement("template");
    t.innerHTML = str.trim();
    return t.content.firstElementChild;
  };
  u.qs = (k) => new URLSearchParams(location.search).get(k);
  u.uid = (n = 12) => {
    const a = "abcdefghijkmnpqrstuvwxyz23456789";
    let s = "";
    const r = crypto.getRandomValues(new Uint8Array(n));
    for (let i = 0; i < n; i++) s += a[r[i] % a.length];
    return s;
  };
  u.roomCode = () => {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    const r = crypto.getRandomValues(new Uint8Array(5));
    for (let i = 0; i < 5; i++) s += a[r[i] % a.length];
    return s;
  };
  u.clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  u.hash = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };
  // Xáo trộn có hạt giống: cùng hạt giống -> cùng thứ tự (mọi máy thấy giống nhau, đáp án không lộ theo vị trí gốc).
  u.shuffle = (arr, seed) => {
    const a = arr.slice();
    let s = u.hash(String(seed)) || 1;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  u.words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;
  u.pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  u.letter = (i) => "ABCDEFGHIJKLMNOP"[i] || String(i + 1);
  u.pad = (n, w = 2) => String(n).padStart(w, "0");
  u.fmtSec = (sec) => {
    sec = Math.max(0, Math.round(sec));
    return `${Math.floor(sec / 60)}:${u.pad(sec % 60)}`;
  };
  u.fmtDate = (ms) => {
    if (!ms) return "";
    const d = new Date(ms);
    return `${u.pad(d.getDate())}/${u.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  u.fmtDateTime = (ms) => {
    if (!ms) return "";
    const d = new Date(ms);
    return `${u.pad(d.getHours())}:${u.pad(d.getMinutes())} ${u.fmtDate(ms)}`;
  };
  u.isoDay = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${u.pad(d.getMonth() + 1)}-${u.pad(d.getDate())}`;
  };
  u.slug = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  u.get = (obj, path) => {
    if (!path) return obj;
    const parts = String(path).split("/").filter(Boolean);
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  };
  u.vals = (o) => (o && typeof o === "object" ? Object.values(o) : []);
  u.entries = (o) => (o && typeof o === "object" ? Object.entries(o) : []);
  u.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  u.throttleRaf = (fn) => {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn();
      });
    };
  };
  u.csv = (rows) =>
    "﻿" +
    rows
      .map((r) =>
        r
          .map((c) => {
            const s = c == null ? "" : String(c);
            return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\r\n");
  u.download = (name, text, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };
  u.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_) {}
      ta.remove();
      return ok;
    }
  };
  u.toast = (msg, type = "", ms = 2600) => {
    let box = document.getElementById("toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "toast";
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), ms);
  };
  u.modal = (innerHtml, { onClose } = {}) => {
    const bg = u.html(`<div class="modal-bg"><div class="modal">${innerHtml}</div></div>`);
    const close = () => {
      bg.remove();
      onClose && onClose();
    };
    bg.addEventListener("click", (e) => {
      if (e.target === bg) close();
    });
    u.$$("[data-close]", bg).forEach((b) => b.addEventListener("click", close));
    document.body.appendChild(bg);
    return { el: bg.firstElementChild, close };
  };
  u.confirm = (msg, okLabel = "Đồng ý") =>
    new Promise((resolve) => {
      const m = u.modal(
        `<p style="font-size:1.05rem">${u.rich(msg)}</p><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-close>Huỷ</button><button class="btn primary" data-ok>${u.esc(okLabel)}</button></div>`,
        { onClose: () => resolve(false) }
      );
      m.el.querySelector("[data-ok]").onclick = () => {
        m.el.parentElement.remove();
        resolve(true);
      };
    });
  u.qr = (text, cell = 6) => {
    if (!window.qrcode) return "";
    const q = window.qrcode(0, "M");
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
  };
  u.groupColor = (i) => `var(--g${(i % 6) + 1})`;
  u.median = (arr) => {
    const a = arr.filter((x) => typeof x === "number").sort((x, y) => x - y);
    if (!a.length) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  u.avg = (arr) => {
    const a = arr.filter((x) => typeof x === "number" && !isNaN(x));
    return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  };
  u.round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

  // Đếm từ phổ biến cho "đám mây từ" (bỏ hư từ tiếng Việt thường gặp).
  const STOP = new Set(
    "và là của có những các một cho được trong với đã không người này đó thì mà để từ ra vào khi như về nên cũng rất lại hơn đến theo nhiều nhưng sẽ bị do vì nơi còn hay hoặc tôi em mình chúng ta họ nó ở trên dưới".split(" ")
  );
  u.topWords = (texts, n = 24) => {
    const cnt = {};
    texts.forEach((t) => {
      const seen = new Set();
      String(t || "")
        .toLowerCase()
        .replace(/[.,;:!?()"“”'‘’…\-–—/\\[\]{}]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w))
        .forEach((w) => {
          if (!seen.has(w)) {
            cnt[w] = (cnt[w] || 0) + 1;
            seen.add(w);
          }
        });
    });
    return Object.entries(cnt)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  };

  L360.u = u;
  L360.cfg = window.L360_CONFIG || {};
})();

/* js/core/pack.js */
/* Gói bài học (lesson pack) – định dạng chung giữa trợ lý AI, Studio và lớp học.
   Mỗi bước (step) có một "type" lấy từ thư viện mẫu hoạt động (L360.types). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  L360.types = {};
  L360.typeOrder = [];
  L360.registerType = (def) => {
    L360.types[def.type] = def;
    if (!L360.typeOrder.includes(def.type)) L360.typeOrder.push(def.type);
  };
  L360.packs = L360.packs || []; // gói mẫu đăng kí từ thư mục packs/

  const DEFAULT_GROUP_NAMES = ["Nhóm 1", "Nhóm 2", "Nhóm 3", "Nhóm 4", "Nhóm 5", "Nhóm 6"];
  const GROUP_COLORS = ["#2A62B0", "#C98A12", "#3E7A3B", "#B4552D", "#1F8A8A", "#8A5A2B"];

  // Khoá bài nộp cho từng lượt (câu quiz, vòng 2, nhóm triển lãm...).
  L360.subKey = (step, state) => {
    const t = L360.types[step.type];
    return t && t.subKey ? t.subKey(step, state || {}) : step.id;
  };

  const Pack = {
    SCHEMA: "l360-pack/1",
    normalize(raw) {
      const p = u.clone(raw) || {};
      p.schema = Pack.SCHEMA;
      p.title = String(p.title || "Bài học chưa đặt tên").trim();
      p.subject = p.subject || "";
      p.grade = p.grade != null ? String(p.grade) : "";
      p.id = p.id || u.slug(`${p.subject}-${p.grade}-${p.title}`) || "bai-" + u.uid(6);
      p.duration = Number(p.duration) || 45;
      p.objectives = Array.isArray(p.objectives) ? p.objectives : p.objectives ? [String(p.objectives)] : [];
      p.theme = Object.assign({ accent: "", bg: "", font: "" }, p.theme || {});
      if (!Array.isArray(p.groups) || !p.groups.length) p.groups = null;
      const seen = new Set();
      p.steps = (Array.isArray(p.steps) ? p.steps : []).map((s, i) => {
        s = Object.assign({}, s);
        let id = String(s.id || `s${i + 1}`).replace(/[^A-Za-z0-9-]/g, "");
        if (!id || seen.has(id)) id = `s${i + 1}x${u.uid(3)}`;
        seen.add(id);
        s.id = id;
        s.type = s.type || "slide";
        s.title = String(s.title || `Hoạt động ${i + 1}`);
        s.minutes = Number(s.minutes) || 0;
        const t = L360.types[s.type];
        if (t && t.normalize) t.normalize(s);
        return s;
      });
      p.meta = Object.assign({}, p.meta || {});
      return p;
    },
    validate(raw) {
      const errors = [];
      const warnings = [];
      if (!raw || typeof raw !== "object") return { errors: ["Không đọc được nội dung gói bài học."], warnings };
      if (!raw.title) errors.push("Thiếu tên bài học (title).");
      if (!Array.isArray(raw.steps) || !raw.steps.length) errors.push("Gói bài học chưa có hoạt động nào (steps).");
      const p = Pack.normalize(raw);
      let total = 0;
      p.steps.forEach((s, i) => {
        const t = L360.types[s.type];
        const where = `Bước ${i + 1} (${s.title})`;
        if (!t) {
          errors.push(`${where}: loại hoạt động "${s.type}" không có trong thư viện.`);
          return;
        }
        total += s.minutes || 0;
        if (t.validate) t.validate(s, (m) => errors.push(`${where}: ${m}`), (m) => warnings.push(`${where}: ${m}`), p);
      });
      if (total && total > p.duration + 2) warnings.push(`Tổng thời lượng các bước là ${total} phút, vượt ${p.duration} phút của tiết học.`);
      if (p.steps.filter((s) => s.type === "groupwork").length > 1)
        warnings.push("Có hơn 1 nhiệm vụ nhóm trong bài – nên giữ tối đa 1 nhiệm vụ nhóm mỗi tiết.");
      return { errors, warnings, pack: p, totalMinutes: total };
    },
    // Đọc chuỗi JSON (chấp nhận cả khối ```json ... ``` do trợ lý AI trả về).
    parse(text) {
      let s = String(text || "").trim();
      const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence) s = fence[1].trim();
      const a = s.indexOf("{");
      const b = s.lastIndexOf("}");
      if (a > 0 || (b >= 0 && b < s.length - 1)) s = s.slice(a, b + 1);
      return JSON.parse(s);
    },
    groups(pack, count) {
      const n = Math.max(2, Math.min(6, Number(count) || L360.cfg.defaultGroupCount || 4));
      const src = (pack && pack.groups) || [];
      const out = [];
      for (let i = 0; i < n; i++) {
        const g = src[i] || {};
        out.push({ id: "g" + (i + 1), name: g.name || DEFAULT_GROUP_NAMES[i], color: g.color || GROUP_COLORS[i] });
      }
      return out;
    },
    // Phần công khai: mọi học sinh thấy được, không chứa đáp án.
    publicMeta(p) {
      return {
        title: p.title,
        subject: p.subject,
        grade: p.grade,
        lessonRef: p.lessonRef || "",
        theme: p.theme,
        steps: p.steps.map((s) => {
          const t = L360.types[s.type] || {};
          return {
            id: s.id,
            type: s.type,
            title: s.title,
            minutes: s.minutes || 0,
            instructions: s.instructions || "",
            count: t.count ? t.count(s) : 1,
            noSubmit: !!t.noSubmit,
            groupMode: !!t.groupMode
          };
        })
      };
    },
    publicItem(step, state) {
      const t = L360.types[step.type];
      return t && t.publicPayload ? t.publicPayload(step, state || {}) : {};
    },
    answerItem(step, state) {
      const t = L360.types[step.type];
      return t && t.answerPayload ? t.answerPayload(step, state || {}) : null;
    },
    // Thống kê ngắn cho phần mô tả gói bài học.
    summary(p) {
      const byType = {};
      p.steps.forEach((s) => (byType[s.type] = (byType[s.type] || 0) + 1));
      return {
        steps: p.steps.length,
        minutes: p.steps.reduce((a, s) => a + (s.minutes || 0), 0),
        types: Object.keys(byType).map((k) => `${(L360.types[k] || {}).label || k} × ${byType[k]}`)
      };
    }
  };
  L360.Pack = Pack;

  /* Thư viện gói bài học trên máy này (localStorage) + gói mẫu. */
  const LIB_KEY = "l360:library";
  L360.Library = {
    list() {
      let mine = [];
      try {
        mine = JSON.parse(localStorage.getItem(LIB_KEY) || "[]");
      } catch (e) {}
      return mine;
    },
    samples() {
      return (L360.packs || []).map((p) => Pack.normalize(p));
    },
    all() {
      const mine = L360.Library.list();
      const ids = new Set(mine.map((p) => p.id));
      return mine.concat(L360.Library.samples().filter((p) => !ids.has(p.id)).map((p) => Object.assign(p, { _sample: true })));
    },
    get(id) {
      return L360.Library.all().find((p) => p.id === id) || null;
    },
    save(pack) {
      const p = Pack.normalize(pack);
      delete p._sample;
      p.meta.updatedAt = Date.now();
      const list = L360.Library.list().filter((x) => x.id !== p.id);
      list.unshift(p);
      localStorage.setItem(LIB_KEY, JSON.stringify(list));
      return p;
    },
    remove(id) {
      localStorage.setItem(LIB_KEY, JSON.stringify(L360.Library.list().filter((x) => x.id !== id)));
    }
  };
})();

/* js/core/ui.js */
/* Mảnh giao diện dùng chung cho các mẫu hoạt động (học sinh, màn chiếu, giáo viên). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = {};

  ui.bars = (items, { total, showPct = true } = {}) => {
    const max = total || Math.max(1, ...items.map((i) => i.value || 0));
    return `<div class="bars">${items
      .map((i) => {
        const w = max ? Math.round(((i.value || 0) / max) * 100) : 0;
        const v = showPct && total ? `${i.value || 0} · ${u.pct(i.value || 0, total)}%` : `${i.value || 0}`;
        return `<div class="bar ${i.correct ? "correct" : ""} ${i.dim ? "dim" : ""}">
          <div class="bar-label"><span>${i.correct ? "✓ " : ""}${i.label}</span><span class="v">${v}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${w}%;${i.color ? `background:${i.color}` : ""}"></div></div></div>`;
      })
      .join("")}</div>`;
  };
  // Hai vòng cạnh nhau (học từ bạn).
  ui.pairBars = (labels, r1, r2, total1, total2, correctIdx) =>
    `<div class="bars">${labels
      .map((lb, i) => {
        const a = r1[i] || 0;
        const b = r2[i] || 0;
        const ok = correctIdx === i;
        return `<div class="bar bar-pair ${ok ? "correct" : ""} ${correctIdx != null && !ok ? "dim" : ""}">
        <div class="bar-label"><span>${ok ? "✓ " : ""}${lb}</span><span class="v">V1 ${u.pct(a, total1)}% · V2 ${u.pct(b, total2)}%</span></div>
        <div class="bar-track" style="height:11px"><div class="bar-fill r1" style="width:${u.pct(a, total1)}%"></div></div>
        <div class="bar-track" style="height:11px"><div class="bar-fill r2" style="width:${u.pct(b, total2)}%"></div></div></div>`;
      })
      .join("")}</div>`;

  ui.options = (options, { selected, answer, disabled, multi, name = "opt", mine } = {}) =>
    `<div class="opts">${options
      .map((o, i) => {
        const sel = multi ? (selected || []).includes(i) : selected === i;
        let cls = sel ? "sel" : "";
        if (answer != null) {
          if (i === answer) cls = "right";
          else if (sel || mine === i) cls = "wrong";
        }
        return `<button class="opt ${cls}" data-${name}="${i}" ${disabled ? "disabled" : ""}><span class="k">${u.letter(i)}</span><span>${u.rich(o)}</span></button>`;
      })
      .join("")}</div>`;

  ui.media = (m, { big } = {}) => {
    if (!m) return "";
    let out = "";
    if (m.image)
      out += `<figure style="margin:0 0 12px"><img src="${u.esc(m.image)}" alt="${u.esc(m.caption || "")}" loading="lazy" style="width:100%;max-height:${big ? "52vh" : "320px"};object-fit:contain;border-radius:12px;background:#EFE7D8">${
        m.caption || m.credit
          ? `<figcaption class="tiny muted" style="margin-top:4px">${u.esc(m.caption || "")}${m.credit ? ` <i>Nguồn: ${u.esc(m.credit)}</i>` : ""}</figcaption>`
          : ""
      }</figure>`;
    if (m.video) out += `<p><a class="btn sm" href="${u.esc(m.video)}" target="_blank" rel="noopener">▶ Xem video</a> <span class="small muted">${u.esc(m.videoTitle || "")}</span></p>`;
    if (m.link) out += `<p><a class="btn sm" href="${u.esc(m.link)}" target="_blank" rel="noopener">↗ ${u.esc(m.linkTitle || "Mở tư liệu")}</a></p>`;
    return out;
  };

  ui.wait = (title, sub) =>
    `<div class="card center" style="padding:36px 20px"><div style="font-size:2.4rem;line-height:1">⏳</div><h2 style="margin-top:10px">${u.esc(title)}</h2>${sub ? `<p class="muted">${u.esc(sub)}</p>` : ""}</div>`;
  ui.done = (title, sub) =>
    `<div class="card center" style="padding:30px 20px;border-color:var(--ok)"><div style="font-size:2.2rem;line-height:1;color:var(--ok)">✓</div><h2 style="margin-top:8px;color:var(--ok)">${u.esc(
      title || "Đã nộp"
    )}</h2><p class="muted">${u.esc(sub || "Chờ giáo viên mở câu tiếp theo.")}</p></div>`;

  ui.gbadge = (g) => (g ? `<span class="gbadge" style="background:${g.color}">${u.esc(g.name)}</span>` : "");

  ui.cloud = (texts, n = 24) => {
    const top = u.topWords(texts, n);
    if (!top.length) return `<p class="muted">Chưa có câu trả lời.</p>`;
    const max = top[0][1];
    return `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;justify-content:center;padding:8px">${top
      .map(
        ([w, c], i) =>
          `<span style="font-size:${(0.95 + (c / max) * 1.6).toFixed(2)}rem;font-weight:${c === max ? 800 : 650};color:${
            i % 3 === 0 ? "var(--accent)" : i % 3 === 1 ? "var(--ink)" : "var(--ink-2)"
          }">${u.esc(w)}</span>`
      )
      .join("")}</div>`;
  };

  ui.textarea = (id, { value = "", max = 40, placeholder = "", rows = 4 } = {}) =>
    `<textarea id="${id}" rows="${rows}" placeholder="${u.esc(placeholder)}" data-maxwords="${max}">${u.esc(value)}</textarea>
     <div class="small muted right" data-wc-for="${id}">0/${max} từ</div>`;
  ui.bindWordCount = (root) => {
    u.$$("textarea[data-maxwords]", root).forEach((ta) => {
      const max = Number(ta.dataset.maxwords);
      const lab = root.querySelector(`[data-wc-for="${ta.id}"]`);
      const upd = () => {
        const n = u.words(ta.value);
        if (lab) {
          lab.textContent = `${n}/${max} từ`;
          lab.style.color = n > max ? "var(--bad)" : "";
        }
      };
      ta.addEventListener("input", upd);
      upd();
    });
  };

  // Đồng hồ: mọi phần tử [data-timer] tự cập nhật theo trạng thái hiện tại.
  ui.timerState = null;
  ui.timer = () => `<span class="timer" data-timer>–:–</span>`;
  setInterval(() => {
    const st = ui.timerState;
    const els = document.querySelectorAll("[data-timer]");
    if (!els.length) return;
    const rem = L360.Room ? L360.Room.remaining(st) : null;
    els.forEach((el) => {
      if (rem == null) {
        el.textContent = st && st.phase === "open" ? "∞" : "–:–";
        el.classList.remove("low");
      } else {
        el.textContent = u.fmtSec(rem);
        el.classList.toggle("low", rem <= 10);
      }
    });
    document.querySelectorAll("[data-clock]").forEach((el) => {
      const s0 = st && st.startedAt;
      el.textContent = s0 ? u.fmtSec((L360.store.now() - s0) / 1000) : "0:00";
    });
  }, 250);

  ui.phaseLabel = (st, step) => {
    if (!step) return "";
    if (step.noSubmit) return "Trình chiếu";
    return { observe: "Quan sát", open: "Đang nhận bài", locked: "Đã khoá", revealed: "Đã công bố" }[st.phase] || "";
  };

  L360.ui = ui;
})();

/* js/core/room.js */
/* Phòng học: tạo phòng, điều khiển tiến trình (giáo viên), tham gia và nộp bài (học sinh),
   thống kê – minh chứng – tổng kết phiên dạy cho bảng dữ liệu INSIGHT. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = () => L360.store;
  const Pack = L360.Pack;
  const R = (room, sub) => `rooms/${room}` + (sub ? "/" + sub : "");

  const Room = {
    R,
    async exists(room) {
      return !!(await S().get(R(room, "meta")));
    },
    async create({ pack, room, className, classSize, groupCount, teacher }) {
      const p = Pack.normalize(pack);
      const groups = Pack.groups(p, groupCount);
      const meta = {
        title: p.title,
        subject: p.subject || "",
        grade: p.grade || "",
        lessonRef: p.lessonRef || "",
        className: className || "",
        classSize: Math.max(1, Math.min(L360.cfg.maxClassSize || 45, Number(classSize) || L360.cfg.defaultClassSize || 30)),
        groups,
        teacherUid: teacher.uid,
        teacherName: teacher.name || teacher.email || "",
        packId: p.id,
        createdAt: S().TS,
        status: "open",
        mode: S().mode
      };
      await S().set(R(room, "meta"), meta);
      await S().set(`priv/${room}`, { pack: p });
      await S().set(R(room, "pub"), { meta: Pack.publicMeta(p) });
      await S().set(R(room, "state"), { step: -1, phase: "observe", q: 0, round: 1, screen: "content", v: 1 });
      return { pack: p, meta };
    },
    async wipe(room) {
      await S().remove(`priv/${room}`);
      await S().remove(R(room));
    },
    codes(classSize) {
      const n = Number(classSize) || 30;
      return Array.from({ length: n }, (_, i) => "S" + u.pad(i + 1));
    },
    online(room, code) {
      const p = room && room.presence && room.presence[code];
      if (!p) return false;
      if (L360.isLocal) return Date.now() - (p.t || 0) < 20000;
      return true;
    },
    joined(room) {
      return u.entries(room && room.roster).filter(([, r]) => r && r.uid);
    },
    remaining(state) {
      if (!state || state.phase !== "open" || !state.dur || !state.openedAt) return null;
      return state.dur - (S().now() - state.openedAt) / 1000;
    }
  };

  /* ---------- Bộ điều khiển của giáo viên ---------- */
  class Host {
    constructor(room, pack, onChange) {
      this.room = room;
      this.pack = Pack.normalize(pack);
      this.data = {};
      this.onChange = onChange;
      this.unsub = S().on(R(room), (v) => {
        this.data = v || {};
        this.onChange && this.onChange(this.data);
      });
      this.tickH = setInterval(() => this.tick(), 500);
    }
    destroy() {
      this.unsub && this.unsub();
      clearInterval(this.tickH);
    }
    get state() {
      return this.data.state || { step: -1, phase: "observe" };
    }
    get meta() {
      return this.data.meta || {};
    }
    get step() {
      return this.pack.steps[this.state.step] || null;
    }
    get type() {
      return this.step ? L360.types[this.step.type] : null;
    }
    key(st) {
      return this.step ? L360.subKey(this.step, st || this.state) : null;
    }
    subsFor(key) {
      return (this.data.subs && this.data.subs[key]) || {};
    }
    gsubsFor(key) {
      return (this.data.gsubs && this.data.gsubs[key]) || {};
    }
    async patchState(obj) {
      const v = (this.state.v || 0) + 1;
      await S().update(R(this.room, "state"), Object.assign({ v }, obj));
    }
    async release(st) {
      const step = this.step;
      if (!step) return;
      const key = L360.subKey(step, st);
      await S().set(R(this.room, `pub/items/${key}`), Pack.publicItem(step, st));
    }
    async goto(i) {
      const n = this.pack.steps.length;
      i = Math.max(-1, Math.min(n, i));
      const st = { step: i, phase: "observe", q: 0, round: 1, screen: "content", openedAt: null, dur: 0 };
      if (i >= 0 && !this.state.startedAt) st.startedAt = S().TS;
      await this.patchState(st);
      const step = this.pack.steps[i];
      if (step) {
        const t = L360.types[step.type] || {};
        if (t.releaseOnEnter) await S().set(R(this.room, `pub/items/${L360.subKey(step, st)}`), Pack.publicItem(step, st));
        if (t.onEnter) await t.onEnter(this, step);
      }
    }
    next() {
      return this.goto(this.state.step + 1);
    }
    prev() {
      return this.goto(this.state.step - 1);
    }
    defaultDur() {
      const s = this.step;
      if (!s) return 0;
      const t = this.type || {};
      if (t.timerFor) return t.timerFor(s, this.state) || 0;
      return Number(s.timer) || 0;
    }
    async open(dur) {
      const st = Object.assign({}, this.state);
      await this.release(st);
      await this.patchState({ phase: "open", openedAt: S().TS, dur: dur == null ? this.defaultDur() : dur });
    }
    lock() {
      return this.patchState({ phase: "locked" });
    }
    reopen() {
      return this.patchState({ phase: "open", openedAt: S().TS, dur: this.defaultDur() });
    }
    async reveal() {
      const step = this.step;
      if (!step) return;
      const ans = Pack.answerItem(step, this.state);
      if (ans != null) await S().set(R(this.room, `pub/answers/${this.key()}`), ans);
      // Với hoạt động hai vòng: công bố cho cả vòng 1.
      if (step.type === "poll2" && ans != null) await S().set(R(this.room, `pub/answers/${L360.subKey(step, { round: 1 })}`), ans);
      await this.patchState({ phase: "revealed", screen: "content" });
    }
    async round2() {
      const st = Object.assign({}, this.state, { round: 2 });
      await this.release(st);
      const t = this.type;
      await this.patchState({ round: 2, phase: "open", openedAt: S().TS, dur: t && t.timerFor ? t.timerFor(this.step, st) : 45 });
    }
    async setQ(q, autoOpen) {
      const st = Object.assign({}, this.state, { q });
      const patch = { q, phase: "observe", openedAt: null, dur: 0, screen: "content" };
      if (autoOpen) {
        await S().set(R(this.room, `pub/items/${L360.subKey(this.step, st)}`), Pack.publicItem(this.step, st));
        const t = this.type;
        Object.assign(patch, { phase: "open", openedAt: S().TS, dur: t && t.timerFor ? t.timerFor(this.step, st) : 0 });
      }
      await this.patchState(patch);
    }
    addTime(sec) {
      const st = this.state;
      if (st.phase !== "open") return;
      const rem = Room.remaining(st);
      if (rem == null) return this.patchState({ openedAt: S().TS, dur: sec });
      return this.patchState({ dur: (st.dur || 0) + sec });
    }
    setScreen(mode) {
      return this.patchState({ screen: mode });
    }
    async feature(key, code, text) {
      const path = R(this.room, `pub/featured/${key}/${code}`);
      const cur = u.get(this.data, `pub/featured/${key}/${code}`);
      await S().set(path, cur ? null : String(text || "").slice(0, 400) || "★");
    }
    award(stepId, g) {
      return S().set(R(this.room, `pub/awards/${stepId}`), g);
    }
    releaseCode(code) {
      return S().update(R(this.room), { [`roster/${code}/uid`]: null, [`presence/${code}`]: null });
    }
    moveGroup(code, g) {
      return S().set(R(this.room, `roster/${code}/group`), g);
    }
    setSecretary(stepId, g, code) {
      return S().set(R(this.room, `gwork/${stepId}/${g}/sec`), code);
    }
    // Học sinh có mặt (đã vào lớp).
    joinedCodes() {
      return Room.joined(this.data).map(([c]) => c);
    }
    tick() {
      const st = this.state;
      if (st.phase !== "open" || !this.step) return;
      const rem = Room.remaining(st);
      if (rem != null && rem <= 0) {
        this.lock();
        return;
      }
      const t = this.type || {};
      if (t.autoLockWhenAll) {
        const subs = this.subsFor(this.key());
        const present = this.joinedCodes().filter((c) => Room.online(this.data, c));
        if (present.length && present.every((c) => subs[c])) this.lock();
      }
    }
    /* ---------- Thống kê và minh chứng ---------- */
    stats() {
      return Stats.forRoom(this.pack, this.data);
    }
    async end(feedback) {
      const summary = Stats.summary(this.pack, this.data, this.room, feedback);
      await S().set(`sessions/${summary.sid}`, summary);
      await S().update(R(this.room), { "meta/status": "ended", "meta/sid": summary.sid });
      await this.goto(this.pack.steps.length);
      return summary;
    }
  }
  Room.Host = Host;

  /* ---------- Học sinh ---------- */
  const Student = {
    saved(room) {
      try {
        return JSON.parse(localStorage.getItem("l360:join:" + room) || "null");
      } catch (e) {
        return null;
      }
    },
    async join(room, code, name, group) {
      const user = await S().auth.signInStudent();
      const meta = await S().get(R(room, "meta"));
      if (!meta) throw new Error("Không tìm thấy phòng " + room + ". Kiểm tra lại mã phòng trên màn chiếu.");
      if (meta.status === "ended") throw new Error("Tiết học trong phòng này đã kết thúc.");
      const cur = await S().get(R(room, `roster/${code}`));
      if (cur && cur.uid && cur.uid !== user.uid) {
        if (!L360.isLocal) throw new Error(`Mã ${code} đã có người dùng. Nếu đó là mã của em, nhờ giáo viên bấm "Giải phóng mã" rồi vào lại.`);
        const pres = await S().get(R(room, `presence/${code}`));
        if (pres && Date.now() - (pres.t || 0) < 20000) throw new Error(`Mã ${code} đang được dùng trên thiết bị khác. Hãy báo giáo viên.`);
      }
      const grp = cur && cur.group && !group ? cur.group : group;
      // Ghi danh trước, rồi mới ghi ánh xạ uid → mã (luật bảo mật kiểm tra theo thứ tự này).
      await S().set(R(room, `roster/${code}`), {
        uid: user.uid,
        name: String(name || (cur && cur.name) || "").slice(0, 20),
        group: grp || "",
        t: S().TS
      });
      await S().set(R(room, `uids/${user.uid}`), code);
      localStorage.setItem("l360:join:" + room, JSON.stringify({ code, name, group: grp }));
      return { meta, code, uid: user.uid };
    },
    submit(room, key, code, value) {
      return S().set(R(room, `subs/${key}/${code}`), { v: value, t: S().TS });
    },
    gsubmit(room, key, g, code, value) {
      return S().set(R(room, `gsubs/${key}/${g}`), { v: value, by: code, t: S().TS });
    }
  };
  Room.Student = Student;

  /* ---------- Thống kê ---------- */
  const Stats = {
    // Danh sách các lượt nộp bài có thể thống kê của một gói bài học.
    keysOf(pack, data) {
      const out = [];
      pack.steps.forEach((s, i) => {
        const t = L360.types[s.type];
        if (!t || t.noSubmit) return;
        const ks = t.keys ? t.keys(s, data.meta || {}) : [{ key: s.id, label: s.title }];
        ks.forEach((k) => out.push(Object.assign({ step: s, index: i, type: t }, k)));
      });
      return out;
    },
    forRoom(pack, data) {
      const joined = Room.joined(data).map(([c]) => c);
      const rows = Stats.keysOf(pack, data).map((k) => {
        const group = k.type.groupMode;
        const subs = group ? (data.gsubs && data.gsubs[k.key]) || {} : (data.subs && data.subs[k.key]) || {};
        const n = Object.keys(subs).length;
        let right = 0;
        let gradable = 0;
        if (k.type.isCorrect) {
          for (const c in subs) {
            const ok = k.type.isCorrect(k.step, k.key, subs[c].v);
            if (ok === true || ok === false) {
              gradable++;
              if (ok) right++;
            }
          }
        }
        const opened = !!(data.pub && data.pub.items && data.pub.items[k.key]);
        const denom = group ? ((data.meta && data.meta.groups) || []).length : joined.length;
        return {
          key: k.key,
          label: k.label,
          stepTitle: k.step.title,
          stepIndex: k.index,
          type: k.step.type,
          opened,
          n,
          rate: opened && denom ? u.pct(n, denom) : null,
          correct: gradable ? u.pct(right, gradable) : null,
          group
        };
      });
      return { joined: joined.length, rows };
    },
    score(pack, data, code) {
      let pts = 0;
      Stats.keysOf(pack, data).forEach((k) => {
        if (!k.type.points) return;
        const ans = data.pub && data.pub.answers && data.pub.answers[k.key];
        const sub = data.subs && data.subs[k.key] && data.subs[k.key][code];
        if (ans != null && sub && k.type.isCorrect(k.step, k.key, sub.v)) pts += k.type.points(k.step);
      });
      return pts;
    },
    leaderboard(pack, data) {
      const roster = data.roster || {};
      const list = Object.keys(roster)
        .filter((c) => roster[c] && roster[c].uid !== undefined)
        .map((c) => ({ code: c, name: roster[c].name || "", group: roster[c].group || "", pts: Stats.score(pack, data, c) }))
        .sort((a, b) => b.pts - a.pts || a.code.localeCompare(b.code));
      const groups = ((data.meta && data.meta.groups) || []).map((g) => {
        const mem = list.filter((x) => x.group === g.id);
        return Object.assign({}, g, { n: mem.length, avg: mem.length ? Math.round(mem.reduce((a, x) => a + x.pts, 0) / mem.length) : 0 });
      });
      groups.sort((a, b) => b.avg - a.avg);
      return { list, groups };
    },
    summary(pack, data, room, feedback) {
      const st = Stats.forRoom(pack, data);
      const meta = data.meta || {};
      const opened = st.rows.filter((r) => r.opened && !r.group);
      const graded = opened.filter((r) => r.correct != null);
      const p2 = pack.steps
        .filter((s) => s.type === "poll2" && s.answer != null)
        .map((s) => {
          const r1 = st.rows.find((r) => r.key === L360.subKey(s, { round: 1 }));
          const r2 = st.rows.find((r) => r.key === L360.subKey(s, { round: 2 }));
          return { title: s.title, r1: r1 && r1.correct, r2: r2 && r2.correct };
        })
        .filter((x) => x.r1 != null && x.r2 != null);
      const self = { 1: 0, 2: 0, 3: 0 };
      pack.steps
        .filter((s) => s.type === "text" && s.selfAssess)
        .forEach((s) => {
          u.vals(data.subs && data.subs[s.id]).forEach((x) => {
            const lv = x && x.v && x.v.level;
            if (self[lv] != null) self[lv]++;
          });
        });
      const startedAt = (data.state && data.state.startedAt) || meta.createdAt || Date.now();
      const sid = `${u.isoDay(startedAt)}-${room}-${u.uid(4)}`;
      const lb = Stats.leaderboard(pack, data);
      return {
        sid,
        room,
        teacherUid: meta.teacherUid || "",
        teacherName: meta.teacherName || "",
        subject: pack.subject || meta.subject || "",
        grade: pack.grade || meta.grade || "",
        className: meta.className || "",
        title: pack.title,
        packId: pack.id,
        startedAt,
        endedAt: Date.now(),
        day: u.isoDay(startedAt),
        classSize: meta.classSize || null,
        joined: st.joined,
        steps: pack.steps.length,
        interactive: opened.length,
        participation: opened.length ? Math.round(u.avg(opened.map((r) => r.rate || 0))) : null,
        correctRate: graded.length ? Math.round(u.avg(graded.map((r) => r.correct))) : null,
        rows: st.rows.filter((r) => r.opened).map((r) => ({ label: r.label, step: r.stepTitle, type: r.type, n: r.n, rate: r.rate, correct: r.correct })),
        hard: graded
          .slice()
          .sort((a, b) => a.correct - b.correct)
          .slice(0, 3)
          .map((r) => ({ label: r.label, step: r.stepTitle, correct: r.correct })),
        peer: p2,
        selfAssess: self,
        quizAvg: lb.list.length ? Math.round(u.avg(lb.list.map((x) => x.pts))) : null,
        prepMinutes: (pack.meta && pack.meta.prepMinutes) || null,
        aiTool: (pack.meta && pack.meta.aiTool) || "",
        madeWithAI: !!(pack.meta && pack.meta.madeWithAI),
        feedback: feedback || null,
        mode: L360.store.mode
      };
    },
    // Tệp CSV minh chứng cá nhân.
    csvIndividual(pack, data) {
      const keys = Stats.keysOf(pack, data).filter((k) => !k.type.groupMode && data.pub && data.pub.items && data.pub.items[k.key]);
      const head = ["Mã HS", "Tên gọi", "Nhóm"];
      keys.forEach((k) => {
        head.push(`${k.label} – trả lời`);
        if (k.type.isCorrect) head.push(`${k.label} – đúng`);
      });
      head.push("Điểm quiz");
      const groups = Object.fromEntries(((data.meta && data.meta.groups) || []).map((g) => [g.id, g.name]));
      const rows = [head];
      Room.joined(data)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([code, r]) => {
          const row = [code, r.name || "", groups[r.group] || ""];
          keys.forEach((k) => {
            const sub = data.subs && data.subs[k.key] && data.subs[k.key][code];
            row.push(sub ? k.type.describe(k.step, k.key, sub.v) : "");
            if (k.type.isCorrect) {
              const ok = sub ? k.type.isCorrect(k.step, k.key, sub.v) : null;
              row.push(ok == null ? "" : ok ? 1 : 0);
            }
          });
          row.push(Stats.score(pack, data, code));
          rows.push(row);
        });
      return u.csv(rows);
    },
    csvGroups(pack, data) {
      const groups = (data.meta && data.meta.groups) || [];
      const keys = Stats.keysOf(pack, data).filter((k) => k.type.groupMode);
      const rows = [["Nhóm", "Hoạt động", "Nội dung nộp", "Người nộp"]];
      groups.forEach((g) => {
        keys.forEach((k) => {
          const s = data.gsubs && data.gsubs[k.key] && data.gsubs[k.key][g.id];
          rows.push([g.name, k.label, s ? k.type.describe(k.step, k.key, s.v) : "", s ? s.by : ""]);
        });
        // Điểm đánh giá đồng đẳng (triển lãm).
        pack.steps
          .filter((s) => s.type === "expo")
          .forEach((s) => {
            const key = L360.subKey(s, { q: groups.indexOf(g) });
            const subs = u.vals(data.subs && data.subs[key]);
            if (!subs.length) return;
            const crit = (s.criteria || []).map((c, i) => `${c}: ${u.round1(u.avg(subs.map((x) => x.v && x.v.scores && x.v.scores[i])))}`);
            rows.push([g.name, `${s.title} – đánh giá đồng đẳng (${subs.length} lượt)`, crit.join(" | "), ""]);
          });
      });
      return u.csv(rows);
    }
  };
  Room.Stats = Stats;
  L360.Room = Room;
})();

/* js/core/architect.js */
/* ENGINE – Lesson Architect: tạo lời nhắc (prompt) để trợ lý AI (Claude, ChatGPT, Gemini…) chuyển
   giáo án KHBD thành gói bài học Lesson 360°. Danh mục mẫu hoạt động được sinh tự động từ mã nguồn,
   nên lời nhắc luôn khớp với những gì nền tảng chạy được. */
(function () {
  const L360 = window.L360;

  const KIND_DESC = {
    text: "chuỗi",
    textarea: "chuỗi (có thể nhiều dòng)",
    number: "số",
    bool: "true/false",
    select: "một giá trị trong danh sách",
    options: "mảng chuỗi (các phương án)",
    list: "mảng chuỗi",
    pair: "mảng 2 số",
    questions: 'mảng {"q","options":[4 chuỗi],"answer": số thứ tự 0–3,"explain"}',
    pairs: 'mảng {"left","right"} – cặp ĐÚNG, hệ thống tự xáo cột phải',
    fieldsList: 'mảng {"key":"A","label","hint"}',
    json: "mảng đối tượng (xem ví dụ)",
    site: "mã di tích Heritage Lens"
  };

  function catalog(only) {
    return L360.typeOrder
      .filter((t) => !only || only.includes(t))
      .map((t) => {
        const T = L360.types[t];
        const fields = (T.fields || [])
          .filter((f) => !f.key.startsWith("media."))
          .map((f) => `    - ${f.key}: ${KIND_DESC[f.kind] || f.kind} – ${f.label}${f.hint ? ` (${f.hint})` : ""}`)
          .join("\n");
        const ex = Object.assign({ id: "vi-du" }, T.template());
        return `• type "${t}" – ${T.label}: ${T.desc}\n${fields}${t === "poll2" || t === "explore" ? '\n    - answer: số thứ tự phương án đúng (0 = A); poll2 có thể để null nếu là câu hỏi ý kiến' : ""}\n  Ví dụ: ${JSON.stringify(ex)}`;
      })
      .join("\n\n");
  }

  const SITES = () => (window.L360_HERITAGE || []).map((s) => `${s.id} (${s.name})`).join("; ");

  L360.Architect = {
    prompt(o = {}) {
      const want = [];
      if (o.group) want.push("có đúng 1 nhiệm vụ nhóm (groupwork) và ngay sau đó là triển lãm (expo)");
      if (o.quiz) want.push("có trò chơi trắc nghiệm nhanh (quiz) 4–6 câu ở phần luyện tập");
      if (o.peer) want.push("có ít nhất 1 hoạt động hai vòng học từ bạn (poll2) cho khái niệm dễ nhầm");
      if (o.explore) want.push(`có 1 hoạt động khám phá di sản (explore) với di tích ${o.site || "phù hợp nhất với bài"}`);
      return `Bạn là "Lesson Architect" – trợ lý thiết kế tiết học tương tác cho nền tảng Lesson 360° Studio (${L360.cfg.school}).

NHIỆM VỤ
Đọc giáo án (kế hoạch bài dạy – KHBD) tôi gửi kèm và chuyển thành MỘT gói bài học JSON định dạng "l360-pack/1". Gói này chạy trực tiếp trên lớp: giáo viên điều khiển từng bước, học sinh làm trên điện thoại/laptop, màn chiếu hiện kết quả cả lớp.

THÔNG TIN TIẾT HỌC
- Môn: ${o.subject || "(theo giáo án)"}; lớp: ${o.grade || "(theo giáo án)"}; thời lượng: ${o.duration || 45} phút; số nhóm: ${o.groups || 4}; sĩ số khoảng ${o.size || 30}.
${want.length ? "- Yêu cầu thêm: " + want.join("; ") + "." : ""}

QUY TẮC
1. Bám sát mục tiêu, nội dung, tiến trình của KHBD (khởi động – hình thành kiến thức – luyện tập – vận dụng). Không thêm kiến thức ngoài chương trình.
2. TUYỆT ĐỐI không bịa số liệu, năm tháng, tên riêng, trích dẫn. Chỉ dùng thông tin có trong giáo án/SGK. Chỗ nào chưa chắc, ghi "[GV kiểm tra]" ngay trong câu chữ.
3. 6–9 bước (steps); tổng "minutes" xấp xỉ thời lượng tiết. Tối đa 1 nhiệm vụ nhóm (groupwork).
4. Ưu tiên hoạt động mà MỌI học sinh đều trả lời (poll2, quiz, cards, match, order, text); hạn chế trình chiếu (slide) dài.
5. Trắc nghiệm: 4 phương án, 1 đáp án đúng, phương án nhiễu hợp lí, đáp án đúng rải đều A/B/C/D, mỗi câu có "explain" ngắn.
6. Bước cuối là phiếu thoát (type "text", selfAssess: true).
7. "script" = lời dẫn ngắn cho giáo viên (1–3 câu); "instructions" = nhiệm vụ cho học sinh (1 câu).
8. Tiếng Việt chuẩn, câu ngắn, phù hợp lứa tuổi; tên riêng nước ngoài phiên âm theo SGK.
9. Chỉ thêm ảnh ("media.image" hoặc "image") khi có đường dẫn ảnh giấy phép mở và ghi "credit"; không chắc thì bỏ trống.
10. Nội dung chính xác, khách quan, phù hợp chủ trương của Đảng, pháp luật Nhà nước Việt Nam và Chương trình GDPT 2018.
11. Không để lộ đáp án trong câu chữ: mục cần sắp xếp (order) không ghi năm hay số thứ tự; vế ghép (match) không lặp từ khoá của vế kia.

THƯ VIỆN MẪU HOẠT ĐỘNG (chỉ dùng các "type" dưới đây; mỗi bước luôn có: id, type, title, minutes, instructions, script)
${catalog()}

Mã di tích Heritage Lens (dùng cho type "explore"): ${SITES()}

ĐỊNH DẠNG TRẢ LỜI
- Trả về DUY NHẤT một khối \`\`\`json … \`\`\` hợp lệ: không chú thích, không dấu phẩy thừa, dùng dấu nháy kép.
- Cấu trúc gốc: {"schema":"l360-pack/1","title","subject","grade","lessonRef","duration","objectives":[…],"theme":{"accent":"#mã màu đậm"},"steps":[…]}
- Sau khối JSON, viết mục "Ghi chú cho giáo viên" (3–5 gạch đầu dòng): chỗ cần kiểm tra lại, gợi ý ảnh/tư liệu nên bổ sung.

GIÁO ÁN: (tôi đính kèm tệp KHBD hoặc dán nội dung ngay bên dưới)
`;
    },
    fixPrompt(errors, warnings) {
      return `Gói bài học JSON bạn vừa tạo chưa chạy được trên Lesson 360° Studio. Hãy sửa đúng các lỗi sau, giữ nguyên phần còn lại, và trả về lại TOÀN BỘ khối \`\`\`json\`\`\`:
${errors.map((e) => "- LỖI: " + e).join("\n")}${warnings && warnings.length ? "\n" + warnings.map((w) => "- Lưu ý: " + w).join("\n") : ""}`;
    },
    catalog
  };
})();

/* js/data/heritage-sites.js */
/* Danh sách di tích trong Heritage Lens – Kinh Bắc Ký Sự (ảnh chụp từ data/index.json, 31 di tích). */
window.L360_HERITAGE = [
{
"id": "chua-tieu",
"name": "Chùa Tiêu",
"route": "Đất nhà Lý",
"type": "chua"
},
{
"id": "den-do",
"name": "Đền Đô",
"route": "Đất nhà Lý",
"type": "den"
},
{
"id": "dinh-bang",
"name": "Đình Đình Bảng",
"route": "Đất nhà Lý",
"type": "dinh"
},
{
"id": "dong-ky",
"name": "Đình, chùa Đồng Kỵ và Hội rước pháo",
"route": "Đất nhà Lý",
"type": "dinh"
},
{
"id": "nguyen-van-cu",
"name": "Khu lưu niệm Tổng Bí thư Nguyễn Văn Cừ",
"route": "Đất nhà Lý",
"type": "cach-mang"
},
{
"id": "phat-tich",
"name": "Chùa Phật Tích",
"route": "Đất nhà Lý",
"type": "chua"
},
{
"id": "but-thap",
"name": "Chùa Bút Tháp",
"route": "Cội nguồn Luy Lâu",
"type": "chua"
},
{
"id": "chua-dau",
"name": "Chùa Dâu",
"route": "Cội nguồn Luy Lâu",
"type": "chua"
},
{
"id": "dong-ho",
"name": "Làng tranh dân gian Đông Hồ",
"route": "Cội nguồn Luy Lâu",
"type": "lang-nghe"
},
{
"id": "kinh-duong-vuong",
"name": "Lăng và đền thờ Kinh Dương Vương",
"route": "Cội nguồn Luy Lâu",
"type": "den"
},
{
"id": "luy-lau",
"name": "Thành cổ Luy Lâu",
"route": "Cội nguồn Luy Lâu",
"type": "thanh-co"
},
{
"id": "ba-chua-kho",
"name": "Đền Bà Chúa Kho",
"route": "Quan họ và khoa bảng",
"type": "den"
},
{
"id": "hoi-lim",
"name": "Đồi Lim: lăng Hồng Vân, chùa Hồng Ân và Hội Lim",
"route": "Quan họ và khoa bảng",
"type": "le-hoi"
},
{
"id": "lang-diem",
"name": "Làng Diềm – đền Vua Bà, Thủy tổ Quan họ",
"route": "Quan họ và khoa bảng",
"type": "lang"
},
{
"id": "thanh-bac-ninh",
"name": "Thành cổ Bắc Ninh",
"route": "Quan họ và khoa bảng",
"type": "thanh-co"
},
{
"id": "van-mieu-bac-ninh",
"name": "Văn Miếu Bắc Ninh",
"route": "Quan họ và khoa bảng",
"type": "van-mieu"
},
{
"id": "atk2-hiep-hoa",
"name": "An toàn khu II (ATK II) Hiệp Hòa",
"route": "Bờ bắc sông Cầu",
"type": "cach-mang"
},
{
"id": "bo-da",
"name": "Chùa Bổ Đà",
"route": "Bờ bắc sông Cầu",
"type": "chua"
},
{
"id": "tho-ha",
"name": "Làng cổ Thổ Hà",
"route": "Bờ bắc sông Cầu",
"type": "lang"
},
{
"id": "phu-lao",
"name": "Đình Phù Lão",
"route": "Yên Thế – Xương Giang",
"type": "dinh"
},
{
"id": "tien-luc",
"name": "Cây dã hương nghìn năm và quần thể di tích Tiên Lục",
"route": "Yên Thế – Xương Giang",
"type": "lang"
},
{
"id": "xuong-giang",
"name": "Địa điểm chiến thắng Xương Giang",
"route": "Yên Thế – Xương Giang",
"type": "chien-tich"
},
{
"id": "yen-the",
"name": "Khu di tích khởi nghĩa Yên Thế – Hoàng Hoa Thám",
"route": "Yên Thế – Xương Giang",
"type": "chien-tich"
},
{
"id": "tay-yen-tu",
"name": "Tây Yên Tử",
"route": "Dấu xưa Trúc Lâm",
"type": "chua"
},
{
"id": "vinh-nghiem",
"name": "Chùa Vĩnh Nghiêm",
"route": "Dấu xưa Trúc Lâm",
"type": "chua"
},
{
"id": "den-xa",
"name": "Đền Xà và phòng tuyến sông Như Nguyệt",
"route": "Đôi bờ Như Nguyệt",
"type": "den"
},
{
"id": "dinh-huong",
"name": "Lăng đá Dinh Hương",
"route": "Đôi bờ Như Nguyệt",
"type": "lang-mo"
},
{
"id": "lo-hanh",
"name": "Đình Lỗ Hạnh",
"route": "Đôi bờ Như Nguyệt",
"type": "dinh"
},
{
"id": "le-van-thinh",
"name": "Đền thờ Trạng nguyên Lê Văn Thịnh",
"route": "Phía đông Kinh Bắc",
"type": "den"
},
{
"id": "nui-dam",
"name": "Núi Dạm: chùa Dạm và chùa Hàm Long",
"route": "Phía đông Kinh Bắc",
"type": "chua"
},
{
"id": "phu-lang",
"name": "Làng gốm Phù Lãng",
"route": "Phía đông Kinh Bắc",
"type": "lang-nghe"
}
];

/* js/activities/basic.js */
/* Mẫu hoạt động cơ bản: Trình chiếu, Trắc nghiệm nhanh, Hai vòng (học từ bạn), Trả lời ngắn / Phiếu thoát.

   Hợp đồng chung của một mẫu hoạt động (L360.registerType):
   - type, label, desc, icon, fields (cho trình soạn), template() – bước mẫu
   - normalize(step), validate(step, err, warn)
   - subKey(step, state), keys(step, meta), count(step), timerFor(step, state)
   - publicPayload(step, state)  -> nội dung phát cho học sinh (không có đáp án)
   - answerPayload(step, state)  -> đáp án, công bố khi giáo viên bấm "Công bố"
   - isCorrect(step, key, value), points(step), describe(step, key, value)
   - student.input(el, ctx) / student.result(el, ctx) / student.render(el, ctx)
   - screen(el, ctx), host(el, ctx), controls(ctx)
   ctx học sinh: {code, me, group, groups, step, state, key, item, answer, sub, submit(v), gsub, gsubmit(v), featured, awards, gwork, gworkSet, gworkPush, expo, myScore}
   ctx màn chiếu: {data, state, step, key, item, answer, subs, gsubs, joined, groups, featured, mode}
   ctx giáo viên: {host, data, step (đầy đủ, có đáp án), state, key, subs, gsubs, joined, groups} */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;

  // Văn bản ngắn có gạch đầu dòng "- " và **đậm**.
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

  const countBy = (subs, n, pick) => {
    const arr = Array(n).fill(0);
    u.vals(subs).forEach((s) => {
      const v = pick ? pick(s.v) : s.v;
      if (typeof v === "number" && arr[v] != null) arr[v]++;
    });
    return arr;
  };
  const mediaFields = [
    { key: "media.image", label: "Ảnh (đường dẫn)", kind: "text", hint: "Ảnh có giấy phép mở, ví dụ Wikimedia Commons" },
    { key: "media.caption", label: "Chú thích ảnh", kind: "text" },
    { key: "media.credit", label: "Nguồn ảnh", kind: "text" },
    { key: "media.video", label: "Video (đường dẫn)", kind: "text" },
    { key: "media.link", label: "Đường dẫn mở rộng", kind: "text" }
  ];
  L360.mediaFields = mediaFields;

  /* ---------------- Trình chiếu ---------------- */
  L360.registerType({
    type: "slide",
    label: "Trình chiếu nội dung",
    icon: "▤",
    desc: "Chiếu khái niệm, tư liệu, ghi nhớ; học sinh xem cùng trên máy. Không nộp bài.",
    noSubmit: true,
    releaseOnEnter: true,
    fields: [{ key: "body", label: "Nội dung", kind: "textarea", hint: "Mỗi ý một dòng; dòng bắt đầu bằng - là gạch đầu dòng; **chữ đậm**" }].concat(mediaFields),
    template: () => ({ type: "slide", title: "Ghi nhớ", minutes: 2, body: "- Ý chính thứ nhất\n- Ý chính thứ hai", script: "" }),
    validate(s, err) {
      if (!s.body && !(s.media && s.media.image)) err("Trình chiếu cần nội dung hoặc ảnh.");
    },
    publicPayload: (s) => ({ title: s.title, body: s.body || "", media: s.media || null }),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        el.innerHTML = `<div class="card"><h2>${u.esc(ctx.step.title)}</h2>${ui.media(it.media)}<div class="md">${ui.md(it.body)}</div></div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item || {};
      const hasImg = it.media && it.media.image;
      el.innerHTML = `<div class="${hasImg ? "grid g2" : ""}" style="align-items:center;height:100%">
        <div class="md scr-text">${ui.md(it.body)}</div>${hasImg ? `<div>${ui.media(it.media, { big: true })}</div>` : ""}</div>`;
    },
    host(el, ctx) {
      el.innerHTML = `<div class="md small">${ui.md(ctx.step.body)}</div>${ui.media(ctx.step.media)}`;
    }
  });

  /* ---------------- Trắc nghiệm nhanh ---------------- */
  L360.registerType({
    type: "quiz",
    label: "Trắc nghiệm nhanh",
    icon: "✓",
    desc: "Chuỗi câu hỏi 4 lựa chọn, mỗi câu có giờ; tự khoá khi hết giờ hoặc cả lớp đã nộp; có bảng xếp hạng. Không tính tốc độ.",
    autoLockWhenAll: true,
    fields: [
      { key: "timer", label: "Giây cho mỗi câu", kind: "number", hint: "Mặc định 20" },
      { key: "questions", label: "Câu hỏi", kind: "questions" }
    ],
    template: () => ({
      type: "quiz",
      title: "Thử thách nhanh",
      minutes: 5,
      timer: 20,
      questions: [{ q: "Câu hỏi?", options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"], answer: 0, explain: "Giải thích ngắn." }]
    }),
    normalize(s) {
      s.questions = (s.questions || []).map((q) => Object.assign({ options: [], answer: 0, explain: "" }, q));
      s.timer = Number(s.timer) || 20;
    },
    validate(s, err, warn) {
      if (!s.questions || !s.questions.length) err("Chưa có câu hỏi.");
      (s.questions || []).forEach((q, i) => {
        if (!q.q) err(`Câu ${i + 1} chưa có nội dung.`);
        if (!Array.isArray(q.options) || q.options.length < 2) err(`Câu ${i + 1} cần ít nhất 2 phương án.`);
        else if (!(q.answer >= 0 && q.answer < q.options.length)) err(`Câu ${i + 1}: đáp án (answer) phải là số thứ tự 0–${q.options.length - 1}.`);
        if (!q.explain) warn(`Câu ${i + 1} chưa có giải thích đáp án.`);
      });
      if ((s.questions || []).length > 10) warn("Nhiều hơn 10 câu – cân nhắc tách thành 2 hoạt động.");
    },
    count: (s) => (s.questions || []).length,
    subKey: (s, st) => `${s.id}__q${st.q || 0}`,
    keys: (s) => (s.questions || []).map((q, i) => ({ key: `${s.id}__q${i}`, label: `${s.title} – Câu ${i + 1}` })),
    timerFor: (s) => Number(s.timer) || 20,
    publicPayload(s, st) {
      const i = st.q || 0;
      const q = s.questions[i] || {};
      return { q: i, total: s.questions.length, text: q.q || "", options: q.options || [], image: q.image || "" };
    },
    answerPayload(s, st) {
      const q = s.questions[st.q || 0] || {};
      return { answer: q.answer, explain: q.explain || "" };
    },
    isCorrect(s, key, v) {
      const i = Number(String(key).split("__q")[1]);
      const q = s.questions[i];
      return q ? v === q.answer : null;
    },
    points: () => 100,
    describe(s, key, v) {
      return typeof v === "number" ? u.letter(v) : "";
    },
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        let sel = null;
        const draw = () => {
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Câu ${it.q + 1}/${it.total}</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.text)}</h2>${it.image ? ui.media({ image: it.image }) : ""}
          ${ui.options(it.options || [], { selected: sel })}
          <button class="btn primary lg block" style="margin-top:16px" data-send ${sel == null ? "disabled" : ""}>Gửi đáp án</button>
          <p class="small muted center" style="margin-top:8px">Đây là cơ hội kiểm tra điều mình hiểu, không phải chạy đua tốc độ.</p></div>`;
          u.$$("[data-opt]", el).forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.opt)), draw())));
          u.$("[data-send]", el).onclick = () => sel != null && ctx.submit(sel);
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const ans = ctx.answer;
        const mine = ctx.sub ? ctx.sub.v : null;
        const ok = ans && mine === ans.answer;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Câu ${it.q + 1}/${it.total}</span><span class="spacer"></span>
          ${ans ? (mine == null ? `<span class="pill warn">Em chưa trả lời</span>` : ok ? `<span class="pill ok">Đúng · +100</span>` : `<span class="pill bad">Chưa đúng</span>`) : `<span class="pill">Đã khoá</span>`}</div>
          <h2 style="margin-top:12px">${u.rich(it.text)}</h2>
          ${ui.options(it.options || [], { selected: mine, answer: ans ? ans.answer : null, mine, disabled: true })}
          ${ans && ans.explain ? `<div class="card flat" style="margin-top:14px;background:var(--paper)"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}
          ${ans ? `<p class="center" style="margin-top:12px">Điểm của em: <b>${ctx.myScore || 0}</b></p>` : `<p class="center muted" style="margin-top:12px">Chờ giáo viên công bố đáp án.</p>`}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      const st = ctx.state;
      const s = ctx.step;
      if (!it || st.phase === "observe") {
        el.innerHTML = `<div class="scr-center"><div class="pill accent" style="font-size:1.2rem">${s.count} câu hỏi · ${u.esc(s.title)}</div>
          <h1 style="font-size:3.2rem;margin-top:20px">Sẵn sàng câu ${(st.q || 0) + 1}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "Mỗi câu có thời gian riêng. Điểm không tính tốc độ.")}</p></div>`;
        return;
      }
      const cnt = countBy(ctx.subs, (it.options || []).length);
      const n = Object.keys(ctx.subs || {}).length;
      const ans = ctx.answer;
      const showDist = ans || ctx.mode === "live";
      el.innerHTML = `<div class="row"><span class="pill accent" style="font-size:1.05rem">Câu ${it.q + 1}/${it.total}</span></div>
        <h1 class="scr-q">${u.rich(it.text)}</h1>
        ${
          showDist
            ? ui.bars(
                (it.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: cnt[i], correct: ans && ans.answer === i, dim: ans && ans.answer !== i })),
                { total: n || 1 }
              ) + (ans && ans.explain ? `<div class="scr-explain"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : "")
            : `<div class="scr-opts">${(it.options || []).map((o, i) => `<div class="scr-opt"><span class="k">${u.letter(i)}</span>${u.rich(o)}</div>`).join("")}</div>`
        }`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const q = s.questions[ctx.state.q || 0] || {};
      const cnt = countBy(ctx.subs, (q.options || []).length);
      const n = Object.keys(ctx.subs || {}).length;
      el.innerHTML = `<p class="small muted">Câu ${(ctx.state.q || 0) + 1}/${s.questions.length} · đáp án <b>${u.letter(q.answer)}</b></p>
        <p><b>${u.rich(q.q)}</b></p>${ui.bars(
          (q.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: cnt[i], correct: i === q.answer })),
          { total: n || 1 }
        )}`;
    },
    controls(ctx) {
      const { host, state, step } = ctx;
      const q = state.q || 0;
      const last = q >= step.questions.length - 1;
      const c = [];
      if (state.phase === "observe") c.push({ label: `▶ Mở câu ${q + 1}`, cls: "primary", fn: () => host.open() });
      if (state.phase === "open") c.push({ label: "■ Khoá", cls: "dark", fn: () => host.lock() }, { label: "+10 giây", fn: () => host.addTime(10) });
      if (state.phase === "locked") c.push({ label: "✓ Công bố đáp án", cls: "ok", fn: () => host.reveal() });
      if (state.phase === "revealed") {
        if (!last) c.push({ label: `Câu tiếp theo (${q + 2}) ›`, cls: "primary", fn: () => host.setQ(q + 1, true) });
        else c.push({ label: "🏆 Bảng xếp hạng", cls: "primary", fn: () => host.setScreen("board") });
      }
      if (q > 0 && state.phase !== "open") c.push({ label: "‹ Câu trước", fn: () => host.setQ(q - 1, false) });
      return c;
    }
  });

  /* ---------------- Hai vòng – học từ bạn ---------------- */
  L360.registerType({
    type: "poll2",
    label: "Hai vòng – học từ bạn",
    icon: "⇄",
    desc: "Vòng 1 tự chọn → trao đổi cặp → vòng 2 giữ hoặc đổi → công bố. Màn chiếu so sánh hai vòng: minh chứng học sinh tiến bộ ngay trong tiết.",
    autoLockWhenAll: false,
    fields: [
      { key: "question", label: "Câu hỏi", kind: "textarea" },
      { key: "options", label: "Phương án", kind: "options" },
      { key: "explain", label: "Giải thích đáp án", kind: "textarea" },
      { key: "card", label: "Thẻ ghi nhớ sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Giây vòng 1, vòng 2", kind: "pair", hint: "Ví dụ 60 và 45" }
    ],
    template: () => ({
      type: "poll2",
      title: "Em chọn gì?",
      minutes: 4,
      question: "Câu hỏi khái niệm dễ nhầm?",
      options: ["Phương án A", "Phương án B"],
      answer: 1,
      explain: "",
      card: "",
      timer: [60, 45]
    }),
    normalize(s) {
      s.options = s.options || [];
      if (!Array.isArray(s.timer)) s.timer = [Number(s.timer) || 60, 45];
    },
    validate(s, err, warn) {
      if (!s.question) err("Chưa có câu hỏi.");
      if (!Array.isArray(s.options) || s.options.length < 2) err("Cần ít nhất 2 phương án.");
      if (s.answer != null && !(s.answer >= 0 && s.answer < (s.options || []).length)) err("Đáp án (answer) không khớp số phương án.");
      if (s.answer == null) warn("Không có đáp án đúng – hoạt động sẽ chạy như thăm dò ý kiến.");
    },
    subKey: (s, st) => `${s.id}__r${st.round === 2 ? 2 : 1}`,
    keys: (s) => [
      { key: `${s.id}__r1`, label: `${s.title} – vòng 1` },
      { key: `${s.id}__r2`, label: `${s.title} – vòng 2` }
    ],
    timerFor: (s, st) => (st.round === 2 ? Number(s.timer[1]) || 45 : Number(s.timer[0]) || 60),
    publicPayload: (s, st) => ({ question: s.question, options: s.options, round: st.round === 2 ? 2 : 1 }),
    answerPayload: (s) => ({ answer: s.answer == null ? null : s.answer, explain: s.explain || "", card: s.card || "" }),
    isCorrect: (s, key, v) => (s.answer == null ? null : v === s.answer),
    describe: (s, key, v) => (typeof v === "number" ? u.letter(v) : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = ctx.mine ? ctx.mine[`${ctx.step.id}__r1`] : null;
        let sel = it.round === 2 && typeof prev === "number" ? prev : null;
        const draw = () => {
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Vòng ${it.round}</span><span class="spacer"></span>${ui.timer()}</div>
            ${it.round === 2 ? `<p class="small" style="margin-top:10px;background:var(--warn-bg);padding:8px 12px;border-radius:10px">Sau khi trao đổi với bạn: giữ hoặc đổi lựa chọn của em.</p>` : ""}
            <h2 style="margin-top:12px">${u.rich(it.question)}</h2>${ui.options(it.options || [], { selected: sel })}
            <button class="btn primary lg block" style="margin-top:16px" data-send ${sel == null ? "disabled" : ""}>Gửi lựa chọn</button></div>`;
          u.$$("[data-opt]", el).forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.opt)), draw())));
          u.$("[data-send]", el).onclick = () => sel != null && ctx.submit(sel);
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const ans = ctx.answer;
        const mine = ctx.sub ? ctx.sub.v : null;
        const has = ans && ans.answer != null;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Vòng ${it.round}</span><span class="spacer"></span>${
          has ? (mine === ans.answer ? `<span class="pill ok">Chính xác</span>` : `<span class="pill bad">Chưa chính xác</span>`) : ans ? "" : `<span class="pill">Đã khoá</span>`
        }</div><h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          ${ui.options(it.options || [], { selected: mine, answer: has ? ans.answer : null, mine, disabled: true })}
          ${ans && ans.explain ? `<div class="card flat" style="margin-top:14px;background:var(--paper)"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}
          ${ans && ans.card ? `<div class="card flat" style="margin-top:12px;border-color:var(--accent)"><b>Thẻ ghi nhớ</b><div class="md">${ui.md(ans.card)}</div></div>` : ""}
          ${!ans ? `<p class="center muted" style="margin-top:12px">${it.round === 1 ? "Trao đổi với bạn bên cạnh: vì sao em chọn như vậy?" : "Chờ giáo viên công bố."}</p>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      const s = ctx.step;
      const d = ctx.data;
      const st = ctx.state;
      const opts = (it && it.options) || [];
      const k1 = `${s.id}__r1`;
      const k2 = `${s.id}__r2`;
      const s1 = (d.subs && d.subs[k1]) || {};
      const s2 = (d.subs && d.subs[k2]) || {};
      const ans = (d.pub && d.pub.answers && (d.pub.answers[k2] || d.pub.answers[k1])) || null;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(s.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "Chuẩn bị suy nghĩ độc lập ở vòng 1.")}</p></div>`;
        return;
      }
      const n1 = Object.keys(s1).length;
      const n2 = Object.keys(s2).length;
      const c1 = countBy(s1, opts.length);
      const c2 = countBy(s2, opts.length);
      let body;
      if (ans || (st.round === 2 && (st.phase !== "open" || ctx.mode === "live")))
        body = ui.pairBars(opts.map((o, i) => `${u.letter(i)}. ${u.esc(o)}`), c1, c2, n1 || 1, n2 || 1, ans ? ans.answer : null);
      else if (ctx.mode === "live" || st.phase === "locked")
        body = ui.bars(opts.map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: c1[i] })), { total: n1 || 1 });
      else body = `<div class="scr-opts">${opts.map((o, i) => `<div class="scr-opt"><span class="k">${u.letter(i)}</span>${u.rich(o)}</div>`).join("")}</div>`;
      el.innerHTML = `<div class="row"><span class="pill accent" style="font-size:1.05rem">Vòng ${st.round === 2 ? 2 : 1}</span>${
        n1 ? `<span class="pill">Vòng 1: ${n1} lượt</span>` : ""
      }${n2 ? `<span class="pill">Vòng 2: ${n2} lượt</span>` : ""}</div><h1 class="scr-q">${u.rich(it.question)}</h1>${body}
      ${
        ans && (ans.explain || ans.card)
          ? `<div class="grid ${ans.explain && ans.card ? "g2" : ""}" style="gap:16px">${ans.explain ? `<div class="scr-explain"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}${
              ans.card ? `<div class="scr-explain" style="border-color:var(--accent)"><b>Thẻ ghi nhớ.</b> ${ui.md(ans.card)}</div>` : ""
            }</div>`
          : ""
      }`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const d = ctx.data;
      const s1 = (d.subs && d.subs[`${s.id}__r1`]) || {};
      const s2 = (d.subs && d.subs[`${s.id}__r2`]) || {};
      el.innerHTML = `<p class="small muted">Đáp án: <b>${s.answer == null ? "không có (thăm dò)" : u.letter(s.answer)}</b></p>${ui.pairBars(
        s.options.map((o, i) => `${u.letter(i)}. ${u.esc(o)}`),
        countBy(s1, s.options.length),
        countBy(s2, s.options.length),
        Object.keys(s1).length || 1,
        Object.keys(s2).length || 1,
        s.answer
      )}`;
    },
    controls(ctx) {
      const { host, state } = ctx;
      const c = [];
      const r = state.round === 2 ? 2 : 1;
      if (state.phase === "observe") c.push({ label: "▶ Mở vòng 1", cls: "primary", fn: () => host.open() });
      if (state.phase === "open")
        c.push({ label: "■ Khoá", cls: "dark", fn: () => host.lock() }, { label: "+15 giây", fn: () => host.addTime(15) });
      if (state.phase === "locked" && r === 1)
        c.push({ label: "↻ Mở vòng 2", cls: "primary", fn: () => host.round2() }, { label: "✓ Công bố ngay", fn: () => host.reveal() });
      if (state.phase === "locked" && r === 2) c.push({ label: "✓ Công bố đáp án", cls: "ok", fn: () => host.reveal() });
      return c;
    }
  });

  /* ---------------- Trả lời ngắn / Phiếu thoát ---------------- */
  L360.registerType({
    type: "text",
    label: "Trả lời ngắn / Phiếu thoát",
    icon: "✎",
    desc: "Học sinh viết câu trả lời ngắn có giới hạn từ; tự đánh giá 3 mức; giáo viên gắn ★ bài hay để chiếu; màn chiếu có đám mây từ.",
    fields: [
      { key: "question", label: "Câu hỏi / nhiệm vụ", kind: "textarea" },
      { key: "maxWords", label: "Giới hạn số từ", kind: "number" },
      { key: "placeholder", label: "Câu mở đầu gợi ý", kind: "text", hint: "Ví dụ: Tôi muốn thế hệ tương lai hiểu rằng…" },
      { key: "selfAssess", label: "Có tự đánh giá 3 mức", kind: "bool" },
      { key: "askDoubt", label: "Hỏi điều còn băn khoăn", kind: "bool" },
      { key: "sample", label: "Gợi ý đáp án (công bố sau)", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({ type: "text", title: "Phiếu thoát", minutes: 3, question: "Điều quan trọng nhất em học được hôm nay là gì?", maxWords: 40, selfAssess: true, askDoubt: true, timer: 120 }),
    normalize(s) {
      s.maxWords = Number(s.maxWords) || 40;
    },
    validate(s, err) {
      if (!s.question) err("Chưa có câu hỏi.");
    },
    publicPayload: (s) => ({
      question: s.question,
      maxWords: s.maxWords,
      placeholder: s.placeholder || "",
      selfAssess: !!s.selfAssess,
      selfLabels: s.selfLabels || ["Chưa vững", "Khá vững", "Rất vững"],
      askDoubt: !!s.askDoubt
    }),
    answerPayload: (s) => ({ sample: s.sample || "" }),
    describe: (s, key, v) => (v ? `${v.text || ""}${v.level ? ` [tự đánh giá ${v.level}/3]` : ""}${v.doubt ? ` [băn khoăn: ${v.doubt}]` : ""}` : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        let level = prev.level || 0;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Viết ngắn</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          ${ui.textarea("ta", { value: prev.text || it.placeholder || "", max: it.maxWords, rows: 5 })}
          ${
            it.selfAssess
              ? `<p style="margin:14px 0 6px;font-weight:650">Em tự đánh giá mức hiểu bài:</p><div class="chips">${it.selfLabels
                  .map((l, i) => `<button class="chip ${level === i + 1 ? "sel" : ""}" data-lv="${i + 1}">${i + 1}. ${u.esc(l)}</button>`)
                  .join("")}</div>`
              : ""
          }
          ${it.askDoubt ? `<label class="field" style="margin-top:14px">Điều em còn băn khoăn (không bắt buộc)<input type="text" id="doubt" maxlength="160" value="${u.esc(prev.doubt || "")}"></label>` : ""}
          <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
        ui.bindWordCount(el);
        u.$$("[data-lv]", el).forEach(
          (b) =>
            (b.onclick = () => {
              level = Number(b.dataset.lv);
              u.$$("[data-lv]", el).forEach((x) => x.classList.toggle("sel", x === b));
            })
        );
        u.$("[data-send]", el).onclick = () => {
          const text = u.$("#ta", el).value.trim();
          if (!text || text === it.placeholder.trim()) return u.toast("Em hãy viết câu trả lời.", "bad");
          if (u.words(text) > it.maxWords) return u.toast(`Tối đa ${it.maxWords} từ.`, "bad");
          if (it.selfAssess && !level) return u.toast("Chọn mức tự đánh giá.", "bad");
          const v = { text };
          if (level) v.level = level;
          const d = u.$("#doubt", el);
          if (d && d.value.trim()) v.doubt = d.value.trim();
          ctx.submit(v);
        };
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || null;
        const ans = ctx.answer;
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2>
          ${v ? `<div class="card flat" style="background:var(--paper)"><div class="small muted">Câu trả lời của em</div>${u.rich(v.text)}</div>` : `<p class="muted">Em chưa nộp bài này.</p>`}
          ${ctx.featured ? `<p style="margin-top:10px"><span class="pill ok">★ Giáo viên đã chọn bài của em để chiếu</span></p>` : ""}
          ${ans && ans.sample ? `<div class="card flat" style="margin-top:12px;border-color:var(--accent)"><b>Gợi ý đáp án.</b><div class="md">${ui.md(ans.sample)}</div></div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(ctx.step.instructions || "")}</p></div>`;
        return;
      }
      const texts = u.vals(ctx.subs).map((s) => s.v && s.v.text);
      const feat = u.vals(ctx.featured).filter((x) => typeof x === "string");
      const ans = ctx.answer;
      let lv = "";
      if (it.selfAssess) {
        const c = [0, 0, 0];
        u.vals(ctx.subs).forEach((s) => s.v && s.v.level && c[s.v.level - 1]++);
        if (c.some(Boolean)) lv = `<h3 style="margin-top:18px">Tự đánh giá</h3>` + ui.bars(it.selfLabels.map((l, i) => ({ label: `${i + 1}. ${l}`, value: c[i] })), { total: texts.length || 1 });
      }
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1>
        ${feat.length ? `<div class="scr-feats">${feat.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>` : ""}
        ${ctx.mode === "live" || ctx.state.phase !== "open" ? ui.cloud(texts) : `<p class="muted center" style="font-size:1.3rem">Học sinh đang viết…</p>`}
        ${lv}${ans && ans.sample ? `<div class="scr-explain"><b>Gợi ý.</b> ${ui.md(ans.sample)}</div>` : ""}`;
    },
    host(el, ctx) {
      const { host, data, key } = ctx;
      const roster = data.roster || {};
      const feats = (data.pub && data.pub.featured && data.pub.featured[key]) || {};
      const list = u.entries(ctx.subs).sort((a, b) => a[0].localeCompare(b[0]));
      el.innerHTML = list.length
        ? `<div class="col" style="gap:8px">${list
            .map(
              ([c, s]) => `<div class="row nowrap" style="align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:8px">
          <button class="btn sm ${feats[c] ? "primary" : ""}" data-feat="${c}" title="Gắn ★ để chiếu">★</button>
          <div class="grow"><b>${c}</b> <span class="muted small">${u.esc((roster[c] || {}).name || "")}${s.v && s.v.level ? ` · tự đánh giá ${s.v.level}/3` : ""}</span><br>${u.esc(
                (s.v && s.v.text) || ""
              )}${s.v && s.v.doubt ? `<br><span class="small" style="color:var(--warn)">Băn khoăn: ${u.esc(s.v.doubt)}</span>` : ""}</div></div>`
            )
            .join("")}</div>`
        : `<p class="muted">Chưa có bài nộp.</p>`;
      u.$$("[data-feat]", el).forEach((b) => (b.onclick = () => host.feature(key, b.dataset.feat, (ctx.subs[b.dataset.feat].v || {}).text)));
    }
  });
})();

/* js/activities/interactive.js */
/* Mẫu hoạt động tương tác: Chọn thẻ + giả thuyết, Ghép nối, Sắp xếp trình tự. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;

  // Thứ tự xáo trộn cố định theo bước (mọi máy giống nhau), không trùng thứ tự gốc.
  const perm = (s, n) => {
    const idx = Array.from({ length: n }, (_, i) => i);
    let p = u.shuffle(idx, `${s.id}|${s.title}|${n}`);
    if (n > 1 && p.every((v, i) => v === i)) p = p.slice(1).concat(p[0]);
    return p; // p[pos] = chỉ số gốc
  };

  /* ---------------- Chọn thẻ + giả thuyết ---------------- */
  L360.registerType({
    type: "cards",
    label: "Chọn thẻ + giả thuyết",
    icon: "▦",
    desc: "Học sinh chọn tối đa N thẻ (yếu tố, nguyên nhân, đặc điểm…) và viết giả thuyết ngắn; màn chiếu hiện tần suất các thẻ.",
    fields: [
      { key: "question", label: "Câu hỏi", kind: "textarea" },
      { key: "cards", label: "Các thẻ", kind: "list" },
      { key: "maxPick", label: "Số thẻ tối đa được chọn", kind: "number" },
      { key: "textPrompt", label: "Yêu cầu viết (để trống nếu không cần)", kind: "text" },
      { key: "maxWords", label: "Giới hạn từ", kind: "number" },
      { key: "conclusion", label: "Kết luận công bố cuối hoạt động", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "cards",
      title: "Chọn thẻ",
      minutes: 3,
      question: "Những yếu tố nào…?",
      cards: ["Yếu tố 1", "Yếu tố 2", "Yếu tố 3", "Yếu tố 4"],
      maxPick: 3,
      textPrompt: "Viết giả thuyết của em",
      maxWords: 30,
      conclusion: "",
      timer: 90
    }),
    normalize(s) {
      s.cards = (s.cards || []).map((c) => (typeof c === "string" ? c : c.text || ""));
      s.maxPick = Number(s.maxPick) || Math.min(3, s.cards.length);
      s.maxWords = Number(s.maxWords) || 30;
    },
    validate(s, err) {
      if (!s.question) err("Chưa có câu hỏi.");
      if (!s.cards || s.cards.length < 2) err("Cần ít nhất 2 thẻ.");
    },
    publicPayload: (s) => ({ question: s.question, cards: s.cards, maxPick: s.maxPick, textPrompt: s.textPrompt || "", maxWords: s.maxWords }),
    answerPayload: (s) => ({ conclusion: s.conclusion || "" }),
    describe: (s, key, v) => (v ? `${(v.picks || []).map((i) => s.cards[i]).join("; ")}${v.text ? ` | ${v.text}` : ""}` : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        let picks = (prev.picks || []).slice();
        const draw = () => {
          const text = u.$("#ta", el) ? u.$("#ta", el).value : prev.text || "";
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Chọn tối đa ${it.maxPick} thẻ</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          <div class="chips">${it.cards.map((c, i) => `<button class="chip ${picks.includes(i) ? "sel" : ""}" data-c="${i}">${u.esc(c)}</button>`).join("")}</div>
          ${it.textPrompt ? `<p style="margin:16px 0 6px;font-weight:650">${u.esc(it.textPrompt)}</p>${ui.textarea("ta", { value: text, max: it.maxWords, rows: 3 })}` : ""}
          <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
          ui.bindWordCount(el);
          u.$$("[data-c]", el).forEach(
            (b) =>
              (b.onclick = () => {
                const i = Number(b.dataset.c);
                if (picks.includes(i)) picks = picks.filter((x) => x !== i);
                else if (picks.length < it.maxPick) picks.push(i);
                else return u.toast(`Chỉ chọn tối đa ${it.maxPick} thẻ.`);
                draw();
              })
          );
          u.$("[data-send]", el).onclick = () => {
            if (!picks.length) return u.toast("Hãy chọn ít nhất 1 thẻ.", "bad");
            const t = u.$("#ta", el) ? u.$("#ta", el).value.trim() : "";
            if (it.textPrompt && !t) return u.toast("Hãy viết giả thuyết của em.", "bad");
            if (u.words(t) > it.maxWords) return u.toast(`Tối đa ${it.maxWords} từ.`, "bad");
            ctx.submit({ picks: picks.slice().sort((a, b) => a - b), text: t });
          };
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || {};
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2>
          <div class="chips">${(it.cards || []).map((c, i) => `<span class="chip ${(v.picks || []).includes(i) ? "sel" : ""}">${u.esc(c)}</span>`).join("")}</div>
          ${v.text ? `<div class="card flat" style="margin-top:12px;background:var(--paper)">${u.rich(v.text)}</div>` : ""}
          ${ctx.featured ? `<p style="margin-top:10px"><span class="pill ok">★ Bài của em được chọn để chiếu</span></p>` : ""}
          ${ctx.answer && ctx.answer.conclusion ? `<div class="card flat" style="margin-top:12px;border-color:var(--accent)"><b>Kết luận.</b><div class="md">${ui.md(ctx.answer.conclusion)}</div></div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(ctx.step.instructions || "")}</p></div>`;
        return;
      }
      const cnt = Array(it.cards.length).fill(0);
      const subs = u.vals(ctx.subs);
      subs.forEach((s) => ((s.v && s.v.picks) || []).forEach((i) => cnt[i] != null && cnt[i]++));
      const order = cnt.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]);
      const feat = u.vals(ctx.featured).filter((x) => typeof x === "string");
      const show = ctx.mode === "live" || ctx.state.phase !== "open";
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1>
        ${
          show
            ? ui.bars(order.map(([c, i]) => ({ label: u.esc(it.cards[i]), value: c })), { total: subs.length || 1 })
            : `<div class="chips" style="justify-content:center">${it.cards.map((c) => `<span class="chip" style="font-size:1.2rem">${u.esc(c)}</span>`).join("")}</div>`
        }
        ${feat.length ? `<div class="scr-feats">${feat.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>` : ""}
        ${ctx.answer && ctx.answer.conclusion ? `<div class="scr-explain"><b>Kết luận.</b> ${ui.md(ctx.answer.conclusion)}</div>` : ""}`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const { host, data, key } = ctx;
      const feats = (data.pub && data.pub.featured && data.pub.featured[key]) || {};
      const cnt = Array(s.cards.length).fill(0);
      u.vals(ctx.subs).forEach((x) => ((x.v && x.v.picks) || []).forEach((i) => cnt[i] != null && cnt[i]++));
      el.innerHTML =
        ui.bars(
          s.cards.map((c, i) => ({ label: u.esc(c), value: cnt[i] })),
          { total: Object.keys(ctx.subs).length || 1 }
        ) +
        `<h3 style="margin-top:14px">Giả thuyết</h3>` +
        (u
          .entries(ctx.subs)
          .filter(([, x]) => x.v && x.v.text)
          .map(
            ([c, x]) =>
              `<div class="row nowrap" style="align-items:flex-start;margin-bottom:8px"><button class="btn sm ${feats[c] ? "primary" : ""}" data-feat="${c}">★</button><div><b>${c}</b>: ${u.esc(x.v.text)}</div></div>`
          )
          .join("") || `<p class="muted small">Chưa có giả thuyết.</p>`);
      u.$$("[data-feat]", el).forEach((b) => (b.onclick = () => host.feature(key, b.dataset.feat, ctx.subs[b.dataset.feat].v.text)));
    }
  });

  /* ---------------- Ghép nối ---------------- */
  L360.registerType({
    type: "match",
    label: "Ghép nối",
    icon: "⇋",
    desc: "Ghép mỗi ý ở cột trái với một ý ở cột phải (thứ tự cột phải được xáo trộn); có thể yêu cầu viết 1 câu giải thích.",
    fields: [
      { key: "question", label: "Yêu cầu", kind: "textarea" },
      { key: "pairs", label: "Các cặp đúng (trái – phải)", kind: "pairs" },
      { key: "whyPrompt", label: "Yêu cầu giải thích (để trống nếu không cần)", kind: "text" },
      { key: "explain", label: "Giải thích sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "match",
      title: "Ghép nối",
      minutes: 4,
      question: "Ghép mỗi … với … phù hợp.",
      pairs: [
        { left: "Ý trái 1", right: "Ý phải 1" },
        { left: "Ý trái 2", right: "Ý phải 2" },
        { left: "Ý trái 3", right: "Ý phải 3" }
      ],
      whyPrompt: "",
      explain: "",
      timer: 120
    }),
    validate(s, err) {
      if (!s.pairs || s.pairs.length < 2) err("Cần ít nhất 2 cặp.");
      (s.pairs || []).forEach((p, i) => (!p.left || !p.right) && err(`Cặp ${i + 1} thiếu nội dung.`));
    },
    publicPayload(s) {
      const p = perm(s, s.pairs.length);
      return { question: s.question || "", lefts: s.pairs.map((x) => x.left), rights: p.map((i) => s.pairs[i].right), whyPrompt: s.whyPrompt || "" };
    },
    answerPayload(s) {
      const p = perm(s, s.pairs.length);
      // map[trái i] = vị trí của vế phải đúng trong danh sách đã xáo
      return { map: s.pairs.map((_, i) => p.indexOf(i)), explain: s.explain || "" };
    },
    isCorrect(s, key, v) {
      if (!v || !Array.isArray(v.m)) return false;
      const p = perm(s, s.pairs.length);
      return s.pairs.every((_, i) => v.m[i] === p.indexOf(i));
    },
    describe(s, key, v) {
      if (!v || !v.m) return "";
      return v.m.map((r, i) => `${i + 1}→${r == null ? "?" : u.letter(r)}`).join("; ") + (v.why ? ` | ${v.why}` : "");
    },
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Ghép nối</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          <div class="col">${it.lefts
            .map(
              (l, i) => `<label class="field"><span>${i + 1}. ${u.esc(l)}</span><select data-m="${i}"><option value="">– chọn –</option>${it.rights
                .map((r, j) => `<option value="${j}" ${prev.m && prev.m[i] === j ? "selected" : ""}>${u.letter(j)}. ${u.esc(r)}</option>`)
                .join("")}</select></label>`
            )
            .join("")}</div>
          ${it.whyPrompt ? `<label class="field" style="margin-top:14px">${u.esc(it.whyPrompt)}<textarea id="why" rows="2">${u.esc(prev.why || "")}</textarea></label>` : ""}
          <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
        u.$("[data-send]", el).onclick = async () => {
          const m = u.$$("[data-m]", el).map((s) => (s.value === "" ? null : Number(s.value)));
          if (m.some((x) => x == null)) return u.toast("Hãy ghép đủ tất cả các ý.", "bad");
          if (new Set(m).size < m.length && !(await u.confirm("Có ý ở cột phải được dùng hai lần. Em vẫn gửi chứ?", "Vẫn gửi"))) return;
          const v = { m };
          const w = u.$("#why", el);
          if (w && w.value.trim()) v.why = w.value.trim();
          ctx.submit(v);
        };
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || {};
        const ans = ctx.answer;
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2><div class="col" style="gap:8px">${it.lefts
          .map((l, i) => {
            const mine = v.m ? v.m[i] : null;
            const ok = ans ? mine === ans.map[i] : null;
            return `<div class="card flat" style="padding:10px 14px;${ok === true ? "border-color:var(--ok);background:var(--ok-bg)" : ok === false ? "border-color:var(--bad);background:var(--bad-bg)" : ""}">
              <b>${i + 1}. ${u.esc(l)}</b><br>→ ${mine == null ? "<i>chưa ghép</i>" : `${u.letter(mine)}. ${u.esc(it.rights[mine])}`}
              ${ans && !ok ? `<br><span class="small" style="color:var(--ok)">Đúng: ${u.letter(ans.map[i])}. ${u.esc(it.rights[ans.map[i]])}</span>` : ""}</div>`;
          })
          .join("")}</div>${ans && ans.explain ? `<div class="card flat" style="margin-top:12px;background:var(--paper)"><b>Giải thích.</b> ${ui.md(ans.explain)}</div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1></div>`;
        return;
      }
      const subs = u.vals(ctx.subs);
      const ans = ctx.answer;
      const rate = (i) => (ans ? u.pct(subs.filter((s) => s.v && s.v.m && s.v.m[i] === ans.map[i]).length, subs.length) : null);
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1>
        <div class="grid g2" style="gap:28px"><div class="col">${it.lefts
          .map(
            (l, i) => `<div class="scr-opt"><span class="k">${i + 1}</span><span class="grow">${u.esc(l)}</span>${
              ans ? `<span class="pill ${rate(i) >= 70 ? "ok" : rate(i) >= 40 ? "warn" : "bad"}" style="font-size:1rem">→ ${u.letter(ans.map[i])} · ${rate(i)}% đúng</span>` : ""
            }</div>`
          )
          .join("")}</div>
        <div class="col">${it.rights.map((r, j) => `<div class="scr-opt"><span class="k">${u.letter(j)}</span>${u.esc(r)}</div>`).join("")}</div></div>
        ${ans && ans.explain ? `<div class="scr-explain">${ui.md(ans.explain)}</div>` : ""}`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const p = perm(s, s.pairs.length);
      const subs = u.vals(ctx.subs);
      el.innerHTML = `<p class="small muted">Đáp án: ${s.pairs.map((_, i) => `${i + 1}→${u.letter(p.indexOf(i))}`).join(" · ")}</p>${ui.bars(
        s.pairs.map((x, i) => ({ label: `${i + 1}. ${u.esc(x.left)}`, value: subs.filter((v) => v.v && v.v.m && v.v.m[i] === p.indexOf(i)).length, correct: true })),
        { total: subs.length || 1 }
      )}`;
    }
  });

  /* ---------------- Sắp xếp trình tự ---------------- */
  L360.registerType({
    type: "order",
    label: "Sắp xếp trình tự",
    icon: "↕",
    desc: "Sắp xếp sự kiện, bước, giai đoạn theo đúng thứ tự (trục thời gian, quy trình). Nhập các mục theo thứ tự ĐÚNG; hệ thống tự xáo trộn.",
    fields: [
      { key: "question", label: "Yêu cầu", kind: "textarea" },
      { key: "items", label: "Các mục theo thứ tự đúng", kind: "list" },
      { key: "explain", label: "Giải thích sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({ type: "order", title: "Sắp xếp trình tự", minutes: 3, question: "Sắp xếp các sự kiện theo trình tự thời gian.", items: ["Sự kiện 1", "Sự kiện 2", "Sự kiện 3", "Sự kiện 4"], explain: "", timer: 90 }),
    validate(s, err) {
      if (!s.items || s.items.length < 3) err("Cần ít nhất 3 mục.");
    },
    publicPayload(s) {
      const p = perm(s, s.items.length);
      return { question: s.question || "", items: p.map((i) => s.items[i]) };
    },
    answerPayload(s) {
      const p = perm(s, s.items.length);
      return { seq: s.items.map((_, i) => p.indexOf(i)), explain: s.explain || "" };
    },
    isCorrect(s, key, v) {
      if (!Array.isArray(v)) return false;
      const p = perm(s, s.items.length);
      return v.length === s.items.length && v.every((pos, k) => p[pos] === k);
    },
    describe: (s, key, v) => (Array.isArray(v) ? v.map((x) => u.letter(x)).join("-") : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        let seq = Array.isArray(ctx.sub && ctx.sub.v) ? ctx.sub.v.slice() : it.items.map((_, i) => i);
        const draw = () => {
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Sắp xếp</span><span class="spacer"></span>${ui.timer()}</div>
            <h2 style="margin-top:12px">${u.rich(it.question)}</h2><p class="small muted">Dùng ▲ ▼ để đổi vị trí. Mục đầu tiên là sớm nhất / bước đầu tiên.</p>
            <div class="col" style="gap:8px">${seq
              .map(
                (pos, k) => `<div class="row nowrap card flat" style="padding:8px 10px;gap:8px"><b style="width:24px">${k + 1}</b><span class="grow">${u.esc(it.items[pos])}</span>
                <button class="btn sm" data-up="${k}" ${k === 0 ? "disabled" : ""} aria-label="Lên">▲</button><button class="btn sm" data-dn="${k}" ${k === seq.length - 1 ? "disabled" : ""} aria-label="Xuống">▼</button></div>`
              )
              .join("")}</div>
            <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi thứ tự</button></div>`;
          u.$$("[data-up]", el).forEach((b) => (b.onclick = () => swap(Number(b.dataset.up), -1)));
          u.$$("[data-dn]", el).forEach((b) => (b.onclick = () => swap(Number(b.dataset.dn), 1)));
          u.$("[data-send]", el).onclick = () => ctx.submit(seq.slice());
        };
        const swap = (k, d) => {
          const j = k + d;
          [seq[k], seq[j]] = [seq[j], seq[k]];
          draw();
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = Array.isArray(ctx.sub && ctx.sub.v) ? ctx.sub.v : [];
        const ans = ctx.answer;
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2><div class="grid g2"><div><div class="small muted">Thứ tự của em</div><ol>${v
          .map((pos, k) => `<li style="${ans ? (ans.seq[k] === pos ? "color:var(--ok)" : "color:var(--bad)") : ""}">${u.esc(it.items[pos])}</li>`)
          .join("")}</ol></div>${ans ? `<div><div class="small muted">Thứ tự đúng</div><ol>${ans.seq.map((pos) => `<li>${u.esc(it.items[pos])}</li>`).join("")}</ol></div>` : ""}</div>
          ${ans && ans.explain ? `<div class="card flat" style="background:var(--paper)">${ui.md(ans.explain)}</div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1></div>`;
        return;
      }
      const ans = ctx.answer;
      const subs = u.vals(ctx.subs).map((s) => s.v).filter(Array.isArray);
      if (ans) {
        const full = u.pct(subs.filter((v) => v.every((p, k) => ans.seq[k] === p)).length, subs.length);
        el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1><p class="pill ${full >= 70 ? "ok" : full >= 40 ? "warn" : "bad"}" style="font-size:1.1rem">${full}% học sinh sắp xếp đúng hoàn toàn</p>
          <div class="col" style="margin-top:14px">${ans.seq
            .map((pos, k) => `<div class="scr-opt"><span class="k">${k + 1}</span><span class="grow">${u.esc(it.items[pos])}</span><span class="pill">${u.pct(subs.filter((v) => v[k] === pos).length, subs.length)}% đặt đúng vị trí</span></div>`)
            .join("")}</div>${ans.explain ? `<div class="scr-explain">${ui.md(ans.explain)}</div>` : ""}`;
      } else
        el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1><div class="col">${it.items
          .map((t, j) => `<div class="scr-opt"><span class="k">${u.letter(j)}</span>${u.esc(t)}</div>`)
          .join("")}</div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const subs = u.vals(ctx.subs);
      const ok = subs.filter((x) => L360.types.order.isCorrect(s, s.id, x.v)).length;
      el.innerHTML = `<p class="small muted">Thứ tự đúng: ${s.items.map((t, i) => `${i + 1}. ${u.esc(t)}`).join(" · ")}</p>${ui.bars([{ label: "Sắp xếp đúng hoàn toàn", value: ok, correct: true }], {
        total: subs.length || 1
      })}`;
    }
  });
})();

/* js/activities/group.js */
/* Mẫu hoạt động theo nhóm: Nhiệm vụ nhóm (hồ sơ chuyên gia), Triển lãm – nhận xét chéo, Lựa chọn / đấu giá của nhóm. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;

  const resFor = (s, gIndex) => (s.resources || []).filter((r) => !r.for || !r.for.length || r.for.includes(gIndex + 1));
  const resHtml = (list) =>
    list.length
      ? list
          .map(
            (r) => `<div class="card flat" style="margin-bottom:10px"><h3>${u.esc(r.title || "Tư liệu")}</h3>${ui.media({
              image: r.image,
              caption: r.caption,
              credit: r.credit,
              link: r.link,
              linkTitle: r.linkTitle
            })}<div class="md">${ui.md(r.body || r.text || "")}</div></div>`
          )
          .join("")
      : `<p class="muted">Nhóm em dùng sách giáo khoa và tư liệu giáo viên phát.</p>`;

  /* ---------------- Nhiệm vụ nhóm – hồ sơ chuyên gia ---------------- */
  L360.registerType({
    type: "groupwork",
    label: "Nhiệm vụ nhóm (hồ sơ)",
    icon: "◫",
    desc: "Mỗi nhóm có tư liệu riêng, phân vai, thành viên gửi đóng góp, Thư kí soạn hồ sơ theo các mục A, B, C… rồi nộp. Giáo viên theo dõi tiến độ từng nhóm.",
    groupMode: true,
    fields: [
      { key: "task", label: "Nhiệm vụ của nhóm", kind: "textarea" },
      { key: "roles", label: "Các vai trong nhóm (vai đầu tiên là Thư kí)", kind: "list" },
      { key: "fields", label: "Các mục của hồ sơ", kind: "fieldsList" },
      { key: "resources", label: "Tư liệu (JSON nâng cao)", kind: "json", hint: '[{"title":"…","body":"…","image":"","credit":"","for":[1]}] – "for" là số thứ tự nhóm, để trống = mọi nhóm' },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "groupwork",
      title: "Nghiên cứu nhóm",
      minutes: 12,
      task: "Đọc tư liệu, thảo luận và hoàn thành hồ sơ nhóm.",
      roles: ["Thư kí", "Trưởng nhóm", "Người tìm tư liệu", "Người thuyết trình"],
      fields: [
        { key: "A", label: "Thông tin chính" },
        { key: "B", label: "Ý nghĩa" }
      ],
      resources: [{ title: "Tư liệu chung", body: "Đọc SGK trang …" }],
      timer: 600
    }),
    normalize(s) {
      s.roles = (s.roles || ["Thư kí"]).map(String);
      s.fields = (s.fields || []).map((f, i) => (typeof f === "string" ? { key: u.letter(i), label: f } : Object.assign({ key: u.letter(i) }, f)));
      s.timer = Number(s.timer) || 600;
    },
    validate(s, err, warn) {
      if (!s.fields || !s.fields.length) err("Hồ sơ cần ít nhất 1 mục.");
      if (!s.task) warn("Chưa ghi nhiệm vụ của nhóm.");
    },
    keys: (s) => [{ key: s.id, label: s.title }],
    publicPayload: (s) => ({ task: s.task || "", roles: s.roles, fields: s.fields, resources: s.resources || [] }),
    answerPayload: () => null,
    describe: (s, key, v) => (v && v.fields ? s.fields.map((f) => `${f.key}. ${f.label}: ${v.fields[f.key] || ""}`).join(" | ") : ""),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        const gi = ctx.groups.findIndex((g) => g.id === (ctx.group && ctx.group.id));
        const st = ctx.state;
        el.innerHTML = `<div class="card"><div class="row">${ui.gbadge(ctx.group)}<span class="pill accent">Nhiệm vụ nhóm</span><span class="spacer"></span>${ui.timer()}</div>
          <p style="margin-top:10px">${u.rich(it.task)}</p>
          <div class="tabs" role="tablist"><button class="tab on" data-tab="res">Tư liệu</button><button class="tab" data-tab="role">Vai trò</button><button class="tab" data-tab="dos">Hồ sơ</button></div>
          <div data-pane="res">${resHtml(resFor(it, gi))}</div>
          <div data-pane="role" class="hidden"><div data-live="roles"></div></div>
          <div data-pane="dos" class="hidden"><div data-live="dos"></div></div></div>`;
        u.$$("[data-tab]", el).forEach(
          (b) =>
            (b.onclick = () => {
              u.$$("[data-tab]", el).forEach((x) => x.classList.toggle("on", x === b));
              u.$$("[data-pane]", el).forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== b.dataset.tab));
            })
        );
        el._gw = { tab: "res", drafts: {} };
        L360.types.groupwork.student.update(el, ctx, true);
        if (st.phase !== "open") u.$$("input,textarea,button[data-act]", el).forEach((x) => (x.disabled = true));
      },
      update(el, ctx, first) {
        if (!ctx.item) return;
        const it = ctx.item;
        const gw = ctx.gwork || {};
        const roles = gw.roles || {};
        const sec = gw.sec || "";
        const isSec = sec === ctx.code;
        const open = ctx.state.phase === "open";
        const submitted = ctx.gsub && ctx.gsub.v;
        // Vai trò
        const rEl = u.$('[data-live="roles"]', el);
        if (rEl) {
          rEl.innerHTML = `<p class="small muted">Chọn vai của em. Vai “${u.esc(it.roles[0])}” do một bạn đảm nhận để soạn và nộp hồ sơ.</p>
            <div class="col" style="gap:8px">${it.roles
              .map((r, i) => {
                const who = Object.keys(roles).filter((c) => roles[c] === i);
                const mine = roles[ctx.code] === i;
                const holder = i === 0 ? (sec ? [sec] : []) : who;
                return `<button class="opt ${mine || (i === 0 && isSec) ? "sel" : ""}" data-act="role" data-r="${i}" ${!open ? "disabled" : ""}><span class="k">${i + 1}</span><span class="grow">${u.esc(
                  r
                )}</span><span class="small muted">${holder.map((c) => u.esc(ctx.nameOf(c))).join(", ")}</span></button>`;
              })
              .join("")}</div>`;
          u.$$('[data-act="role"]', rEl).forEach(
            (b) =>
              (b.onclick = async () => {
                const r = Number(b.dataset.r);
                if (r === 0) {
                  if (sec && sec !== ctx.code) return u.toast(`${ctx.nameOf(sec)} đang là ${it.roles[0]}.`);
                  await ctx.gworkSet("sec", ctx.code);
                }
                await ctx.gworkSet(`roles/${ctx.code}`, r);
              })
          );
        }
        // Hồ sơ
        const dEl = u.$('[data-live="dos"]', el);
        if (!dEl) return;
        const contrib = u.entries(gw.contrib).sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
        const draft = gw.draft || {};
        if (submitted) {
          dEl.innerHTML = `<div class="pill ok">✓ Nhóm đã nộp hồ sơ</div>${it.fields
            .map((f) => `<div class="card flat" style="margin-top:8px"><b>${f.key}. ${u.esc(f.label)}</b><div>${u.rich(submitted.fields[f.key] || "")}</div></div>`)
            .join("")}`;
          return;
        }
        if (isSec) {
          // Thư kí: giữ nguyên ô đang gõ, chỉ cập nhật danh sách đóng góp.
          if (!dEl.dataset.sec) {
            dEl.dataset.sec = "1";
            dEl.innerHTML = `<p class="small">Em là <b>${u.esc(it.roles[0])}</b>: soạn hồ sơ từ đóng góp của các bạn rồi bấm Nộp.</p>
              ${it.fields
                .map(
                  (f) => `<label class="field" style="margin-top:10px">${f.key}. ${u.esc(f.label)}${f.hint ? `<span class="hint">${u.esc(f.hint)}</span>` : ""}
                <textarea rows="3" data-f="${f.key}">${u.esc(draft[f.key] || "")}</textarea></label>`
                )
                .join("")}
              <h3 style="margin-top:16px">Đóng góp của thành viên</h3><div data-live="contrib"></div>
              <button class="btn primary lg block" style="margin-top:14px" data-act="send">Nộp hồ sơ nhóm</button>`;
            const save = u.debounce((k, v) => ctx.gworkSet(`draft/${k}`, v), 700);
            u.$$("[data-f]", dEl).forEach((ta) => ta.addEventListener("input", () => save(ta.dataset.f, ta.value)));
            u.$('[data-act="send"]', dEl).onclick = async () => {
              const fields = {};
              u.$$("[data-f]", dEl).forEach((ta) => (fields[ta.dataset.f] = ta.value.trim()));
              const empty = it.fields.filter((f) => !fields[f.key]).map((f) => f.key);
              if (empty.length && !(await u.confirm(`Mục ${empty.join(", ")} còn trống. Vẫn nộp hồ sơ?`, "Nộp"))) return;
              await ctx.gsubmit({ fields });
              u.toast("Đã nộp hồ sơ nhóm.", "ok");
            };
          }
          const cEl = u.$('[data-live="contrib"]', dEl);
          cEl.innerHTML = contrib.length
            ? contrib
                .map(
                  ([id, c]) => `<div class="card flat" style="padding:10px 12px;margin-bottom:6px"><span class="pill">${u.esc(c.field)}</span> <b>${u.esc(ctx.nameOf(c.code))}</b>: ${u.esc(
                    c.text
                  )} <button class="btn sm" data-ins="${id}">Chèn vào mục ${u.esc(c.field)}</button></div>`
                )
                .join("")
            : `<p class="muted small">Chưa có đóng góp.</p>`;
          u.$$("[data-ins]", cEl).forEach(
            (b) =>
              (b.onclick = () => {
                const c = gw.contrib[b.dataset.ins];
                const ta = u.$(`[data-f="${c.field}"]`, dEl);
                if (!ta) return;
                ta.value = (ta.value ? ta.value.trim() + "\n" : "") + c.text;
                ta.dispatchEvent(new Event("input"));
              })
          );
        } else {
          if (!dEl.dataset.mem) {
            dEl.dataset.mem = "1";
            dEl.innerHTML = `<p class="small">${sec ? `<b>${u.esc(ctx.nameOf(sec))}</b> là ${u.esc(it.roles[0])} của nhóm.` : `Nhóm chưa có ${u.esc(it.roles[0])} – vào tab Vai trò để nhận.`} Gửi ý của em vào một mục:</p>
              <div class="row"><select data-cf style="max-width:140px">${it.fields.map((f) => `<option value="${f.key}">Mục ${f.key}</option>`).join("")}</select>
              <span class="small muted grow" data-cl></span></div>
              <textarea rows="3" data-ct style="margin-top:8px" placeholder="Ý của em…"></textarea>
              <button class="btn primary block" style="margin-top:8px" data-act="contrib">Gửi đóng góp</button>
              <h3 style="margin-top:16px">Bản hồ sơ nhóm đang soạn</h3><div data-live="draft"></div>`;
            const sel = u.$("[data-cf]", dEl);
            const lab = () => (u.$("[data-cl]", dEl).textContent = (it.fields.find((f) => f.key === sel.value) || {}).label || "");
            sel.onchange = lab;
            lab();
            u.$('[data-act="contrib"]', dEl).onclick = async () => {
              const t = u.$("[data-ct]", dEl).value.trim();
              if (!t) return;
              await ctx.gworkPush("contrib", { code: ctx.code, field: sel.value, text: t.slice(0, 600), t: L360.store.TS });
              u.$("[data-ct]", dEl).value = "";
              u.toast("Đã gửi cho Thư kí.", "ok");
            };
          }
          const pv = u.$('[data-live="draft"]', dEl);
          pv.innerHTML = it.fields.map((f) => `<div class="small" style="margin-bottom:6px"><b>${f.key}. ${u.esc(f.label)}:</b> ${u.esc(draft[f.key] || "…")}</div>`).join("");
        }
        if (!open) u.$$("textarea,select,button[data-act]", el).forEach((x) => (x.disabled = true));
      }
    },
    screen(el, ctx) {
      const s = ctx.step;
      const it = ctx.item;
      const d = ctx.data;
      const gws = (d.gwork && d.gwork[s.id]) || {};
      const fields = (it && it.fields) || [];
      el.innerHTML = `<p class="scr-sub">${u.esc((it && it.task) || s.instructions || "")}</p><div class="grid" style="grid-template-columns:repeat(${ctx.groups.length},minmax(0,1fr));gap:14px">${ctx.groups
        .map((g) => {
          const gw = gws[g.id] || {};
          const mem = ctx.joinedCodes.filter((c) => (d.roster[c] || {}).group === g.id);
          const sub = ctx.gsubs && ctx.gsubs[g.id];
          const filled = fields.filter((f) => (sub ? sub.v.fields[f.key] : (gw.draft || {})[f.key]));
          return `<div class="card" style="border-top:6px solid ${g.color}"><h2 style="color:${g.color}">${u.esc(g.name)}</h2>
            <p class="small">Thành viên: <b>${mem.length}</b> · Đã nhận vai: <b>${Object.keys(gw.roles || {}).length}</b></p>
            <p class="small">Thư kí: <b>${gw.sec ? u.esc(ctx.nameOf(gw.sec)) : "chưa có"}</b> · Đóng góp: <b>${Object.keys(gw.contrib || {}).length}</b></p>
            <div class="row" style="gap:6px">${fields.map((f) => `<span class="pill ${filled.includes(f) ? "ok" : ""}">${f.key}</span>`).join("")}</div>
            <p style="margin-top:10px">${sub ? `<span class="pill ok">✓ Đã nộp</span>` : `<span class="pill warn">Đang soạn</span>`}</p></div>`;
        })
        .join("")}</div>`;
    },
    host(el, ctx) {
      L360.types.groupwork.screen(el, ctx);
      const s = ctx.step;
      const gws = (ctx.data.gwork && ctx.data.gwork[s.id]) || {};
      el.insertAdjacentHTML(
        "beforeend",
        `<h3 style="margin-top:14px">Đổi Thư kí</h3><div class="row">${ctx.groups
          .map((g) => {
            const mem = ctx.joinedCodes.filter((c) => (ctx.data.roster[c] || {}).group === g.id);
            return `<label class="field small" style="min-width:140px">${u.esc(g.name)}<select data-sec="${g.id}"><option value="">–</option>${mem
              .map((c) => `<option ${(gws[g.id] || {}).sec === c ? "selected" : ""}>${c}</option>`)
              .join("")}</select></label>`;
          })
          .join("")}</div>`
      );
      u.$$("[data-sec]", el).forEach((sel) => (sel.onchange = () => sel.value && ctx.host.setSecretary(s.id, sel.dataset.sec, sel.value)));
    },
    controls(ctx) {
      const { host, state } = ctx;
      const c = [];
      if (state.phase === "observe") c.push({ label: "▶ Mở nhiệm vụ", cls: "primary", fn: () => host.open() });
      if (state.phase === "open")
        c.push({ label: "■ Khoá nộp bài", cls: "dark", fn: () => host.lock() }, { label: "+30 giây", fn: () => host.addTime(30) }, { label: "+1 phút", fn: () => host.addTime(60) });
      if (state.phase === "locked") c.push({ label: "↻ Mở lại", fn: () => host.reopen() });
      return c;
    }
  });

  /* ---------------- Triển lãm – nhận xét chéo ---------------- */
  const DEFAULT_CRIT = ["Nội dung chính xác", "Trình bày rõ ràng", "Có điểm mới, sáng tạo"];
  L360.registerType({
    type: "expo",
    label: "Triển lãm – nhận xét chéo",
    icon: "◩",
    desc: "Lần lượt chiếu hồ sơ của từng nhóm (mặc định 75 giây/nhóm); các bạn nhóm khác chấm 3 tiêu chí và đặt câu hỏi.",
    releaseOnEnter: false,
    fields: [
      { key: "source", label: "Lấy hồ sơ từ bước (id)", kind: "text", hint: "Để trống: nhiệm vụ nhóm gần nhất phía trước" },
      { key: "perGroupSec", label: "Giây cho mỗi nhóm", kind: "number" },
      { key: "criteria", label: "Tiêu chí chấm (1–5 sao)", kind: "list" },
      { key: "askQuestion", label: "Cho đặt câu hỏi", kind: "bool" }
    ],
    template: () => ({ type: "expo", title: "Triển lãm hồ sơ", minutes: 7, perGroupSec: 75, criteria: DEFAULT_CRIT.slice(), askQuestion: true }),
    normalize(s) {
      s.perGroupSec = Number(s.perGroupSec) || 75;
      s.criteria = s.criteria && s.criteria.length ? s.criteria : DEFAULT_CRIT.slice();
    },
    count: () => 0,
    subKey: (s, st) => `${s.id}__g${st.q || 0}`,
    keys: (s, meta) => ((meta && meta.groups) || []).map((g, i) => ({ key: `${s.id}__g${i}`, label: `${s.title} – ${g.name}` })),
    timerFor: (s) => s.perGroupSec,
    async onEnter(host, s) {
      const src = s.source ? host.pack.steps.find((x) => x.id === s.source) : host.pack.steps.slice(0, host.state.step).reverse().find((x) => x.type === "groupwork");
      if (!src) return;
      const gsubs = (host.data.gsubs && host.data.gsubs[src.id]) || {};
      const gws = (host.data.gwork && host.data.gwork[src.id]) || {};
      const out = { fields: src.fields, groups: {} };
      (host.meta.groups || []).forEach((g) => {
        const sub = gsubs[g.id];
        out.groups[g.id] = (sub && sub.v && sub.v.fields) || (gws[g.id] && gws[g.id].draft) || {};
      });
      await L360.store.set(`rooms/${host.room}/pub/expo/${s.id}`, out);
    },
    publicPayload: (s, st) => ({ g: st.q || 0, criteria: s.criteria, askQuestion: !!s.askQuestion }),
    answerPayload: () => null,
    describe: (s, key, v) => (v ? `${(v.scores || []).join("/")}${v.q ? ` | Hỏi: ${v.q}` : ""}` : ""),
    student: {
      render(el, ctx) {
        const st = ctx.state;
        const expo = ctx.expo || { groups: {}, fields: [] };
        if (st.phase === "observe") {
          el.innerHTML = ui.wait("Triển lãm sắp bắt đầu", "Các nhóm lần lượt báo cáo. Em chấm nhóm bạn theo 3 tiêu chí.");
          return;
        }
        const g = ctx.groups[st.q || 0];
        const dossier = expo.groups[g.id] || {};
        const card = `<div class="card" style="border-top:6px solid ${g.color};margin-bottom:14px"><h2 style="color:${g.color}">${u.esc(g.name)}</h2>${(expo.fields || [])
          .map((f) => `<p><b>${f.key}. ${u.esc(f.label)}:</b> ${u.rich(dossier[f.key] || "…")}</p>`)
          .join("")}</div>`;
        if (ctx.group && ctx.group.id === g.id) {
          el.innerHTML = card + ui.wait("Nhóm em đang báo cáo", "Các bạn nhóm khác đang chấm và đặt câu hỏi.");
          return;
        }
        if (ctx.sub || st.phase !== "open") {
          el.innerHTML = card + (ctx.sub ? ui.done("Đã gửi nhận xét", "Chờ nhóm tiếp theo.") : ui.wait("Đã hết lượt chấm nhóm này"));
          return;
        }
        const it = ctx.item;
        if (!it) {
          el.innerHTML = card + ui.wait("Chuẩn bị nhận xét", "Lắng nghe nhóm bạn báo cáo.");
          return;
        }
        const sc = it.criteria.map(() => 0);
        const draw = () => {
          el.innerHTML =
            card +
            `<div class="card"><div class="row"><b>Nhận xét ${u.esc(g.name)}</b><span class="spacer"></span>${ui.timer()}</div>${it.criteria
              .map(
                (c, i) => `<p style="margin:12px 0 6px;font-weight:650">${u.esc(c)}</p><div class="chips">${[1, 2, 3, 4, 5]
                  .map((n) => `<button class="chip ${sc[i] >= n ? "sel" : ""}" data-s="${i}" data-n="${n}">${n}★</button>`)
                  .join("")}</div>`
              )
              .join("")}
            ${it.askQuestion ? `<label class="field" style="margin-top:12px">Câu hỏi cho nhóm bạn (không bắt buộc)<input type="text" id="q" maxlength="160"></label>` : ""}
            <button class="btn primary lg block" style="margin-top:14px" data-send>Gửi nhận xét</button></div>`;
          u.$$("[data-s]", el).forEach((b) => (b.onclick = () => ((sc[Number(b.dataset.s)] = Number(b.dataset.n)), draw())));
          u.$("[data-send]", el).onclick = () => {
            if (sc.some((x) => !x)) return u.toast("Chấm đủ các tiêu chí.", "bad");
            const v = { scores: sc.slice() };
            const q = u.$("#q", el);
            if (q && q.value.trim()) v.q = q.value.trim();
            ctx.submit(v);
          };
        };
        draw();
      }
    },
    screen(el, ctx) {
      const st = ctx.state;
      const s = ctx.step;
      const expo = (ctx.data.pub && ctx.data.pub.expo && ctx.data.pub.expo[s.id]) || { groups: {}, fields: [] };
      if (st.phase === "observe") {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">Triển lãm hồ sơ</h1><p class="muted" style="font-size:1.4rem">${ctx.groups.length} nhóm lần lượt báo cáo · các bạn nhóm khác chấm theo tiêu chí</p></div>`;
        return;
      }
      const g = ctx.groups[st.q || 0];
      const dossier = expo.groups[g.id] || {};
      const subs = u.vals(ctx.subs);
      const crit = (ctx.item && ctx.item.criteria) || DEFAULT_CRIT;
      el.innerHTML = `<div class="grid" style="grid-template-columns:2fr 1fr;gap:24px;height:100%">
        <div class="card" style="border-top:8px solid ${g.color};font-size:1.25rem"><h1 style="color:${g.color}">${u.esc(g.name)}</h1>${(expo.fields || [])
          .map((f) => `<p><b>${f.key}. ${u.esc(f.label)}:</b> ${u.rich(dossier[f.key] || "…")}</p>`)
          .join("")}</div>
        <div><h3>Nhận xét của các bạn (${subs.length})</h3>${crit
          .map((c, i) => `<p style="margin:6px 0">${u.esc(c)}: <b>${subs.length ? u.round1(u.avg(subs.map((x) => x.v.scores[i]))) : "–"}</b>/5</p>`)
          .join("")}${subs
          .filter((x) => x.v.q)
          .slice(-4)
          .map((x) => `<blockquote class="scr-feat" style="font-size:1rem">${u.esc(x.v.q)}</blockquote>`)
          .join("")}</div></div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const d = ctx.data;
      el.innerHTML = `<table class="t"><tr><th>Nhóm</th>${s.criteria.map((c) => `<th class="num">${u.esc(c)}</th>`).join("")}<th class="num">Lượt</th></tr>${ctx.groups
        .map((g, i) => {
          const subs = u.vals(d.subs && d.subs[`${s.id}__g${i}`]);
          return `<tr><td>${ui.gbadge(g)}</td>${s.criteria.map((c, k) => `<td class="num">${subs.length ? u.round1(u.avg(subs.map((x) => x.v.scores[k]))) : "–"}</td>`).join("")}<td class="num">${subs.length}</td></tr>`;
        })
        .join("")}</table>`;
    },
    controls(ctx) {
      const { host, state, groups } = ctx;
      const q = state.q || 0;
      const c = [];
      if (state.phase === "observe") c.push({ label: "Mời nhóm đầu tiên ›", cls: "primary", fn: () => host.setQ(0, true) });
      else {
        if (q < groups.length - 1) c.push({ label: `Nhóm tiếp theo (${groups[q + 1].name}) ›`, cls: "primary", fn: () => host.setQ(q + 1, true) });
        else if (state.phase === "open") c.push({ label: "Kết thúc triển lãm", cls: "dark", fn: () => host.lock() });
        if (state.phase === "open") c.push({ label: "+30 giây", fn: () => host.addTime(30) });
      }
      return c;
    }
  });

  /* ---------------- Lựa chọn của nhóm / đấu giá ---------------- */
  L360.registerType({
    type: "auction",
    label: "Lựa chọn của nhóm (đấu giá)",
    icon: "⚖",
    desc: "Mỗi nhóm chọn 1 mục (di sản, phương án, giả thuyết…), đặt mức ưu tiên/giá trong ngân sách và nêu lí do; giáo viên trao quyền cho nhóm thuyết phục nhất.",
    groupMode: true,
    fields: [
      { key: "question", label: "Yêu cầu", kind: "textarea" },
      { key: "items", label: "Các mục để chọn (JSON nâng cao)", kind: "json", hint: '[{"title":"…","text":"…","image":"","credit":""}]' },
      { key: "budget", label: "Ngân sách tối đa", kind: "number" },
      { key: "min", label: "Mức tối thiểu", kind: "number" },
      { key: "stepBy", label: "Bước giá", kind: "number" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "auction",
      title: "Phiên đấu giá",
      minutes: 5,
      question: "Nhóm em chọn mục nào? Đặt giá và nêu lí do.",
      items: [{ title: "Mục 1", text: "" }, { title: "Mục 2", text: "" }, { title: "Mục 3", text: "" }],
      budget: 100,
      min: 10,
      stepBy: 5,
      timer: 120
    }),
    normalize(s) {
      s.items = (s.items || []).map((x) => (typeof x === "string" ? { title: x } : x));
      s.budget = Number(s.budget) || 100;
      s.min = Number(s.min) || 10;
      s.stepBy = Number(s.stepBy) || 5;
    },
    validate(s, err) {
      if (!s.items || s.items.length < 2) err("Cần ít nhất 2 mục để chọn.");
    },
    keys: (s) => [{ key: s.id, label: s.title }],
    publicPayload: (s) => ({ question: s.question || "", items: s.items, budget: s.budget, min: s.min, stepBy: s.stepBy }),
    answerPayload: () => null,
    describe: (s, key, v) => (v ? `${(s.items[v.item] || {}).title || ""} – ${v.amount} – ${v.reason || ""}` : ""),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        const st = ctx.state;
        const cur = ctx.gsub && ctx.gsub.v;
        let item = cur ? cur.item : null;
        let amount = cur ? cur.amount : it.min;
        const award = ctx.awards && ctx.awards[ctx.step.id];
        const cards = (sel, dis) =>
          `<div class="grid g2" style="gap:10px">${it.items
            .map(
              (x, i) => `<button class="opt ${sel === i ? "sel" : ""}" data-i="${i}" ${dis ? "disabled" : ""} style="flex-direction:column;align-items:stretch">${
                x.image ? `<img src="${u.esc(x.image)}" alt="" style="height:110px;object-fit:cover;border-radius:10px">` : ""
              }<b>${u.esc(x.title)}</b>${x.text ? `<span class="small muted">${u.esc(x.text)}</span>` : ""}</button>`
            )
            .join("")}</div>`;
        if (st.phase !== "open") {
          el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2>${cards(item, true)}${
            cur ? `<p style="margin-top:12px">Nhóm em: <b>${u.esc(it.items[cur.item].title)}</b> · ${cur.amount} · ${u.esc(cur.reason || "")}</p>` : `<p class="muted">Nhóm em chưa gửi lựa chọn.</p>`
          }${award ? `<p class="pill ${award === (ctx.group || {}).id ? "ok" : ""}" style="margin-top:8px">Quyền giới thiệu: ${u.esc((ctx.groups.find((g) => g.id === award) || {}).name || "")}</p>` : ""}</div>`;
          return;
        }
        const draw = () => {
          const reason = u.$("#rs", el) ? u.$("#rs", el).value : cur ? cur.reason : "";
          el.innerHTML = `<div class="card"><div class="row">${ui.gbadge(ctx.group)}<span class="pill accent">Đại diện nhóm gửi</span><span class="spacer"></span>${ui.timer()}</div>
            <h2 style="margin-top:12px">${u.rich(it.question)}</h2>${cards(item)}
            <label class="field" style="margin-top:14px">Mức giá (${it.min}–${it.budget})<input type="range" id="am" min="${it.min}" max="${it.budget}" step="${it.stepBy}" value="${amount}"><b style="font-size:1.4rem" id="amv">${amount}</b></label>
            <label class="field" style="margin-top:10px">Lí do của nhóm (bắt buộc)<textarea id="rs" rows="2">${u.esc(reason || "")}</textarea></label>
            <button class="btn primary lg block" style="margin-top:12px" data-send>${cur ? "Cập nhật lựa chọn của nhóm" : "Gửi lựa chọn của nhóm"}</button>
            <div data-live="gs" class="small" style="margin-top:10px"></div></div>`;
          u.$$("[data-i]", el).forEach((b) => (b.onclick = () => ((item = Number(b.dataset.i)), draw())));
          u.$("#am", el).oninput = (e) => ((amount = Number(e.target.value)), (u.$("#amv", el).textContent = amount));
          u.$("[data-send]", el).onclick = () => {
            const rs = u.$("#rs", el).value.trim();
            if (item == null) return u.toast("Chọn một mục.", "bad");
            if (!rs) return u.toast("Nhóm cần nêu lí do.", "bad");
            ctx.gsubmit({ item, amount, reason: rs.slice(0, 300) });
            u.toast("Đã gửi cho cả nhóm.", "ok");
          };
          L360.types.auction.student.update(el, ctx);
        };
        draw();
      },
      update(el, ctx) {
        const box = u.$('[data-live="gs"]', el);
        const cur = ctx.gsub && ctx.gsub.v;
        const it = ctx.item || {};
        if (box)
          box.innerHTML = cur
            ? `<span class="pill ok">Nhóm đã gửi</span> ${u.esc(it.items[cur.item].title)} · ${cur.amount} · bởi ${u.esc(ctx.nameOf(ctx.gsub.by))}`
            : `<span class="muted">Nhóm chưa gửi.</span>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      const s = ctx.step;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(s.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "")}</p></div>`;
        return;
      }
      const award = ctx.data.pub && ctx.data.pub.awards && ctx.data.pub.awards[s.id];
      const bids = ctx.gsubs || {};
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1><div class="grid" style="grid-template-columns:repeat(${Math.min(it.items.length, 5)},minmax(0,1fr));gap:14px">${it.items
        .map((x, i) => {
          const on = ctx.groups.filter((g) => bids[g.id] && bids[g.id].v.item === i);
          return `<div class="card" style="padding:14px">${x.image ? `<img src="${u.esc(x.image)}" alt="" style="height:120px;width:100%;object-fit:cover;border-radius:10px">` : ""}<h3 style="margin-top:8px">${u.esc(
            x.title
          )}</h3><div class="col" style="gap:6px">${on
            .map(
              (g) =>
                `<div class="row nowrap" style="gap:6px">${ui.gbadge(g)}<b>${bids[g.id].v.amount}</b>${award === g.id ? `<span class="pill ok">Quyền giới thiệu</span>` : ""}</div>${
                  ctx.state.phase !== "open" ? `<div class="small muted">${u.esc(bids[g.id].v.reason || "")}</div>` : ""
                }`
            )
            .join("")}</div></div>`;
        })
        .join("")}</div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const bids = ctx.gsubs || {};
      const award = ctx.data.pub && ctx.data.pub.awards && ctx.data.pub.awards[s.id];
      el.innerHTML = `<table class="t"><tr><th>Nhóm</th><th>Chọn</th><th class="num">Giá</th><th>Lí do</th><th></th></tr>${ctx.groups
        .map((g) => {
          const b = bids[g.id] && bids[g.id].v;
          return `<tr><td>${ui.gbadge(g)}</td><td>${b ? u.esc(s.items[b.item].title) : "–"}</td><td class="num">${b ? b.amount : ""}</td><td class="small">${b ? u.esc(b.reason) : ""}</td>
            <td><button class="btn sm ${award === g.id ? "ok" : ""}" data-aw="${g.id}">${award === g.id ? "✓ Đã trao" : "Trao quyền"}</button></td></tr>`;
        })
        .join("")}</table>`;
      u.$$("[data-aw]", el).forEach((b) => (b.onclick = () => ctx.host.award(s.id, b.dataset.aw)));
    }
  });
})();

/* js/activities/explore.js */
/* EXPLORE – Di sản 360: nhiệm vụ khám phá di tích qua ứng dụng Heritage Lens – Kinh Bắc Ký Sự.
   Học sinh mở đúng trang di tích (quét QR hoặc bấm nút), đọc/nghe thuyết minh, rồi trả lời nhiệm vụ. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const SITES = window.L360_HERITAGE || [];
  const base = () => (L360.cfg.heritageLensUrl || "").replace(/\/?$/, "/");
  const siteUrl = (s) => (s.url ? s.url : s.siteId ? `${base()}#/site/${s.siteId}` : base());
  const siteName = (s) => s.siteName || (SITES.find((x) => x.id === s.siteId) || {}).name || "Heritage Lens – Kinh Bắc Ký Sự";

  L360.registerType({
    type: "explore",
    label: "Khám phá di sản (Heritage Lens)",
    icon: "⌖",
    desc: "Mở trang di tích trong ứng dụng Heritage Lens (31 di tích Kinh Bắc, có thuyết minh, ảnh, câu đố), rồi hoàn thành nhiệm vụ: trả lời ngắn hoặc trắc nghiệm.",
    releaseOnEnter: true,
    fields: [
      { key: "siteId", label: "Di tích", kind: "site" },
      { key: "url", label: "Hoặc đường dẫn khác", kind: "text", hint: "Để trống để dùng trang di tích trong Heritage Lens" },
      { key: "mission", label: "Nhiệm vụ khám phá", kind: "textarea" },
      { key: "answerType", label: "Kiểu trả lời", kind: "select", options: [["text", "Viết ngắn"], ["choice", "Trắc nghiệm"]] },
      { key: "options", label: "Phương án (nếu trắc nghiệm)", kind: "options" },
      { key: "maxWords", label: "Giới hạn từ (nếu viết)", kind: "number" },
      { key: "explain", label: "Giải thích / kết luận sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "explore",
      title: "Khám phá di sản",
      minutes: 6,
      siteId: "phat-tich",
      mission: "Mở trang di tích, nghe thuyết minh và cho biết một chi tiết chứng tỏ giá trị lịch sử của di tích.",
      answerType: "text",
      maxWords: 40,
      timer: 300
    }),
    normalize(s) {
      s.answerType = s.answerType === "choice" ? "choice" : "text";
      s.maxWords = Number(s.maxWords) || 40;
      if (s.answerType === "choice") s.options = s.options || [];
    },
    validate(s, err, warn) {
      if (!s.mission) err("Chưa có nhiệm vụ.");
      if (s.siteId && !SITES.find((x) => x.id === s.siteId)) warn(`Không thấy di tích "${s.siteId}" trong danh sách Heritage Lens.`);
      if (s.answerType === "choice" && (!s.options || s.options.length < 2)) err("Trắc nghiệm cần ít nhất 2 phương án.");
    },
    publicPayload: (s) => ({
      siteId: s.siteId || "",
      siteName: siteName(s),
      url: siteUrl(s),
      mission: s.mission,
      answerType: s.answerType,
      options: s.answerType === "choice" ? s.options : null,
      maxWords: s.maxWords
    }),
    answerPayload: (s) => ({ answer: s.answerType === "choice" ? s.answer : null, explain: s.explain || "" }),
    isCorrect: (s, key, v) => (s.answerType === "choice" && s.answer != null ? (v && v.choice) === s.answer : null),
    describe: (s, key, v) => (v ? (v.choice != null ? u.letter(v.choice) : v.text || "") : ""),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        const st = ctx.state;
        const v = ctx.sub && ctx.sub.v;
        const ans = ctx.answer;
        const head = `<div class="card" style="border-top:6px solid var(--accent)"><div class="row"><span class="pill accent">Di sản 360</span><span class="spacer"></span>${
          st.phase === "open" ? ui.timer() : ""
        }</div><h2 style="margin-top:10px">${u.esc(it.siteName)}</h2>
          <a class="btn primary block" href="${u.esc(it.url)}" target="_blank" rel="noopener">Mở Heritage Lens ↗</a>
          <p class="small muted" style="margin-top:6px">Đọc, nghe thuyết minh, xem ảnh và làm câu đố của di tích, rồi quay lại trang này.</p>
          <div class="card flat" style="margin-top:12px;background:var(--paper)"><b>Nhiệm vụ.</b> ${u.rich(it.mission)}</div></div>`;
        if (st.phase !== "open" || (v && !el._editing)) {
          let res = "";
          if (v)
            res = it.answerType === "choice" ? ui.options(it.options, { selected: v.choice, answer: ans ? ans.answer : null, mine: v.choice, disabled: true }) : `<div class="card flat">${u.rich(v.text)}</div>`;
          el.innerHTML =
            head +
            `<div class="card" style="margin-top:12px">${v ? `<div class="small muted">Câu trả lời của em</div>${res}` : st.phase === "observe" ? `<p class="muted">Giáo viên sẽ mở phần trả lời sau khi cả lớp khám phá.</p>` : `<p class="muted">Em chưa trả lời.</p>`}
            ${ans && ans.explain ? `<div class="card flat" style="margin-top:10px;border-color:var(--accent)">${ui.md(ans.explain)}</div>` : ""}
            ${v && st.phase === "open" ? `<button class="btn sm" data-edit style="margin-top:10px">Sửa câu trả lời</button>` : ""}</div>`;
          const e = u.$("[data-edit]", el);
          if (e) e.onclick = () => ((el._editing = true), L360.types.explore.student.render(el, ctx));
          return;
        }
        let sel = v && v.choice != null ? v.choice : null;
        const draw = () => {
          el.innerHTML =
            head +
            `<div class="card" style="margin-top:12px">${
              it.answerType === "choice" ? ui.options(it.options, { selected: sel }) : ui.textarea("ta", { value: (v && v.text) || "", max: it.maxWords, rows: 4 })
            }<button class="btn primary lg block" style="margin-top:12px" data-send>Gửi</button></div>`;
          ui.bindWordCount(el);
          u.$$("[data-opt]", el).forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.opt)), draw())));
          u.$("[data-send]", el).onclick = () => {
            el._editing = false;
            if (it.answerType === "choice") {
              if (sel == null) return u.toast("Chọn một phương án.", "bad");
              return ctx.submit({ choice: sel });
            }
            const t = u.$("#ta", el).value.trim();
            if (!t) return u.toast("Hãy viết câu trả lời.", "bad");
            if (u.words(t) > it.maxWords) return u.toast(`Tối đa ${it.maxWords} từ.`, "bad");
            ctx.submit({ text: t });
          };
        };
        draw();
      }
    },
    screen(el, ctx) {
      const it = ctx.item || {};
      const subs = u.vals(ctx.subs);
      const ans = ctx.answer;
      let live = "";
      if (ctx.mode === "live" || ctx.state.phase !== "open") {
        if (it.answerType === "choice") {
          const c = (it.options || []).map(() => 0);
          subs.forEach((s) => s.v && c[s.v.choice] != null && c[s.v.choice]++);
          live = ui.bars((it.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: c[i], correct: ans && ans.answer === i })), { total: subs.length || 1 });
        } else live = ui.cloud(subs.map((s) => s.v && s.v.text));
      }
      el.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr) 340px;gap:28px;align-items:start">
        <div><div class="pill accent" style="font-size:1rem">Di sản 360 · Heritage Lens</div><h1 class="scr-q">${u.esc(it.siteName)}</h1>
        <div class="scr-explain" style="margin-top:0"><b>Nhiệm vụ.</b> ${u.rich(it.mission)}</div>${live}
        ${ans && ans.explain ? `<div class="scr-explain">${ui.md(ans.explain)}</div>` : ""}</div>
        <div class="card center"><div style="background:#fff;padding:8px;border-radius:12px">${u.qr(it.url || base(), 6)}</div><p class="small muted" style="margin-top:8px;word-break:break-all">${u.esc(it.url || "")}</p></div></div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const subs = u.entries(ctx.subs);
      el.innerHTML = `<p class="small"><a href="${u.esc(siteUrl(s))}" target="_blank" rel="noopener">${u.esc(siteName(s))} ↗</a></p>${
        subs.length
          ? subs
              .map(([c, x]) => `<div class="small" style="border-bottom:1px solid var(--line);padding:6px 0"><b>${c}</b>: ${u.esc(L360.types.explore.describe(s, s.id, x.v))}</div>`)
              .join("")
          : `<p class="muted small">Chưa có câu trả lời.</p>`
      }`;
    }
  });
  L360.heritage = { SITES, siteUrl, siteName, base };
})();
