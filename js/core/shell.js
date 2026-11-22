/* Khung trang dùng chung: thanh tiêu đề, chủ đề màu theo gói bài học, chân trang. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const cfg = L360.cfg;
  L360.shell = {
    topbar(right = "", { sub } = {}) {
      return `<header class="topbar no-print">
        <a class="brand" href="index.html" title="Trang chủ Lesson 360° Studio">
          <span class="brand-mark">360°</span>
          <span class="brand-name">Lesson 360° Studio<small>${u.esc(sub || cfg.tagline || "")}</small></span>
        </a><span class="spacer"></span>${right}
        <img class="hsh" src="assets/img/logo-hsh-muc.png" alt="Học Sử Hữu Hiệu">
      </header>`;
    },
    theme(t) {
      const r = document.documentElement.style;
      if (t && t.accent) {
        r.setProperty("--accent", t.accent);
        r.setProperty("--accent-2", t.accent2 || t.accent);
      }
      if (t && t.bg) r.setProperty("--bg", t.bg);
      if (t && t.font) r.setProperty("--font-display", t.font);
    },
    modeBadge() {
      return `<span class="pill ${L360.isLocal ? "warn" : "ok"}" title="${
        L360.isLocal ? "Chưa cấu hình Firebase hoặc đang ép chế độ Diễn tập: chỉ đồng bộ giữa các tab trên cùng máy." : "Đồng bộ thời gian thực qua Firebase."
      }"><span class="dot"></span>${u.esc(L360.modeLabel)}</span>`;
    },
    footer() {
      return `<footer class="wrap no-print small muted" style="padding-top:0">${u.esc(cfg.school)} · ${u.esc(cfg.unit)} · Tác giả: ${u.esc(cfg.author)} · Sản phẩm dự thi AI Educamp 2027 – Trường học số</footer>`;
    }
  };
})();
