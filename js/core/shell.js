/* Khung trang dùng chung: thanh tiêu đề (logo, điều hướng, tài khoản), nhãn chế độ, chân trang. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const cfg = L360.cfg;
  const NAV = [
    ["thuvien", "thuvien.html", "Thư viện", "grid"],
    ["studio", "studio.html", "Soạn bài", "spark"],
    ["day", "giaovien.html", "Dạy học", "play"],
    ["ppct", "ppct.html", "Phụ lục 1", "layers"],
    ["baogiang", "baogiang.html", "Báo giảng", "doc"],
    ["dulieu", "insight.html", "Dữ liệu", "chart"],
    ["tiendo", "tiendo.html", "Tiến độ", "trophy"]
  ];
  const dt = () => (/che-do=dien-tap/.test(location.search) ? "?che-do=dien-tap" : "");
  L360.shell = {
    topbar(right = "", { sub, nav } = {}) {
      return `<header class="topbar no-print">
        <a class="brand" href="index.html${dt()}" title="Trang chủ Lesson 360° Studio">
          <img class="mark" src="assets/img/logo-l360.svg" alt="">
          <span class="brand-name">Lesson 360° <em>Studio</em><small class="ellipsis" style="max-width:340px">${u.esc(sub || cfg.tagline || "")}</small></span>
        </a>
        <nav class="nav">${NAV.map(([id, href, label, ic]) => `<a href="${href}${dt()}" class="${nav === id ? "on" : ""}" title="${label}">${L360.icon(ic)}<span class="nl">${label}</span></a>`).join("")}</nav>
        <span class="spacer"></span>${right}
        <img class="hsh" src="assets/img/logo-hsh-muc.png" alt="Học Sử Hữu Hiệu">
      </header>`;
    },
    theme(t) {
      const r = document.documentElement.style;
      if (t && t.accent) {
        r.setProperty("--accent", t.accent);
        r.setProperty("--accent-2", t.accent2 || t.accent);
      }
    },
    modeBadge() {
      if (!L360.isLocal) return "";
      return `<span class="pill ${L360.isLocal ? "warn" : "ok"}" title="${
        L360.isLocal ? "Chế độ Diễn tập: chỉ đồng bộ giữa các tab trên cùng máy." : "Đồng bộ thời gian thực qua Firebase."
      }"><span class="dot"></span>${u.esc(L360.modeLabel)}</span>`;
    },
    // Nút tài khoản: tên, vai trò, đăng xuất.
    userMenu(t) {
      if (!t) return "";
      const role = t.role === "admin" ? "Quản trị" : t.role === "tt" ? "Tổ trưởng" : "Giáo viên";
      return `<button class="btn sm ghost umenu" id="umenu" title="Tài khoản & quản trị">${L360.shell.avatar(t, 28)}<span class="ellipsis" style="max-width:150px">${u.esc(t.name || t.email || "")}</span><span class="pill">${role}</span></button>`;
    },
    // Ảnh đại diện: ảnh tải lên, biểu tượng chọn sẵn, hoặc chữ cái đầu của tên.
    avatar(t, size = 32) {
      const a = (t && t.avatar) || "";
      const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px`;
      if (/^data:image\//.test(a)) return `<img class="avt" src="${a}" alt="" style="${st}">`;
      const m = a.match(/^(\S+)\|(#[0-9a-f]{6})$/i);
      if (m) return `<span class="avt" style="${st};background:${m[2]};font-size:${Math.round(size * 0.55)}px">${u.esc(m[1])}</span>`;
      const ini = String((t && t.name) || "?").trim().split(/\s+/).slice(-1)[0].charAt(0).toUpperCase();
      return `<span class="avt" style="${st}">${u.esc(ini)}</span>`;
    },
    bindUserMenu(t) {
      const b = u.$("#umenu");
      if (!b) return;
      b.onclick = () => {
        const m = u.modal(`<div class="row" style="gap:12px">${L360.shell.avatar(t, 56)}<h2 style="margin:0">${u.esc(t.name || "")}</h2></div><p class="muted">${u.esc(t.email || "")}${t.subjects && t.subjects.length ? " · " + u.esc(t.subjects.map((s) => L360.Curr.subjectName(s)).join(", ")) : ""}</p>
          <div class="col"><a class="btn" href="taikhoan.html${dt()}">${L360.icon("user")} Hồ sơ & quản trị</a><a class="btn" href="insight.html${dt()}">${L360.icon("chart")} Dữ liệu của tôi</a>
          <button class="btn" id="lo">${L360.icon("logout")} Đăng xuất</button></div>`);
        u.$("#lo", m.el).onclick = () => L360.Auth.signOut();
      };
    },
    footer() {
      return `<footer class="wrap no-print small muted" style="padding-top:0">${u.esc(cfg.school)} · ${u.esc(cfg.unit)} · Tác giả: ${u.esc(cfg.author)} · Lesson 360° Studio – sản phẩm dự thi AI Educamp 2027 “Trường học số”</footer>`;
    }
  };
})();
