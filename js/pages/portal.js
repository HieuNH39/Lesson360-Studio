/* Trang chủ Lesson 360° Studio (v2). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const C = L360.Curr;
  const app = u.$("#app");
  const dt = /che-do=dien-tap/.test(location.search) ? "che-do=dien-tap" : "";
  const q = (s) => (dt ? (s.includes("?") ? s + "&" + dt : s + "?" + dt) : s);
  const packs = L360.Local.samples();
  const ic = (n) => L360.icon(n);
  const pillars = [
    ["spark", "Soạn bài cùng AI", "Chọn bài trong SGK, tích 12–15 hoạt động, trợ lý AI dựng tiết học trực quan. Xuất luôn giáo án Word theo CV 5512 có năng lực số và PowerPoint 20–40 trang.", "studio.html?tab=tao", "Tạo tiết mới"],
    ["doc", "Giáo án (Phụ lục 4)", "Trợ lý AI soạn giáo án đúng mẫu của tổ theo Phụ lục 1, hoặc chuyển giáo án Word có sẵn; tải ngay Word, PDF và PowerPoint giảng dạy dùng offline.", "giaoan.html", "Soạn giáo án"],
    ["play", "Lớp học 360", "Giáo viên điều khiển; học sinh làm trên laptop/iPad; màn chiếu hiện ảnh, sơ đồ, kết quả cả lớp, đồng hồ có âm thanh, gọi tên ngẫu nhiên, vở ghi tự động.", "giaovien.html", "Mở tiết học"],
    ["grid", "Thư viện trường", "Theo môn → đủ bài SGK từ bài 1 → các tiết thầy cô đã soạn kèm tên người tạo. Mở SGK đúng trang; Lịch sử 6–9 có sẵn video EduHistory.", "thuvien.html", "Vào thư viện"],
    ["chart", "Dữ liệu 360", "Mỗi tiết tự sinh minh chứng: tỉ lệ tham gia, mức hiểu bài, câu học sinh sai nhiều. Tổ trưởng xem cả tổ và ghi phiếu nhận xét tiết dạy.", "insight.html", "Xem dữ liệu"]
  ];
  const steps = [
    ["1", "Chọn bài SGK", "Thư viện có mục lục Bộ SGK thống nhất lớp 6–12 và tài liệu GDĐP"],
    ["2", "Tích hoạt động", "12–15 lựa chọn: ô chữ, video có câu hỏi, Đúng/Sai 4 ý, nhiệm vụ nhóm…"],
    ["3", "Trợ lý AI dựng tiết", "Claude/ChatGPT/Gemini trả về gói bài học; Studio kiểm tra, tự tìm ảnh mở"],
    ["4", "Giáo viên duyệt", "Sửa trực quan từng trang; xuất Word, PowerPoint, phiếu học tập"],
    ["5", "Dạy & lưu minh chứng", "Học sinh tương tác trên máy; số liệu tự lưu cho giáo viên và tổ trưởng"]
  ];
  app.innerHTML =
    L360.shell.topbar(`${L360.shell.modeBadge()}<a class="btn sm primary" href="${q("studio.html")}">${ic("spark")} Soạn bài</a><span id="ptAcc"><a class="btn sm ghost" href="${q("taikhoan.html")}">${ic("user")} Đăng nhập</a></span>`, { nav: "" }) +
    `<main class="wrap">
    <section class="pt-hero">
      <div><div class="row nowrap pt-brand"><img src="assets/img/logo-l360.svg" alt="" class="pt-logo"><div><h1 class="pt-h1">Lesson 360° <span>Studio</span></h1>
        <p class="pt-sub">Xưởng AI kiến tạo bài học số từ giáo án</p></div></div>
        <div class="row" style="margin-top:26px"><a class="btn primary lg" href="${q("studio.html?tab=tao")}">${ic("spark")} Tạo tiết học từ SGK</a><a class="btn lg" href="${q("giaoan.html")}">${ic("doc")} Soạn giáo án (PL4)</a></div></div>
      <div class="card pt-join"><div class="row"><span class="pt-ji">${ic("users")}</span><div><h2 style="font-size:1.2rem;margin:0">Học sinh vào lớp</h2><p class="small muted" style="margin:0">Nhập mã phòng trên màn chiếu · laptop hoặc iPad</p></div></div>
        <div class="row nowrap" style="margin-top:12px"><input id="rc" type="text" placeholder="MÃ PHÒNG" autocomplete="off" style="text-transform:uppercase;font-weight:800;letter-spacing:.12em;font-size:1.25rem"><button class="btn primary lg" id="go">Vào</button></div>
        <p class="tiny muted" style="margin:10px 0 0">Không cần tài khoản. Học sinh chỉ nhập tên hiển thị; không thu thập email, số điện thoại.</p></div>
    </section>
    <section class="pt-pils">${pillars
      .map(
        ([i, n, d, href, cta]) => `<article class="card pt-pil"><span class="pt-pi">${ic(i)}</span><h3 style="margin:6px 0 0">${n}</h3><p class="small muted" style="margin:0">${d}</p><a class="btn sm" style="margin-top:auto" href="${q(href)}">${cta} ›</a></article>`
      )
      .join("")}</section>
    <section class="card" style="margin-top:22px"><h2>Môn học của tổ Khoa học xã hội</h2><p class="small muted">Lớp 6–12 theo Bộ SGK thống nhất; Giáo dục địa phương gộp tài liệu tỉnh Bắc Giang và tỉnh Bắc Ninh. Các môn khác là hướng mở rộng.</p>
      <div class="pt-subj">${C.subjects
        .map((s) => `<a class="pt-s" href="${q("thuvien.html?mon=" + s.id)}" style="--c:${s.color}"><span>${ic(s.icon)}</span><b>${u.esc(s.name)}</b><small>${s.levels.map((l) => (l === "thcs" ? "THCS" : "THPT")).join(" · ")}</small></a>`)
        .join("")}</div></section>
    <section class="card" style="margin-top:22px"><h2>Cách hoạt động</h2>
      <div class="pt-steps">${steps.map(([n, t, d]) => `<div class="pt-st"><span>${n}</span><b>${t}</b><p class="small muted">${d}</p></div>`).join("")}</div></section>
    ${
      packs.length
        ? `<section class="card" style="margin-top:22px"><h2>Tiết học mẫu – dạy thử ngay</h2><div class="grid g3">${packs
            .map((p) => {
              const sm = L360.Pack.summary(p);
              return `<div class="lib-card">${L360.Design.preview(p.design.style, p.design.palette, L360.Pack.label(p) || "Tiết mẫu")}<div style="margin-top:8px"><div class="small muted">${u.esc(C.subjectName(p.subjectId, p.grade) || p.subject)}${p.grade ? " · Lớp " + u.esc(p.grade) : ""}</div><b class="clamp2">${u.esc(p.title)}</b>
                <p class="small muted" style="margin:4px 0 8px">${sm.steps} hoạt động · ${sm.minutes} phút</p></div><div class="row" style="gap:6px"><a class="btn sm primary" href="giaovien.html?pack=${encodeURIComponent(p.id)}">${ic("play")} Dạy thử</a></div></div>`;
            })
            .join("")}</div></section>`
        : ""
    }
    <section class="card" style="margin-top:22px"><h2>Minh bạch về AI</h2>
      <ul class="small">
      <li>Lời nhắc của Studio dùng được với Claude, ChatGPT hoặc Gemini; nội dung do AI tạo luôn được giáo viên kiểm tra trước khi dạy. Studio yêu cầu AI không bịa số liệu, năm tháng, trích dẫn.</li>
      <li>Học sinh không trò chuyện với AI trong giờ học; dữ liệu tiết học chỉ giáo viên dạy và tổ trưởng xem được.</li>
      <li>Ảnh minh hoạ lấy từ Wikipedia/Wikimedia Commons (giấy phép mở) và ghi nguồn dưới ảnh.</li></ul></section>
    </main>` +
    L360.shell.footer();
  const go = () => {
    const r = u.$("#rc").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (r) location.href = `hocsinh.html?phong=${r}`;
  };
  u.$("#go").onclick = go;
  // Tài khoản đang đăng nhập: hiện ảnh đại diện và trình đơn tài khoản như các trang khác.
  L360.Auth.current()
    .then((t) => {
      if (!t) return;
      u.$("#ptAcc").innerHTML = L360.shell.userMenu(t);
      L360.shell.bindUserMenu(t);
    })
    .catch(() => {});
  u.$("#rc").addEventListener("keydown", (e) => e.key === "Enter" && go());
})();
