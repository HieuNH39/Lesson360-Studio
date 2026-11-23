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
  u.downloadBlob = (name, blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  };
  // Tải thư viện lớn (docx, pptxgenjs) khi cần.
  const loaded = {};
  u.loadScript = (src) =>
    loaded[src] ||
    (loaded[src] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => res();
      s.onerror = () => {
        delete loaded[src];
        rej(new Error("Không tải được " + src));
      };
      document.head.appendChild(s);
    }));
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
  u.modal = (innerHtml, { onClose, wide } = {}) => {
    const bg = u.html(`<div class="modal-bg"><div class="modal ${wide ? "wide" : ""}">${innerHtml}</div></div>`);
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
