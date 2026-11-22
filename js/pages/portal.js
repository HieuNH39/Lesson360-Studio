/* Trang chủ Lesson 360° Studio. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const app = u.$("#app");
  const packs = L360.Library.samples();
  const comp = [
    ["ENGINE", "Lesson Architect", "Trợ lý AI đọc giáo án KHBD, dựng gói bài học tương tác, phiếu học tập và kịch bản. Giáo viên kiểm tra, duyệt rồi xuất bản.", "studio.html?tab=ai", "Tạo bài bằng AI", "Skill + AI agent"],
    ["LIVE", "Lớp học 360", "Giáo viên điều khiển từng bước; học sinh làm trên điện thoại/laptop; màn chiếu hiện kết quả cả lớp ngay lập tức. Dùng cho mọi môn.", "giaovien.html", "Mở tiết học", "Vibe coding"],
    ["INSIGHT", "Dữ liệu 360", "Mỗi tiết dạy tự sinh minh chứng: tỉ lệ tham gia, mức hiểu bài, nội dung học sinh còn sai – cho giáo viên, tổ trưởng, Ban Giám hiệu.", "insight.html", "Xem dữ liệu", "Vibe coding"],
    ["EXPLORE", "Di sản 360", "Nhiệm vụ khám phá 31 di tích xứ Kinh Bắc qua ứng dụng Heritage Lens – Kinh Bắc Ký Sự, gắn vào tiết học.", L360.cfg.heritageLensUrl, "Mở Heritage Lens ↗", "Vibe coding"]
  ];
  app.innerHTML =
    L360.shell.topbar(`${L360.shell.modeBadge()}<a class="btn sm" href="studio.html">Soạn bài</a><a class="btn sm" href="giaovien.html">Dạy</a><a class="btn sm" href="insight.html">Dữ liệu</a>`) +
    `<main class="wrap">
    <section class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:24px;align-items:center;margin:10px 0 26px">
      <div><span class="pill accent">AI Educamp 2027 · Trường học số</span>
        <h1 style="font-size:2.6rem;margin-top:12px;letter-spacing:-.02em">Lesson 360° Studio</h1>
        <p style="font-size:1.35rem;font-weight:650;margin:0 0 8px">Xưởng AI kiến tạo bài học số từ giáo án</p>
        <p class="muted" style="font-size:1.08rem">Một giáo án → một tiết học tương tác cho mọi môn, có cả nhiệm vụ khám phá di sản Kinh Bắc → một bảng dữ liệu cho cả trường. Giáo viên không cần biết lập trình.</p>
        <div class="row" style="margin-top:14px"><a class="btn primary lg" href="studio.html?tab=ai">✦ Tạo bài từ giáo án</a><a class="btn lg" href="giaovien.html?che-do=dien-tap">Dạy thử ngay (không cần mạng)</a></div></div>
      <div class="card glass"><h2 style="font-size:1.25rem">Học sinh vào lớp</h2><p class="small muted">Nhập mã phòng trên màn chiếu.</p>
        <div class="row nowrap"><input id="rc" type="text" placeholder="Mã phòng" style="text-transform:uppercase;font-weight:800;letter-spacing:.1em;font-size:1.2rem"><button class="btn primary" id="go">Vào</button></div></div>
    </section>
    <section class="grid g4">${comp
      .map(
        ([k, n, d, href, cta, kind]) => `<article class="card" style="display:flex;flex-direction:column;gap:8px"><div class="row"><span class="pill accent">${k}</span><span class="spacer"></span><span class="tiny muted">${kind}</span></div>
        <h3 style="margin:0">${n}</h3><p class="small muted" style="margin:0">${d}</p><a class="btn sm" style="margin-top:auto" href="${href}" ${href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${cta}</a></article>`
      )
      .join("")}</section>
    <section class="card" style="margin-top:24px"><h2>Cách hoạt động</h2>
      <div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;text-align:center">${[
        ["1", "Giáo án KHBD", "Giáo viên đưa giáo án (Word/PDF) cho trợ lý AI"],
        ["2", "Lesson Architect", "AI dựng gói bài học: câu hỏi, trò chơi, nhiệm vụ nhóm, phiếu in"],
        ["3", "Giáo viên duyệt", "Sửa trong Studio, kiểm tra tự động 0 lỗi"],
        ["4", "Lớp học 360", "Dạy trên lớp: học sinh tương tác, màn chiếu hiện minh chứng"],
        ["5", "Dữ liệu 360", "Số liệu tự lưu, BGH và tổ trưởng theo dõi"]
      ]
        .map(([n, t, d]) => `<div class="card flat" style="padding:14px"><div class="brand-mark" style="margin:0 auto 8px;width:30px;height:30px">${n}</div><b>${t}</b><p class="small muted" style="margin:6px 0 0">${d}</p></div>`)
        .join("")}</div></section>
    <section class="card" style="margin-top:24px"><h2>Bài mẫu – dạy thử ngay</h2><div class="grid g3">${packs
      .map((p) => {
        const sm = L360.Pack.summary(p);
        return `<div class="card flat"><b>${u.esc(p.title)}</b><p class="small muted">${u.esc([p.subject, p.grade && "lớp " + p.grade].filter(Boolean).join(" · "))}<br>${sm.steps} hoạt động · ${sm.minutes} phút</p>
          <a class="btn sm primary" href="giaovien.html?pack=${encodeURIComponent(p.id)}&che-do=dien-tap">Dạy thử</a> <a class="btn sm" href="studio.html?tab=print&id=${encodeURIComponent(p.id)}">In phiếu</a></div>`;
      })
      .join("")}</div></section>
    <section class="card" style="margin-top:24px"><h2>Minh bạch về AI</h2>
      <ul class="small"><li>Sản phẩm được xây dựng bằng phương pháp <b>vibe coding</b> với trợ lý AI Claude (Anthropic): giáo viên mô tả yêu cầu bằng tiếng Việt, AI viết mã nguồn; giáo viên kiểm thử và chỉnh sửa trên lớp thật.</li>
      <li>Trợ lý <b>Lesson Architect</b> chạy được trên Claude (cài dưới dạng Skill), ChatGPT hoặc Gemini; nội dung do AI tạo luôn được giáo viên kiểm tra trước khi dạy.</li>
      <li>Học sinh vào lớp bằng mã số, <b>không nhập họ tên, email, số điện thoại</b>; học sinh không trò chuyện với AI trong giờ học.</li>
      <li>Ảnh minh hoạ dùng giấy phép mở (Wikimedia Commons) và ghi nguồn dưới ảnh.</li></ul></section>
    </main>` +
    L360.shell.footer();
  const go = () => {
    const r = u.$("#rc").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (r) location.href = `hocsinh.html?phong=${r}`;
  };
  u.$("#go").onclick = go;
  u.$("#rc").addEventListener("keydown", (e) => e.key === "Enter" && go());
})();
